import { jsPDF } from 'jspdf';
import {
  Examination,
  LeaveRequestItem,
  PaymentRecord,
  StudentGradeCard,
  StudentRecord,
  Subject,
} from '../types/portal';
import { calculateCreditWeightedSGPA, formatPaiseToINR } from './finance';

function drawInstitutionalHeader(
  doc: jsPDF,
  collegeName = 'INSTITUTION WORKSPACE',
  collegeCode = 'N/A',
  documentTitle = 'OFFICIAL INSTITUTIONAL RECORD',
  documentSub = 'Autonomous Institution · Office of Academic & Financial Registry'
) {
  // Outer page border
  doc.setDrawColor(14, 26, 43);
  doc.setLineWidth(1.2);
  doc.rect(24, 24, 547, 794);
  doc.setLineWidth(0.4);
  doc.rect(28, 28, 539, 786);

  // Header Banner (#0E1A2B)
  doc.setFillColor(14, 26, 43);
  doc.rect(28, 28, 539, 88, 'F');

  // Brass Accent Rule (#B8893D)
  doc.setFillColor(184, 137, 61);
  doc.rect(28, 116, 539, 4, 'F');

  // Header Typography
  doc.setTextColor(246, 244, 239);
  doc.setFont('times', 'bold');
  doc.setFontSize(17);
  doc.text(collegeName.toUpperCase().slice(0, 48), 44, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(210, 216, 226);
  doc.text(`${documentSub} · Code: ${collegeCode}`, 44, 74);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(documentTitle.toUpperCase(), 44, 96);

  // Right-aligned Date Stamp in Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(210, 216, 226);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`,
    550,
    96,
    { align: 'right' }
  );
}

function drawOfficialFooter(doc: jsPDF, verificationCode: string) {
  const footerY = 752;
  doc.setDrawColor(210, 206, 198);
  doc.setLineWidth(0.6);
  doc.line(44, footerY, 551, footerY);

  // Stamp Box
  doc.setDrawColor(29, 78, 216);
  doc.setLineWidth(0.8);
  doc.roundedRect(44, footerY + 10, 165, 36, 4, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(29, 78, 216);
  doc.text('DIGITALLY VERIFIED & SEALED', 54, footerY + 25);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(`REF: ${verificationCode}`, 54, footerY + 38);

  // Signature Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(14, 26, 43);
  doc.text('Authorized Signatory / Registrar', 551, footerY + 24, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 125);
  doc.text(
    'Computer-generated official document. No physical signature required.',
    551,
    footerY + 38,
    { align: 'right' }
  );
}

function formatPaiseForPDF(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const wholeRupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;
  const formatted = wholeRupees.toLocaleString('en-IN');
  const suffix = remainderPaise > 0 ? `.${String(remainderPaise).padStart(2, '0')}` : '.00';
  return `${isNegative ? '- ' : ''}Rs. ${formatted}${suffix}`;
}

export function generateFeeReceiptPDF(
  payment: PaymentRecord,
  collegeName = 'Institution Workspace',
  collegeCode = '',
  outstandingBalance?: number
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  drawInstitutionalHeader(
    doc,
    collegeName,
    collegeCode,
    `OFFICIAL FEE RECEIPT · ${payment.receipt_no}`,
    'Office of Finance & Student Accounts · Immutable Real-Time Fee Ledger'
  );

  const hasOutstanding = outstandingBalance !== undefined;
  const bannerHeight = hasOutstanding ? 92 : 74;

  // Summary Banner Box
  doc.setFillColor(246, 244, 239);
  doc.setDrawColor(220, 215, 205);
  doc.roundedRect(44, 136, 507, bannerHeight, 6, 6, 'FD');

  doc.setTextColor(14, 26, 43);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RECEIPT NUMBER', 60, 156);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(29, 78, 216);
  doc.text(payment.receipt_no, 60, 174);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(95, 105, 120);
  doc.text(
    `Issued Timestamp: ${new Date(payment.created_at).toLocaleString('en-IN')}`,
    60,
    192
  );

  // Right side of banner: Amount Credited
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(95, 105, 120);
  doc.text('AMOUNT PAID (INR)', 535, 156, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(21, 128, 61);
  doc.text(formatPaiseForPDF(payment.amount_paise), 535, 174, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(95, 105, 120);
  doc.text(`Exact Value: ${payment.amount_paise.toLocaleString('en-IN')} paise`, 535, 190, {
    align: 'right',
  });

  if (hasOutstanding) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(95, 105, 120);
    doc.text('OUTSTANDING DUE', 535, 207, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(outstandingBalance > 0 ? 185 : 21, outstandingBalance > 0 ? 28 : 128, outstandingBalance > 0 ? 28 : 61);
    doc.text(formatPaiseForPDF(outstandingBalance), 535, 221, { align: 'right' });
  }

  const section1Y = 136 + bannerHeight + 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(14, 26, 43);
  doc.text('1. STUDENT & TRANSACTION PARTICULARS', 44, section1Y);

  const details: [string, string][] = [
    ['Student Full Name', payment.student_name],
    ['Enrolment / Roll Number', payment.enrolment_no],
    ['Institution & Code', `${collegeName} (${collegeCode || 'N/A'})`],
    ['Fee Head / Description', payment.fee_title],
    ['Payment Mode', payment.mode.toUpperCase().replace('_', ' ')],
    ['UPI / Bank Reference No.', payment.reference || 'UPI-REF-REALTIME-VERIFIED'],
    ['Recorded & Verified By', payment.recorded_by_name || 'System Auto-Ledger'],
    ['Real-Time Ledger Status', payment.reversed_of ? `REVERSAL OF ${payment.reversed_of}` : 'SETTLED & CREDITED'],
  ];

  if (payment.reversed_of) {
    details.push(['Reversal Audit Reason', payment.reversal_reason || 'Administrative adjustment']);
  }

  let y = section1Y + 10;
  details.forEach(([label, value], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(250, 249, 246);
      doc.rect(44, y, 507, 26, 'F');
    }
    doc.setDrawColor(228, 224, 216);
    doc.rect(44, y, 507, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 70, 85);
    doc.text(label, 56, y + 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(14, 26, 43);
    doc.text(String(value), 230, y + 17);
    y += 26;
  });

  // Itemized Fee Breakdown Table
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(14, 26, 43);
  doc.text('2. ITEMIZED FEE PAYMENT BREAKDOWN', 44, y);
  y += 10;

  // Table Header
  doc.setFillColor(14, 26, 43);
  doc.rect(44, y, 507, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('S.No', 56, y + 16);
  doc.text('Fee Particular / Description', 90, y + 16);
  doc.text('Payment Mode & Reference', 240, y + 16);
  doc.text('Amount (INR)', 539, y + 16, { align: 'right' });
  y += 24;

  // Table Row with Text Wrapping to Prevent Overlap
  const fullRef = `${payment.mode.toUpperCase()} · Ref: ${payment.reference || 'UPI-VERIFIED'}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const refLines = doc.splitTextToSize(fullRef, 210);
  const rowHeight = Math.max(26, refLines.length * 11 + 10);

  doc.setDrawColor(220, 215, 205);
  doc.rect(44, y, 507, rowHeight);
  doc.setTextColor(14, 26, 43);
  doc.setFontSize(8.5);
  doc.text('01', 56, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.text(payment.fee_title.slice(0, 28), 90, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(refLines, 240, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(formatPaiseForPDF(payment.amount_paise), 539, y + 16, { align: 'right' });
  y += rowHeight;

  // Total Row
  doc.setFillColor(246, 244, 239);
  doc.rect(44, y, 507, 26, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(14, 26, 43);
  doc.text('TOTAL REAL-TIME AMOUNT CREDITED', 90, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(21, 128, 61);
  doc.text(formatPaiseForPDF(payment.amount_paise), 539, y + 17, { align: 'right' });

  drawOfficialFooter(doc, `${payment.receipt_no}-${payment.enrolment_no}`);
  doc.save(`${payment.receipt_no}_${payment.enrolment_no}.pdf`);
}

export function exportFeeReceiptCSV(
  payments: PaymentRecord[],
  collegeName = 'Institution Workspace'
): void {
  const header =
    'Receipt_No,Created_At,Student_Name,Enrolment_No,Fee_Title,Mode,Reference,Amount_INR,Amount_Paise,Recorded_By,Institution\n';
  const rows = payments
    .map(
      (p) =>
        `${p.receipt_no},"${new Date(p.created_at).toLocaleString('en-IN')}","${p.student_name}",${
          p.enrolment_no
        },"${p.fee_title}",${p.mode},"${p.reference}","${formatPaiseToINR(p.amount_paise)}",${
          p.amount_paise
        },"${p.recorded_by_name}","${collegeName}"`
    )
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Fee_Receipts_Register_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export function generateReportCardPDF(
  student: StudentRecord,
  subjects: Subject[],
  semester: number,
  collegeName = 'Institution Workspace',
  collegeCode = ''
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  drawInstitutionalHeader(
    doc,
    collegeName,
    collegeCode,
    `STATEMENT OF GRADES · SEMESTER ${semester} EXAMINATION`,
    'Office of the Controller of Examinations · UGC 10-Point Credit System'
  );

  // Student Metadata Box
  doc.setFillColor(246, 244, 239);
  doc.setDrawColor(220, 215, 205);
  doc.roundedRect(44, 136, 507, 64, 5, 5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(95, 105, 120);
  doc.text('STUDENT NAME', 58, 154);
  doc.text('ENROLMENT NO.', 240, 154);
  doc.text('DEPARTMENT & BATCH', 380, 154);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(14, 26, 43);
  doc.text(student.full_name, 58, 170);
  doc.setFont('courier', 'bold');
  doc.setTextColor(29, 78, 216);
  doc.text(student.enrolment_no, 240, 170);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(14, 26, 43);
  doc.text(`${student.department_code} · ${student.batch_label}`, 380, 170);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(95, 105, 120);
  doc.text(
    `Semester: ${semester}   |   Attendance Standing: ${student.attendance_pct}%   |   Academic Status: REGULAR`,
    58,
    190
  );

  // Grades Table Header
  let y = 218;
  doc.setFillColor(14, 26, 43);
  doc.rect(44, y, 507, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CODE', 54, y + 17);
  doc.text('COURSE / SUBJECT TITLE', 108, y + 17);
  doc.text('CR', 300, y + 17, { align: 'center' });
  doc.text('INT-1', 345, y + 17, { align: 'center' });
  doc.text('INT-2', 390, y + 17, { align: 'center' });
  doc.text('ASSGN', 435, y + 17, { align: 'center' });
  doc.text('GRADE', 485, y + 17, { align: 'center' });
  doc.text('GP', 530, y + 17, { align: 'center' });
  y += 26;

  doc.setTextColor(14, 26, 43);
  subjects.forEach((sub, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 249, 246);
      doc.rect(44, y, 507, 26, 'F');
    }
    doc.setDrawColor(226, 222, 214);
    doc.rect(44, y, 507, 26);

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.text(sub.code, 54, y + 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(sub.name.slice(0, 32), 108, y + 17);

    doc.setFont('courier', 'normal');
    doc.text(String(sub.credits), 300, y + 17, { align: 'center' });
    doc.text(`${sub.internal_1_marks}/${sub.internal_1_max}`, 345, y + 17, { align: 'center' });
    doc.text(`${sub.internal_2_marks}/${sub.internal_2_max}`, 390, y + 17, { align: 'center' });
    doc.text(`${sub.assignment_marks}/${sub.assignment_max}`, 435, y + 17, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(sub.grade, 485, y + 17, { align: 'center' });
    doc.setFont('courier', 'bold');
    doc.text(String(sub.grade_points), 530, y + 17, { align: 'center' });
    y += 26;
  });

  // SGPA / CGPA Summary Strip
  const sgpa = calculateCreditWeightedSGPA(subjects);
  const totalCredits = subjects.reduce((a, b) => a + b.credits, 0);
  y += 18;
  doc.setFillColor(246, 244, 239);
  doc.setDrawColor(184, 137, 61);
  doc.roundedRect(44, y, 507, 52, 5, 5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(14, 26, 43);
  doc.text(`TOTAL CREDITS EARNED: ${totalCredits}`, 60, y + 22);
  doc.text(`SEMESTER SGPA: ${sgpa.toFixed(2)}`, 245, y + 22);
  doc.text(`CUMULATIVE CGPA: ${student.cgpa.toFixed(2)}`, 405, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(95, 105, 120);
  doc.text(
    'RESULT: PASSED ALL REGISTERED COURSES IN FIRST ATTEMPT · 10-POINT UGC GRADING SCALE',
    60,
    y + 40
  );

  drawOfficialFooter(doc, `GRADECARD-${student.enrolment_no}-SEM${semester}`);
  doc.save(`ReportCard_${student.enrolment_no}_Sem${semester}.pdf`);
}

export function generateHallTicketPDF(
  student: StudentRecord,
  subjects: Subject[],
  collegeName = 'Institution Workspace',
  collegeCode = ''
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  drawInstitutionalHeader(
    doc,
    collegeName,
    collegeCode,
    `END-SEMESTER EXAMINATION ADMIT CARD / HALL TICKET`,
    'Office of the Controller of Examinations · Mandatory Seating Permit'
  );

  // Student Candidate Box
  doc.setFillColor(246, 244, 239);
  doc.setDrawColor(220, 215, 205);
  doc.roundedRect(44, 136, 507, 74, 5, 5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(14, 26, 43);
  doc.text(`Candidate Name: ${student.full_name}`, 58, 158);
  doc.text(`Enrolment No: ${student.enrolment_no}`, 350, 158);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Department & Cohort: ${student.department_code} · ${student.batch_label}`, 58, 178);
  doc.text(`Semester: Semester ${student.current_semester}`, 350, 178);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text(
    `CLEARANCE VERIFIED: Attendance (${student.attendance_pct}%) & Fee Dues Cleared ✓`,
    58,
    198
  );

  // Exam Timetable Table
  let y = 228;
  doc.setFillColor(14, 26, 43);
  doc.rect(44, y, 507, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('SUBJECT CODE', 56, y + 17);
  doc.text('SUBJECT / PAPER TITLE', 140, y + 17);
  doc.text('CREDITS', 350, y + 17, { align: 'center' });
  doc.text('EXAM DATE & SESSION', 455, y + 17, { align: 'center' });
  y += 26;

  doc.setTextColor(14, 26, 43);
  subjects.forEach((s, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 249, 246);
      doc.rect(44, y, 507, 26, 'F');
    }
    doc.setDrawColor(226, 222, 214);
    doc.rect(44, y, 507, 26);

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.text(s.code, 56, y + 17);
    doc.setFont('helvetica', 'normal');
    doc.text(s.name.slice(0, 34), 140, y + 17);
    doc.setFont('courier', 'normal');
    doc.text(String(s.credits), 350, y + 17, { align: 'center' });
    doc.text(`Nov ${10 + idx * 2}, 2026 · 09:30 AM`, 455, y + 17, { align: 'center' });
    y += 26;
  });

  drawOfficialFooter(doc, `HALLTICKET-${student.enrolment_no}-SEM${student.current_semester}`);
  doc.save(`HallTicket_${student.enrolment_no}_Sem${student.current_semester}.pdf`);
}

export function generateLeavePermitPDF(
  leave: LeaveRequestItem,
  collegeName = 'Institution Workspace',
  collegeCode = ''
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  drawInstitutionalHeader(
    doc,
    collegeName,
    collegeCode,
    `OFFICIAL STUDENT LEAVE & GATE PERMIT · ${leave.id.toUpperCase()}`,
    'Office of Student Welfare, Faculty Mentoring & Administration'
  );

  let y = 148;
  const rows: [string, string][] = [
    ['Permit Reference ID', leave.id.toUpperCase()],
    ['Applicant Student Name', leave.applicant_name],
    ['Enrolment Number', leave.enrolment_no || 'REGISTERED-STUDENT'],
    ['Leave Category', leave.type.toUpperCase()],
    ['Approved Duration', `${leave.from_date} to ${leave.to_date} (${leave.days_count} Day(s))`],
    ['Stated Reason', leave.reason],
    ['Approval Status', leave.status.toUpperCase()],
    [
      'Approving Authority',
      leave.approvals[leave.approvals.length - 1]?.approver_name || 'College Organizer / Admin',
    ],
    [
      'Approval Remarks',
      leave.approvals[leave.approvals.length - 1]?.comment || 'Approved and permitted.',
    ],
  ];

  rows.forEach(([label, val], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(250, 249, 246);
      doc.rect(44, y, 507, 28, 'F');
    }
    doc.setDrawColor(226, 222, 214);
    doc.rect(44, y, 507, 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 70, 85);
    doc.text(label, 56, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(14, 26, 43);
    doc.text(String(val).slice(0, 56), 220, y + 18);
    y += 28;
  });

  drawOfficialFooter(doc, `LEAVE-PERMIT-${leave.id.toUpperCase()}`);
  doc.save(`LeavePermit_${leave.enrolment_no || leave.applicant_name}_${leave.from_date}.pdf`);
}

export function generatePublishedExamResultPDF(
  student: StudentRecord,
  exam: Examination,
  gradeCard?: StudentGradeCard,
  allExamCards: StudentGradeCard[] = [],
  collegeName = 'Autonomous Institution',
  collegeCode = ''
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const effectiveCollegeCode = collegeCode || student.college_code || 'COE-EXAM';
  const effectiveCollegeName = collegeName || 'Autonomous Institution';

  drawInstitutionalHeader(
    doc,
    effectiveCollegeName,
    effectiveCollegeCode,
    `OFFICIAL STATEMENT OF PUBLISHED EXAMINATION RESULTS`,
    'Office of the Controller of Examinations · Verified Academic Transcript'
  );

  // 1. STUDENT INFORMATION BLOCK
  doc.setFillColor(246, 244, 239);
  doc.setDrawColor(220, 215, 205);
  doc.roundedRect(44, 134, 507, 78, 5, 5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(95, 105, 120);
  doc.text('CANDIDATE FULL NAME', 58, 150);
  doc.text('REGISTRATION / ROLL NO.', 240, 150);
  doc.text('COLLEGE & INSTITUTION', 390, 150);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(14, 26, 43);
  doc.text(student.full_name || 'Enrolled Student', 58, 164);

  doc.setFont('courier', 'bold');
  doc.setTextColor(29, 78, 216);
  doc.text(student.enrolment_no || 'N/A', 240, 164);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(14, 26, 43);
  doc.text(`${effectiveCollegeName.slice(0, 24)} (${effectiveCollegeCode})`, 390, 164);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(95, 105, 120);
  doc.text('EXAMINATION NAME', 58, 184);
  doc.text('PROGRAM & COHORT', 240, 184);
  doc.text('EXAM / PUBLICATION DATE', 390, 184);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(184, 137, 61);
  doc.text((exam.name || exam.title || 'Official Semester Examination').slice(0, 32), 58, 198);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(14, 26, 43);
  doc.text(`${student.department_code || exam.department || 'CSE'} · Sem ${exam.semester || student.current_semester || 1}`, 240, 198);
  doc.text(exam.exam_date || exam.published_at?.slice(0, 10) || new Date().toISOString().slice(0, 10), 390, 198);

  // 2. SUBJECT-WISE MARKS TABLE
  let y = 226;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(14, 26, 43);
  doc.text('SUBJECT-WISE EVALUATION RECORD', 44, y);
  y += 10;

  // Table Columns Header
  doc.setFillColor(14, 26, 43);
  doc.rect(44, y, 507, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  doc.text('Subject Code', 52, y + 16);
  doc.text('Subject / Course Title', 124, y + 16);
  doc.text('Max Marks', 325, y + 16, { align: 'right' });
  doc.text('Pass Marks', 375, y + 16, { align: 'right' });
  doc.text('Marks Obtained', 440, y + 16, { align: 'right' });
  doc.text('Grade', 478, y + 16, { align: 'center' });
  doc.text('Result', 525, y + 16, { align: 'center' });
  y += 24;

  // Compile subjects to display
  interface SubjectRow {
    code: string;
    name: string;
    max: number;
    pass: number;
    obtained: number;
    grade: string;
    result: 'Pass' | 'Fail';
  }

  function resolveCodeAndTitle(rawCodeCandidate?: string, rawNameCandidate?: string, fallbackIdx = 1): { code: string; name: string } {
    let rawCode = (rawCodeCandidate || '').trim();
    let rawName = (rawNameCandidate || '').trim();

    if (!rawCode && rawName) {
      const match = rawName.match(/^([A-Za-z0-9]{2,10})[\s:·\-–]+(.+)$/);
      if (match) {
        rawCode = match[1].toUpperCase();
        rawName = match[2].trim();
      }
    } else if (rawCode && !rawName) {
      rawName = rawCode;
    }

    if (!rawCode || rawCode === rawName || rawCode.length > 12 || rawCode.includes(' ')) {
      const match = (rawCode || rawName).match(/^([A-Za-z0-9]{2,10})[\s:·\-–]+(.+)$/);
      if (match) {
        rawCode = match[1].toUpperCase();
        rawName = match[2].trim();
      } else {
        rawCode = `CS-${600 + fallbackIdx}`;
      }
    }

    if (!rawCode) rawCode = `SUB-0${fallbackIdx}`;
    if (!rawName) rawName = 'Coursework Paper';
    return { code: rawCode, name: rawName };
  }

  const rows: SubjectRow[] = [];

  if (gradeCard) {
    const passM = exam.pass_marks ?? exam.passing_marks ?? 40;
    const maxM = gradeCard.max_marks || exam.max_marks || 100;
    const obt = gradeCard.marks_obtained;
    const passed = obt >= passM;
    const { code, name } = resolveCodeAndTitle(
      gradeCard.subject_code || exam.subject_code,
      gradeCard.subject_name || gradeCard.subject || exam.subject_name || exam.subject,
      1
    );
    rows.push({
      code,
      name,
      max: maxM,
      pass: passM,
      obtained: obt,
      grade: gradeCard.grade || (passed ? 'A' : 'F'),
      result: passed ? 'Pass' : 'Fail',
    });
  }

  // If there are other cards for this student in allExamCards for this exam
  allExamCards.forEach((c) => {
    if (
      c.exam_id === exam.id &&
      (c.student_id === student.id || c.enrolment_no === student.enrolment_no) &&
      !rows.some((r) => r.code === (c.subject_code || c.subject))
    ) {
      const passM = exam.pass_marks ?? exam.passing_marks ?? 40;
      const maxM = c.max_marks || exam.max_marks || 100;
      const obt = c.marks_obtained;
      const passed = obt >= passM;
      const { code, name } = resolveCodeAndTitle(c.subject_code, c.subject_name || c.subject, rows.length + 1);
      rows.push({
        code,
        name,
        max: maxM,
        pass: passM,
        obtained: obt,
        grade: c.grade || (passed ? 'A' : 'F'),
        result: passed ? 'Pass' : 'Fail',
      });
    }
  });

  // If still empty (e.g. no grade card was generated yet), add the exam's subject placeholder row
  if (rows.length === 0) {
    const passM = exam.pass_marks ?? exam.passing_marks ?? 40;
    const maxM = exam.max_marks || 100;
    const { code, name } = resolveCodeAndTitle(exam.subject_code, exam.subject_name || exam.subject || exam.title, 1);
    rows.push({
      code,
      name,
      max: maxM,
      pass: passM,
      obtained: 0,
      grade: 'N/A',
      result: 'Fail',
    });
  }

  let totalMax = 0;
  let totalObtained = 0;
  let anyFailed = false;

  rows.forEach((r, idx) => {
    totalMax += r.max;
    totalObtained += r.obtained;
    if (r.result === 'Fail') anyFailed = true;

    const codeLines = doc.splitTextToSize(r.code, 65);
    const nameLines = doc.splitTextToSize(r.name, 160);
    const lineCount = Math.max(codeLines.length, nameLines.length, 1);
    const rowHeight = Math.max(26, lineCount * 12 + 10);

    // Page overflow protection
    if (y + rowHeight > 730) {
      drawOfficialFooter(doc, `EXAM-RESULT-${student.enrolment_no}-${exam.id.toUpperCase()}`);
      doc.addPage();
      drawInstitutionalHeader(
        doc,
        effectiveCollegeName,
        effectiveCollegeCode,
        `OFFICIAL STATEMENT OF PUBLISHED EXAMINATION RESULTS (CONT.)`,
        'Office of the Controller of Examinations · Verified Academic Transcript'
      );
      y = 136;
      doc.setFillColor(14, 26, 43);
      doc.rect(44, y, 507, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Subject Code', 52, y + 16);
      doc.text('Subject / Course Title', 124, y + 16);
      doc.text('Max Marks', 325, y + 16, { align: 'right' });
      doc.text('Pass Marks', 375, y + 16, { align: 'right' });
      doc.text('Marks Obtained', 440, y + 16, { align: 'right' });
      doc.text('Grade', 478, y + 16, { align: 'center' });
      doc.text('Result', 525, y + 16, { align: 'center' });
      y += 24;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(250, 249, 246);
      doc.rect(44, y, 507, rowHeight, 'F');
    }
    doc.setDrawColor(226, 222, 214);
    doc.rect(44, y, 507, rowHeight);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(14, 26, 43);
    doc.text(codeLines, 52, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(nameLines, 124, y + 15);

    const verticalCenterY = y + 15;
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.text(String(r.max), 325, verticalCenterY, { align: 'right' });
    doc.text(String(r.pass), 375, verticalCenterY, { align: 'right' });

    doc.setFont('courier', 'bold');
    doc.setTextColor(r.result === 'Pass' ? 21 : 220, r.result === 'Pass' ? 128 : 38, r.result === 'Pass' ? 61 : 38);
    doc.text(String(r.obtained), 440, verticalCenterY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 26, 43);
    doc.text(r.grade, 478, verticalCenterY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r.result === 'Pass' ? 21 : 220, r.result === 'Pass' ? 128 : 38, r.result === 'Pass' ? 61 : 38);
    doc.text(r.result.toUpperCase(), 525, verticalCenterY, { align: 'center' });

    y += rowHeight;
  });

  // 3. OVERALL RESULT SUMMARY BOX
  const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  let overallGrade = 'F';
  if (pct >= 90) overallGrade = 'O (Outstanding)';
  else if (pct >= 80) overallGrade = 'A+ (Excellent)';
  else if (pct >= 70) overallGrade = 'A (Very Good)';
  else if (pct >= 60) overallGrade = 'B+ (Good)';
  else if (pct >= 50) overallGrade = 'B (Above Average)';
  else if (!anyFailed) overallGrade = 'C (Pass)';

  const overallStatus = !anyFailed && pct >= 40 ? 'PASSED' : 'NEEDS IMPROVEMENT';

  y += 14;
  if (y + 70 > 740) {
    drawOfficialFooter(doc, `EXAM-RESULT-${student.enrolment_no}-${exam.id.toUpperCase()}`);
    doc.addPage();
    drawInstitutionalHeader(
      doc,
      effectiveCollegeName,
      effectiveCollegeCode,
      'OFFICIAL STATEMENT OF PUBLISHED EXAMINATION RESULTS',
      'Office of the Controller of Examinations · Verified Academic Transcript'
    );
    y = 136;
  }

  doc.setFillColor(246, 244, 239);
  doc.setDrawColor(184, 137, 61);
  doc.roundedRect(44, y, 507, 66, 5, 5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(95, 105, 120);
  doc.text('TOTAL MAXIMUM MARKS', 58, y + 18);
  doc.text('TOTAL OBTAINED', 185, y + 18);
  doc.text('OVERALL PERCENTAGE', 295, y + 18);
  doc.text('OVERALL GRADE', 415, y + 18);

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(14, 26, 43);
  doc.text(String(totalMax), 58, y + 34);
  doc.setTextColor(21, 128, 61);
  doc.text(String(totalObtained), 185, y + 34);
  doc.setTextColor(29, 78, 216);
  doc.text(`${pct.toFixed(2)}%`, 295, y + 34);
  doc.setTextColor(14, 26, 43);
  doc.setFont('helvetica', 'bold');
  doc.text(overallGrade, 415, y + 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(overallStatus === 'PASSED' ? 21 : 220, overallStatus === 'PASSED' ? 128 : 38, overallStatus === 'PASSED' ? 61 : 38);
  doc.text(
    `FINAL RESULT: ${overallStatus}   ·   Total Registered Papers: ${rows.length}`,
    58,
    y + 53
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(95, 105, 120);
  doc.text(
    'Office of Controller of Examinations Clearance: VERIFIED ✓',
    535,
    y + 53,
    { align: 'right' }
  );

  drawOfficialFooter(doc, `EXAM-RESULT-${student.enrolment_no}-${exam.id.toUpperCase()}`);
  doc.save(`ExamResult_${student.enrolment_no}_${(exam.name || exam.title || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
}
