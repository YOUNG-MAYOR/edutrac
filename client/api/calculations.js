// ============================================================
//  EduTrack NG v2 — api/calculations.js
//  All academic calculation logic: grades, averages,
//  positions, cumulative results, sibling discounts
// ============================================================

// ── Per-Subject Score Calculator ───────────────────────────────
// Takes all result rows for one subject (CA1, CA2, Exam, etc.)
// Returns weighted total out of 100
function calcSubjectTotal(resultRows) {
  if (!resultRows?.length) return null;
  const totalWeight = resultRows.reduce((s, r) => s + (r.exams?.weight || 1), 0);
  const weightedSum = resultRows.reduce((s, r) => {
    const pct = r.score / (r.exams?.max_score || 100);
    return s + pct * 100 * (r.exams?.weight || 1);
  }, 0);
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
}

// ── Student Term Summary ───────────────────────────────────────
// Groups results by subject and computes per-subject totals
// Returns { subjects: [{name, code, total, grade, remark}], overall, passed, failed }
function buildTermSummary(resultRows, gradingScale) {
  const subjectMap = {};
  (resultRows || []).forEach(r => {
    const id = r.subject_id || r.subjects?.id;
    const name = r.subjects?.name || 'Unknown';
    const code = r.subjects?.code || '';
    if (!subjectMap[id]) subjectMap[id] = { id, name, code, rows: [] };
    subjectMap[id].rows.push(r);
  });

  const subjects = Object.values(subjectMap).map(s => {
    const total = calcSubjectTotal(s.rows);
    const { grade, remark } = total !== null ? gradeFromScale(total, gradingScale) : { grade: '—', remark: '—' };
    return { id: s.id, name: s.name, code: s.code, total, grade, remark };
  }).filter(s => s.total !== null);

  subjects.sort((a, b) => b.total - a.total);

  const totals = subjects.map(s => s.total).filter(t => t !== null);
  const overall = totals.length ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10 : null;
  const passed = subjects.filter(s => s.total !== null && s.total >= 40).length;
  const failed = subjects.filter(s => s.total !== null && s.total < 40).length;

  return { subjects, overall, passed, failed, subjectCount: subjects.length };
}

// ── Cumulative / Annual Average ────────────────────────────────
// Standard in Nigerian private schools: avg of all 3 terms
// Pass termSummaries as array of up to 3 buildTermSummary() results
// Returns { annualAvg, termAverages: [t1,t2,t3], subjectCumulative: {subjectId: {name, avg}} }
function buildCumulativeSummary(termSummaries) {
  if (!termSummaries?.length) return null;

  const termAverages = termSummaries.map(t => t?.overall ?? null);
  const validAvgs = termAverages.filter(a => a !== null);
  const annualAvg = validAvgs.length
    ? Math.round((validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length) * 10) / 10
    : null;

  // Per-subject cumulative
  const subjectAccum = {};
  termSummaries.forEach(t => {
    if (!t) return;
    t.subjects.forEach(s => {
      if (!subjectAccum[s.id]) subjectAccum[s.id] = { name: s.name, code: s.code, totals: [] };
      if (s.total !== null) subjectAccum[s.id].totals.push(s.total);
    });
  });
  const subjectCumulative = {};
  Object.entries(subjectAccum).forEach(([id, s]) => {
    const avg = s.totals.length
      ? Math.round((s.totals.reduce((a, b) => a + b, 0) / s.totals.length) * 10) / 10
      : null;
    subjectCumulative[id] = { ...s, avg, termCount: s.totals.length };
  });

  return { annualAvg, termAverages, subjectCumulative, termCount: termSummaries.length };
}

// ── Class Position Calculator ──────────────────────────────────
// Takes array of { studentId, overall } and returns ranked positions
// Handles ties correctly (two students with same avg get same position)
function assignPositions(studentAverages) {
  const sorted = [...studentAverages].filter(s => s.overall !== null).sort((a, b) => b.overall - a.overall);
  const positions = {};
  let pos = 1;
  sorted.forEach((s, i) => {
    if (i > 0 && sorted[i - 1].overall !== s.overall) pos = i + 1;
    positions[s.studentId] = { position: pos, outOf: sorted.length, suffix: getOrdinalSuffix(pos) };
  });
  return positions;
}

function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Attendance Percentage ──────────────────────────────────────
function calcAttendancePct(records) {
  if (!records?.length) return null;
  const present = records.filter(r => r.status === 'P' || r.status === 'L').length;
  return Math.round((present / records.length) * 100);
}

// ── Sibling Discount Logic ─────────────────────────────────────
// Pass siblingCount (total active students in same family)
// and the school's discount config object
// Returns { discountPct, discountAmt, finalAmount }
function calcSiblingDiscount(feeAmount, siblingCount, discountConfig = null) {
  // Default Nigerian school discount tiers (customisable)
  const tiers = discountConfig?.tiers || [
    { minSiblings: 2, discountPct: 10 },  // 2nd child: 10% off
    { minSiblings: 3, discountPct: 15 },  // 3rd child: 15% off
    { minSiblings: 4, discountPct: 20 },  // 4th+ child: 20% off
  ];

  const applicable = tiers.filter(t => siblingCount >= t.minSiblings);
  const discountPct = applicable.length ? Math.max(...applicable.map(t => t.discountPct)) : 0;
  const discountAmt = Math.round(feeAmount * (discountPct / 100));
  const finalAmount = feeAmount - discountAmt;
  return { discountPct, discountAmt, finalAmount, siblingCount };
}

// ── Invoice Generator ──────────────────────────────────────────
// Builds line-item invoice with sibling discount applied
function generateInvoice({ student, feeTypes, payments, familyStudents, discountConfig }) {
  const sibCount = familyStudents?.filter(s => s.is_active).length || 1;
  const lines = feeTypes.map(ft => {
    const paid = payments.filter(p => p.fee_type_id === ft.id).reduce((s, p) => s + Number(p.amount_paid), 0);
    const { discountPct, discountAmt, finalAmount } = calcSiblingDiscount(Number(ft.amount), sibCount, discountConfig);
    return {
      id: ft.id, name: ft.name,
      gross: Number(ft.amount),
      discountPct, discountAmt,
      net: finalAmount,
      paid, balance: Math.max(0, finalAmount - paid)
    };
  });
  const totalGross = lines.reduce((s, l) => s + l.gross, 0);
  const totalDiscount = lines.reduce((s, l) => s + l.discountAmt, 0);
  const totalNet = lines.reduce((s, l) => s + l.net, 0);
  const totalPaid = lines.reduce((s, l) => s + l.paid, 0);
  const totalBalance = lines.reduce((s, l) => s + l.balance, 0);
  return { lines, totalGross, totalDiscount, totalNet, totalPaid, totalBalance, sibCount, hasSiblingDiscount: totalDiscount > 0 };
}

// ── Broadsheet Builder ─────────────────────────────────────────
// Prepares data for the broadsheet export (ministry-compliant)
// Returns rows suitable for SheetJS export
function buildBroadsheetRows(students, allResults, gradingScale, exams) {
  const examNames = exams.map(e => e.name);
  const subjectNames = [...new Set(allResults.map(r => r.subjects?.name).filter(Boolean))].sort();

  const header = ['S/N', 'Admission No', 'Student Name', 'Gender', ...subjectNames.flatMap(s => [...examNames, 'Total', 'Grade']), 'Overall Avg', 'Position'];

  const rows = students.map((student, idx) => {
    const studentResults = allResults.filter(r => r.student_id === student.id);
    const summary = buildTermSummary(studentResults, gradingScale);
    const row = [idx + 1, student.admission_no || '', student.full_name, student.gender === 'M' ? 'Male' : student.gender === 'F' ? 'Female' : ''];

    subjectNames.forEach(subName => {
      const subSummary = summary.subjects.find(s => s.name === subName);
      exams.forEach(exam => {
        const r = studentResults.find(r => r.subjects?.name === subName && r.exams?.name === exam.name);
        row.push(r ? r.score : '');
      });
      row.push(subSummary?.total ?? '');
      row.push(subSummary?.grade ?? '');
    });

    row.push(summary.overall ?? '');
    row.push(''); // position filled after sorting
    return { row, studentId: student.id, overall: summary.overall };
  });

  // Assign positions
  const positions = assignPositions(rows.map(r => ({ studentId: r.studentId, overall: r.overall })));
  rows.forEach(r => {
    const pos = positions[r.studentId];
    r.row[r.row.length - 1] = pos ? pos.suffix : '—';
  });

  return { header, rows: rows.map(r => r.row) };
}

// ── Scratch Card PIN Generator ─────────────────────────────────
// Generates cryptographically secure 10-digit PINs for result checker access
// Uses crypto.getRandomValues() instead of Math.random() to prevent prediction
function generateScratchPins(count = 10) {
  const pins = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    // Map each byte (0-255) to a digit (0-9) — uniform distribution
    pins.push(Array.from(bytes, b => b % 10).join(''));
  }
  return pins;
}

// PIN format: XXXX-XXXX-XX (readable)
function formatPin(pin) {
  return pin.replace(/(\d{4})(\d{4})(\d{2})/, '$1-$2-$3');
}
