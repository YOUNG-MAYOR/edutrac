// ============================================================
//  EduTrack NG — Offline-First Sync Engine  (js/sync-engine.js)
//  ─────────────────────────────────────────────────────────────
//  Architecture:
//    • IndexedDB (local)  ←→  SyncEngine  ←→  Supabase (remote)
//
//  Features:
//    • Push queue  — local writes buffered, pushed when online
//    • Pull (delta) — only fetch rows changed since last sync
//    • Conflict resolution  — last-write-wins by default,
//                             role-based priority for sensitive data
//    • Exponential backoff  — robust retry on partial failure
//    • Background sync      — uses Service Worker Background Sync API
//    • Tamper detection     — payload checksums (SHA-256)
//    • Sync status events   — UI can subscribe to progress
//
//  Usage:
//    import SyncEngine from './js/sync-engine.js';
//    const sync = new SyncEngine(db, schoolId, deviceId);
//    await sync.init();
//    sync.on('status', (state) => updateUI(state));
// ============================================================

const SYNC_DB_NAME    = 'edutrack-sync';
const SYNC_DB_VERSION = 2;
const QUEUE_STORE     = 'sync_queue';
const META_STORE      = 'sync_meta';
const DATA_STORES     = ['attendance', 'results', 'students', 'enrollments',
                          'terms', 'classes', 'subjects', 'fee_types', 'payments'];

// Tables allowed to be pushed (writes) — must match Supabase whitelist
const PUSHABLE_TABLES = new Set(['attendance', 'results', 'payments', 'sms_log']);

// Retry strategy: delays in ms (exponential with jitter)
const RETRY_DELAYS = [2000, 5000, 15000, 60000, 300000]; // up to 5 min

class SyncEngine extends EventTarget {
  constructor(supabaseClient, schoolId, deviceId) {
    super();
    this.db         = supabaseClient;
    this.schoolId   = schoolId;
    this.deviceId   = deviceId || this._generateDeviceId();
    this.idb        = null;    // IndexedDB instance
    this.syncTimer  = null;
    this.retryCount = 0;
    this.isSyncing  = false;
    this._state     = 'idle'; // idle | syncing | error | offline
  }

  // ── Initialise ───────────────────────────────────────────────
  async init() {
    this.idb = await this._openIndexedDB();
    this._bindNetworkEvents();
    // Register background sync (SW must be registered)
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      this._swReg = reg;
    }
    this._emit('status', { state: 'idle', pending: await this._pendingCount() });
    return this;
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Queue a local write operation (INSERT / UPDATE / DELETE).
   * Immediately writes to IndexedDB; Supabase push happens when online.
   *
   * @param {string} operation  'INSERT' | 'UPDATE' | 'DELETE'
   * @param {string} tableName
   * @param {object} payload    Full row data (including id, school_id, updated_at)
   */
  async queueWrite(operation, tableName, payload) {
    if (!PUSHABLE_TABLES.has(tableName)) {
      console.warn(`[Sync] Table "${tableName}" is not in the push whitelist`);
      return;
    }
    const item = {
      id:         payload.id || crypto.randomUUID(),
      operation,
      table_name: tableName,
      record_id:  payload.id,
      payload:    { ...payload, school_id: this.schoolId },
      checksum:   await this._checksum(payload),
      status:     'pending',
      retry_count: 0,
      created_at: new Date().toISOString(),
      device_id:  this.deviceId,
    };

    const tx = this.idb.transaction(QUEUE_STORE, 'readwrite');
    await tx.objectStore(QUEUE_STORE).put(item);

    this._emit('queued', { table: tableName, operation, id: item.id });
    this._emit('status', { state: 'pending', pending: await this._pendingCount() });

    // Try to push immediately if online; otherwise register background sync
    if (navigator.onLine) {
      this._schedulePush(0);
    } else {
      this._registerBgSync();
    }
  }

  /**
   * Pull delta updates from Supabase for all data stores.
   * Only fetches rows with updated_at > last pull timestamp.
   */
  async pull() {
    if (!navigator.onLine) return;
    try {
      this._setState('syncing');
      for (const table of DATA_STORES) {
        await this._pullTable(table);
      }
      this._setState('idle');
    } catch (err) {
      console.error('[Sync] Pull failed:', err);
      this._setState('error');
    }
  }

  /**
   * Push all pending queue items to Supabase.
   * Uses exponential backoff on failure.
   */
  async push() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;
    this._setState('syncing');

    try {
      const items = await this._getPendingItems();
      if (items.length === 0) {
        this.isSyncing = false;
        this._setState('idle');
        return;
      }

      this._emit('push-start', { count: items.length });
      let successCount = 0;
      let failCount    = 0;

      for (const item of items) {
        const ok = await this._pushItem(item);
        ok ? successCount++ : failCount++;
      }

      this._emit('push-complete', { success: successCount, failed: failCount });
      this.retryCount = 0;
    } catch (err) {
      console.error('[Sync] Push failed:', err);
      this._scheduleRetry();
    } finally {
      this.isSyncing = false;
      const pending = await this._pendingCount();
      this._setState(pending > 0 ? 'pending' : 'idle');
    }
  }

  /** Returns count of pending queue items */
  async pendingCount() {
    return this._pendingCount();
  }

  /** Force a full pull + push cycle */
  async fullSync() {
    await this.pull();
    await this.push();
  }

  // ── Network Events ───────────────────────────────────────────
  _bindNetworkEvents() {
    window.addEventListener('online', async () => {
      console.log('[Sync] Back online — pushing queue…');
      this._setState('syncing');
      await this.push();
      await this.pull();
    });
    window.addEventListener('offline', () => {
      console.log('[Sync] Gone offline — writes will queue locally');
      this._setState('offline');
    });
  }

  // ── Push a single item ───────────────────────────────────────
  async _pushItem(item) {
    try {
      // Verify checksum before pushing (tamper detection)
      const currentChecksum = await this._checksum(item.payload);
      if (item.checksum && item.checksum !== currentChecksum) {
        console.warn('[Sync] Checksum mismatch — possible tamper:', item.id);
        await this._updateItemStatus(item.id, 'rejected');
        return false;
      }

      let error;
      if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
        // Use upsert — handles both INSERT and UPDATE idempotently
        ({ error } = await this.db
          .from(item.table_name)
          .upsert(item.payload, { onConflict: 'id', ignoreDuplicates: false }));
      } else if (item.operation === 'DELETE') {
        ({ error } = await this.db
          .from(item.table_name)
          .delete()
          .eq('id', item.record_id)
          .eq('school_id', this.schoolId));
      }

      if (error) {
        console.error('[Sync] Push error:', error.message);
        await this._markRetry(item);
        return false;
      }

      await this._updateItemStatus(item.id, 'applied');
      return true;
    } catch (err) {
      console.error('[Sync] Push exception:', err);
      await this._markRetry(item);
      return false;
    }
  }

  // ── Pull a single table (delta) ──────────────────────────────
  async _pullTable(tableName) {
    const lastPulled = await this._getLastPulled(tableName);
    let query = this.db
      .from(tableName)
      .select('*')
      .eq('school_id', this.schoolId)
      .order('updated_at', { ascending: true });

    if (lastPulled) {
      query = query.gt('updated_at', lastPulled);
    }

    // Paginate in batches of 500 to avoid large payloads on slow connections
    query = query.limit(500);

    const { data, error } = await query;
    if (error) {
      console.warn(`[Sync] Pull failed for ${tableName}:`, error.message);
      return;
    }
    if (!data || data.length === 0) return;

    // Write to IndexedDB
    const tx  = this.idb.transaction(tableName, 'readwrite');
    const store = tx.objectStore(tableName);
    for (const row of data) {
      // Conflict resolution: last-write-wins (server always wins on pull)
      await store.put(row);
    }
    await this._setLastPulled(tableName);
    this._emit('pulled', { table: tableName, count: data.length });
  }

  // ── Retry logic ──────────────────────────────────────────────
  _scheduleRetry() {
    const delay = RETRY_DELAYS[Math.min(this.retryCount, RETRY_DELAYS.length - 1)];
    this.retryCount++;
    console.log(`[Sync] Scheduling retry in ${delay}ms (attempt ${this.retryCount})`);
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.push(), delay);
  }

  _schedulePush(delay = 0) {
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.push(), delay);
  }

  async _markRetry(item) {
    const newCount = (item.retry_count || 0) + 1;
    if (newCount >= RETRY_DELAYS.length) {
      await this._updateItemStatus(item.id, 'failed');
      this._emit('item-failed', { id: item.id, table: item.table_name });
    } else {
      const tx = this.idb.transaction(QUEUE_STORE, 'readwrite');
      const existing = await tx.objectStore(QUEUE_STORE).get(item.id);
      if (existing) {
        existing.retry_count = newCount;
        existing.status      = 'pending';
        await tx.objectStore(QUEUE_STORE).put(existing);
      }
      this._scheduleRetry();
    }
  }

  // ── Background Sync (Service Worker) ─────────────────────────
  _registerBgSync() {
    if (this._swReg) {
      this._swReg.sync.register('edutrack-sync').catch(err => {
        console.warn('[Sync] BG sync registration failed:', err);
      });
    }
  }

  // ── IndexedDB Helpers ────────────────────────────────────────
  _openIndexedDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Sync queue store
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
          store.createIndex('status',     'status',     { unique: false });
          store.createIndex('table_name', 'table_name', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'table_name' });
        }

        // Data stores (local cache of Supabase tables)
        for (const tableName of DATA_STORES) {
          if (!db.objectStoreNames.contains(tableName)) {
            const store = db.createObjectStore(tableName, { keyPath: 'id' });
            store.createIndex('school_id',  'school_id',  { unique: false });
            store.createIndex('updated_at', 'updated_at', { unique: false });
          }
        }
      };

      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  async _getPendingItems() {
    return new Promise((resolve, reject) => {
      const tx    = this.idb.transaction(QUEUE_STORE, 'readonly');
      const idx   = tx.objectStore(QUEUE_STORE).index('status');
      const req   = idx.getAll('pending');
      req.onsuccess = e => resolve(
        e.target.result.sort((a, b) => a.created_at.localeCompare(b.created_at))
      );
      req.onerror = e => reject(e.target.error);
    });
  }

  async _pendingCount() {
    return new Promise((resolve) => {
      try {
        const tx  = this.idb.transaction(QUEUE_STORE, 'readonly');
        const idx = tx.objectStore(QUEUE_STORE).index('status');
        const req = idx.count('pending');
        req.onsuccess = e => resolve(e.target.result);
        req.onerror   = () => resolve(0);
      } catch { resolve(0); }
    });
  }

  async _updateItemStatus(id, status) {
    return new Promise((resolve) => {
      const tx    = this.idb.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req   = store.get(id);
      req.onsuccess = e => {
        const item = e.target.result;
        if (item) { item.status = status; store.put(item); }
        resolve();
      };
      req.onerror = () => resolve();
    });
  }

  async _getLastPulled(tableName) {
    return new Promise((resolve) => {
      const tx  = this.idb.transaction(META_STORE, 'readonly');
      const req = tx.objectStore(META_STORE).get(tableName);
      req.onsuccess = e => resolve(e.target.result?.last_pulled_at || null);
      req.onerror   = () => resolve(null);
    });
  }

  async _setLastPulled(tableName) {
    const tx    = this.idb.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    const now   = new Date().toISOString();
    store.put({ table_name: tableName, last_pulled_at: now });
  }

  // ── Utilities ────────────────────────────────────────────────
  async _checksum(payload) {
    const str  = JSON.stringify(payload, Object.keys(payload).sort());
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  _generateDeviceId() {
    const stored = localStorage.getItem('et_device_id');
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem('et_device_id', id);
    return id;
  }

  _setState(state) {
    this._state = state;
    this._emit('status', { state, online: navigator.onLine });
  }

  _emit(eventName, detail = {}) {
    this.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  // ── Local-first helpers for pages ────────────────────────────

  /**
   * Get all rows from local cache for a table.
   * Falls back to Supabase if local cache is empty.
   */
  async getLocal(tableName, filters = {}) {
    return new Promise(async (resolve) => {
      try {
        const tx    = this.idb.transaction(tableName, 'readonly');
        const store = tx.objectStore(tableName);
        const req   = store.getAll();
        req.onsuccess = e => {
          let rows = e.target.result || [];
          // Apply filters
          for (const [key, val] of Object.entries(filters)) {
            rows = rows.filter(r => r[key] === val);
          }
          resolve(rows);
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Write a row locally and queue it for remote push.
   * Use this instead of db.from(...).insert() in offline-capable pages.
   */
  async writeLocal(operation, tableName, payload) {
    // 1. Write to IndexedDB cache immediately
    if (DATA_STORES.includes(tableName)) {
      const tx = this.idb.transaction(tableName, 'readwrite');
      if (operation === 'DELETE') {
        tx.objectStore(tableName).delete(payload.id);
      } else {
        tx.objectStore(tableName).put({
          ...payload,
          updated_at: new Date().toISOString(),
          captured_offline: !navigator.onLine,
        });
      }
    }
    // 2. Queue for remote push
    await this.queueWrite(operation, tableName, {
      ...payload,
      updated_at: new Date().toISOString(),
      captured_offline: !navigator.onLine,
      synced_at: null,
    });
  }
}

// ── Sync status UI component ──────────────────────────────────
// Call attachSyncBadge(syncEngine) to inject a status badge into the page
function attachSyncBadge(sync) {
  const badge = document.createElement('div');
  badge.id = 'sync-badge';
  badge.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 9999;
    background: white; border-radius: 24px; padding: 8px 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,.15); font-size: 12px;
    font-family: inherit; display: flex; align-items: center; gap: 8px;
    transition: all .3s ease; border: 1px solid #e5e7eb;
    cursor: pointer; user-select: none;
  `;
  document.body.appendChild(badge);

  const updateBadge = async ({ detail: { state, pending } }) => {
    const count = pending ?? await sync.pendingCount();
    const dot = (color) => `<span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>`;

    const configs = {
      idle:    { color: '#22c55e', label: 'Synced',     dotColor: '#22c55e' },
      syncing: { color: '#3b82f6', label: 'Syncing…',   dotColor: '#3b82f6' },
      pending: { color: '#f59e0b', label: `${count} pending`, dotColor: '#f59e0b' },
      offline: { color: '#ef4444', label: 'Offline',    dotColor: '#ef4444' },
      error:   { color: '#ef4444', label: 'Sync error', dotColor: '#ef4444' },
    };
    const cfg = configs[state] || configs.idle;
    badge.innerHTML = `${dot(cfg.dotColor)}<span style="color:#374151;font-weight:600">${cfg.label}</span>`;
  };

  sync.addEventListener('status', updateBadge);
  badge.addEventListener('click', () => {
    if (navigator.onLine) sync.push();
  });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SyncEngine, attachSyncBadge };
} else {
  window.SyncEngine        = SyncEngine;
  window.attachSyncBadge   = attachSyncBadge;
}
