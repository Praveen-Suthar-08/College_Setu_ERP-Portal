import { FeeAssignment, Subject } from '../types/portal';

/**
 * INTEGER PAISE MONETARY & ACADEMIC ENGINE (Section 5.6 & Prompt 9)
 * Rule: All monetary calculations use integer paise (1 INR = 100 paise).
 * Floating-point arithmetic is never used on currency amounts.
 */

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatPaiseToINR(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new Error(`formatPaiseToINR requires integer paise, received: ${paise}`);
  }
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const wholeRupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  const formattedRupees = wholeRupees.toLocaleString('en-IN');
  const suffix = remainderPaise > 0 ? `.${String(remainderPaise).padStart(2, '0')}` : '';
  return `${isNegative ? '-' : ''}₹${formattedRupees}${suffix}`;
}

export function calculateLateDays(dueDateIso: string, referenceDateIso: string): number {
  const due = new Date(`${dueDateIso}T00:00:00Z`).getTime();
  const ref = new Date(`${referenceDateIso}T00:00:00Z`).getTime();
  if (ref <= due) return 0;
  const diffDays = Math.floor((ref - due) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function calculateLateFinePaise(
  dueDateIso: string,
  referenceDateIso: string,
  finePerDayPaise: number,
  isAlreadyPaid: boolean
): number {
  if (isAlreadyPaid || finePerDayPaise <= 0) return 0;
  const lateDays = calculateLateDays(dueDateIso, referenceDateIso);
  return Math.trunc(lateDays) * Math.trunc(finePerDayPaise);
}

export function calculateAssignmentBalancePaise(
  assignment: Pick<
    FeeAssignment,
    'id' | 'amount_paise' | 'concession_paise' | 'paid_paise' | 'due_date' | 'fine_per_day_paise' | 'status' | 'student_id' | 'title'
  >,
  referenceDateIso: string,
  payments?: { assignment_id?: string; student_id?: string; fee_title?: string; amount_paise: number; status?: string }[]
): {
  grossPaise: number;
  concessionPaise: number;
  netPrincipalPaise: number;
  lateFinePaise: number;
  totalPayablePaise: number;
  paidPaise: number;
  outstandingPaise: number;
  lateDays: number;
  status: 'paid' | 'partially_paid' | 'overdue' | 'pending';
} {
  const grossPaise = Math.trunc(assignment.amount_paise);
  const concessionPaise = Math.min(grossPaise, Math.max(0, Math.trunc(assignment.concession_paise)));
  const netPrincipalPaise = grossPaise - concessionPaise;

  let paidPaise = Math.trunc(assignment.paid_paise || 0);
  if (Array.isArray(payments) && payments.length > 0) {
    const sumPayments = payments
      .filter(
        (p) =>
          p &&
          p.status !== 'reversed' &&
          (p.assignment_id === assignment.id ||
            (p.student_id === assignment.student_id && p.fee_title === assignment.title))
      )
      .reduce((sum, p) => sum + Math.trunc(p.amount_paise || 0), 0);
    paidPaise = Math.max(paidPaise, sumPayments);
  }

  const isSettled = paidPaise >= netPrincipalPaise;

  let status: 'paid' | 'partially_paid' | 'overdue' | 'pending' =
    assignment.status === 'partial' ? 'partially_paid' : (assignment.status as any);
  if (isSettled) {
    status = 'paid';
  } else if (paidPaise > 0) {
    status = 'partially_paid';
  } else {
    const days = calculateLateDays(assignment.due_date, referenceDateIso);
    status = days > 0 ? 'overdue' : 'pending';
  }

  const lateDays = isSettled ? 0 : calculateLateDays(assignment.due_date, referenceDateIso);
  const lateFinePaise = isSettled
    ? 0
    : calculateLateFinePaise(
        assignment.due_date,
        referenceDateIso,
        assignment.fine_per_day_paise,
        false
      );

  const totalPayablePaise = netPrincipalPaise + lateFinePaise;
  const outstandingPaise = Math.max(0, totalPayablePaise - paidPaise);

  return {
    grossPaise,
    concessionPaise,
    netPrincipalPaise,
    lateFinePaise,
    totalPayablePaise,
    paidPaise,
    outstandingPaise,
    lateDays,
    status,
  };
}

export function summarizeStudentLedgerPaise(
  assignments: FeeAssignment[],
  referenceDateIso: string,
  payments?: { assignment_id?: string; student_id?: string; fee_title?: string; amount_paise: number; status?: string }[]
): {
  totalGrossPaise: number;
  totalConcessionPaise: number;
  totalFinePaise: number;
  totalPaidPaise: number;
  totalDuePaise: number;
  totalOverduePaise: number;
} {
  let totalGrossPaise = 0;
  let totalConcessionPaise = 0;
  let totalFinePaise = 0;
  let totalPaidPaise = 0;
  let totalDuePaise = 0;
  let totalOverduePaise = 0;

  for (const item of assignments) {
    const calc = calculateAssignmentBalancePaise(item, referenceDateIso, payments);
    totalGrossPaise += calc.grossPaise;
    totalConcessionPaise += calc.concessionPaise;
    totalFinePaise += calc.lateFinePaise;
    totalPaidPaise += calc.paidPaise;
    totalDuePaise += calc.outstandingPaise;
    if (calc.lateDays > 0 && calc.outstandingPaise > 0) {
      totalOverduePaise += calc.outstandingPaise;
    }
  }

  return {
    totalGrossPaise,
    totalConcessionPaise,
    totalFinePaise,
    totalPaidPaise,
    totalDuePaise,
    totalOverduePaise,
  };
}

/**
 * Attendance Buffer Calculator (Section 5.4 & Prompt 7)
 * Computes how many classes a student can still miss while staying >= minimumPct,
 * or how many consecutive classes they must attend to recover to minimumPct.
 */
export function calculateAttendanceAllowance(
  attended?: number | null,
  held?: number | null,
  minimumPct: number = 75
): {
  currentPct: number;
  canStillMiss: number;
  mustAttendToRecover: number;
  status: 'safe' | 'warning' | 'critical' | 'none';
  noClassesHeld: boolean;
} {
  const safeAttended =
    typeof attended === 'number' && !Number.isNaN(attended) ? Math.max(0, attended) : 0;
  const safeHeld =
    typeof held === 'number' && !Number.isNaN(held) ? Math.max(0, held) : 0;
  const safeMinPct =
    typeof minimumPct === 'number' && !Number.isNaN(minimumPct) && minimumPct > 0
      ? minimumPct
      : 75;

  if (safeHeld <= 0) {
    return {
      currentPct: 0,
      canStillMiss: 0,
      mustAttendToRecover: 0,
      status: 'none',
      noClassesHeld: true,
    };
  }

  const currentPct = Number(((safeAttended / safeHeld) * 100).toFixed(1));
  const threshold = safeMinPct / 100;

  // Solve: attended / (held + x) >= threshold  =>  x <= (attended / threshold) - held
  const canStillMiss = Math.max(0, Math.floor(safeAttended / threshold - safeHeld));

  // If below threshold, solve: (attended + y) / (held + y) >= threshold => y >= (threshold * held - attended) / (1 - threshold)
  const mustAttendToRecover =
    currentPct < safeMinPct
      ? Math.max(1, Math.ceil((threshold * safeHeld - safeAttended) / (1 - threshold)))
      : 0;

  const status: 'safe' | 'warning' | 'critical' =
    currentPct < safeMinPct ? 'critical' : currentPct < 80 ? 'warning' : 'safe';

  return { currentPct, canStillMiss, mustAttendToRecover, status, noClassesHeld: false };
}

/**
 * Credit-weighted SGPA calculator (Section 5.5)
 * SGPA = Sum(Credit_i * GradePoint_i) / Sum(Credit_i)
 */
export function calculateCreditWeightedSGPA(
  subjects: Pick<Subject, 'credits' | 'grade_points'>[]
): number {
  const totalCredits = subjects.reduce((acc, s) => acc + s.credits, 0);
  if (totalCredits === 0) return 0;
  const weightedPoints = subjects.reduce((acc, s) => acc + s.credits * s.grade_points, 0);
  return Number((weightedPoints / totalCredits).toFixed(2));
}

export interface UnitTestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export function runFinanceAndAcademicUnitTests(): UnitTestResult[] {
  const results: UnitTestResult[] = [];

  // Test 1: Integer paise conversion & formatting
  const p1 = formatPaiseToINR(6250000);
  results.push({
    name: 'Format 6,250,000 paise to Indian Rupees (₹62,500)',
    passed: p1 === '₹62,500',
    expected: '₹62,500',
    actual: p1,
  });

  // Test 2: Sub-rupee paise formatting without floating-point drift
  const p2 = formatPaiseToINR(145075);
  results.push({
    name: 'Format 145,075 paise with exact 75 paise suffix',
    passed: p2 === '₹1,450.75',
    expected: '₹1,450.75',
    actual: p2,
  });

  // Test 3: Concession + Late Fine calculation in integer paise
  const calc3 = calculateAssignmentBalancePaise(
    {
      id: 'fa-test-3',
      student_id: 'stu-test-3',
      title: 'Tuition Fee',
      amount_paise: 5000000, // ₹50,000
      concession_paise: 1000000, // ₹10,000 scholarship
      paid_paise: 1500000, // ₹15,000 paid
      due_date: '2026-10-10',
      fine_per_day_paise: 10000, // ₹100/day
      status: 'overdue',
    },
    '2026-10-20' // 10 days overdue => ₹1,000 (100,000 paise) fine
  );
  results.push({
    name: 'Principal (50Lp) - Concession (10Lp) + 10d Fine (1Lpaise) - Paid (15Lp) = 26,00,000 paise',
    passed: calc3.outstandingPaise === 2600000 && calc3.lateDays === 10,
    expected: '2600000 paise (10 late days)',
    actual: `${calc3.outstandingPaise} paise (${calc3.lateDays} late days)`,
  });

  // Test 4: Settled assignment incurs 0 late fine even after due date
  const calc4 = calculateAssignmentBalancePaise(
    {
      id: 'fa-test-4',
      student_id: 'stu-test-4',
      title: 'Exam Fee',
      amount_paise: 450000,
      concession_paise: 0,
      paid_paise: 450000,
      due_date: '2026-09-01',
      fine_per_day_paise: 5000,
      status: 'paid',
    },
    '2026-10-22'
  );
  results.push({
    name: 'Settled assignment accrues 0 paise fine past due date',
    passed: calc4.lateFinePaise === 0 && calc4.outstandingPaise === 0,
    expected: '0 paise',
    actual: `${calc4.lateFinePaise} paise`,
  });

  // Test 5: Attendance allowance calculator
  const att5 = calculateAttendanceAllowance(34, 40, 75);
  results.push({
    name: 'Attendance 34/40 (85%): can miss 5 classes while staying >= 75%',
    passed: att5.canStillMiss === 5 && att5.status === 'safe',
    expected: 'canStillMiss=5, status=safe',
    actual: `canStillMiss=${att5.canStillMiss}, status=${att5.status}`,
  });

  // Test 6: Attendance recovery calculator below 75%
  const att6 = calculateAttendanceAllowance(28, 40, 75);
  results.push({
    name: 'Attendance 28/40 (70%): must attend 8 consecutive classes to reach 75%',
    passed: att6.mustAttendToRecover === 8 && att6.status === 'critical',
    expected: 'mustAttendToRecover=8, status=critical',
    actual: `mustAttendToRecover=${att6.mustAttendToRecover}, status=${att6.status}`,
  });

  // Test 7: Payments array dynamically settles assignment status to 'paid'
  const calc7 = calculateAssignmentBalancePaise(
    {
      id: 'fa-test-101',
      student_id: 'stu-001',
      title: 'SEM 7TH FEES IN ADV',
      amount_paise: 120000,
      concession_paise: 0,
      paid_paise: 0,
      due_date: '2026-12-01',
      fine_per_day_paise: 1000,
      status: 'pending',
    },
    '2026-10-25',
    [
      {
        assignment_id: 'fa-test-101',
        student_id: 'stu-001',
        fee_title: 'SEM 7TH FEES IN ADV',
        amount_paise: 120000,
        status: 'completed',
      },
    ]
  );
  results.push({
    name: 'Payments array dynamically evaluates unpaid assignment to status=paid and outstanding=0',
    passed: calc7.status === 'paid' && calc7.outstandingPaise === 0 && calc7.paidPaise === 120000,
    expected: 'status=paid, outstanding=0',
    actual: `status=${calc7.status}, outstanding=${calc7.outstandingPaise}`,
  });

  return results;
}
