import {
  AuditLogEntry,
  FeeAssignment,
  NoticeItem,
  PaymentRecord,
  Profile,
  StudentRecord,
} from '../types/portal';
import { calculateAssignmentBalancePaise, formatPaiseToINR } from './finance';

export interface FeeNotificationLog {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  enrolment_no: string;
  assignment_id: string;
  fee_title: string;
  notification_type:
    | 'deadline_approaching'
    | 'deadline_today'
    | 'overdue_warning'
    | 'partial_payment_ack';
  trigger_source: 'auto_scheduler' | 'organizer_manual_trigger' | 'payment_event';
  channel: 'email_and_portal' | 'portal_only' | 'email_only';
  email_subject: string;
  email_body_html: string;
  amount_due_paise: number;
  amount_paid_paise: number;
  total_fee_paise: number;
  due_date: string;
  sent_at: string;
  status: 'delivered' | 'sent' | 'read';
  receipt_no?: string;
  college_code?: string;
}

export function generateFeeNotificationEmailHtml(params: {
  student_name: string;
  enrolment_no: string;
  fee_title: string;
  total_fee_paise: number;
  paid_paise: number;
  due_paise: number;
  due_date: string;
  notification_type: FeeNotificationLog['notification_type'];
  receipt_no?: string;
  college_name?: string;
}): string {
  const {
    student_name,
    enrolment_no,
    fee_title,
    total_fee_paise,
    paid_paise,
    due_paise,
    due_date,
    notification_type,
    receipt_no,
    college_name = 'Campus Academic Portal',
  } = params;

  let bannerBg = '#3b82f6';
  let bannerTitle = 'Fee Deadline Notification';
  let badgeLabel = 'Deadline Approaching';

  if (notification_type === 'partial_payment_ack') {
    bannerBg = '#4f46e5';
    bannerTitle = 'Payment Acknowledgment & Balance Due';
    badgeLabel = 'Partial Payment Recorded';
  } else if (notification_type === 'deadline_today') {
    bannerBg = '#f59e0b';
    bannerTitle = 'Fee Payment Due Today';
    badgeLabel = 'Action Required Today';
  } else if (notification_type === 'overdue_warning') {
    bannerBg = '#ef4444';
    bannerTitle = 'Overdue Fee Notice & Pending Fine';
    badgeLabel = 'Payment Overdue';
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: ${bannerBg}; padding: 24px 28px; color: #ffffff; text-align: left; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px; }
    .content { padding: 28px; }
    .greeting { font-size: 15px; margin-bottom: 16px; line-height: 1.5; }
    .summary-card { background: #f1f5f9; border-radius: 8px; padding: 18px; margin: 20px 0; border-left: 4px solid ${bannerBg}; }
    .table-details { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    .table-details td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .table-details td.label { font-weight: 600; color: #64748b; width: 45%; }
    .table-details td.value { font-weight: 700; color: #0f172a; text-align: right; }
    .table-details tr:last-child td { border-bottom: none; }
    .highlight-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin: 20px 0; font-size: 13px; color: #991b1b; }
    .footer { background: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
    .btn { display: inline-block; background: ${bannerBg}; color: #ffffff !important; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">${badgeLabel}</span>
      <h1>${bannerTitle}</h1>
      <p>${college_name}</p>
    </div>
    <div class="content">
      <div class="greeting">
        Dear <strong>${student_name}</strong> (Enrolment No: <code>${enrolment_no}</code>),
      </div>

      ${
        notification_type === 'partial_payment_ack'
          ? `<p style="font-size: 14px; line-height: 1.6;">
              Your fee payment of <strong>${formatPaiseToINR(paid_paise)}</strong> for <strong>${fee_title}</strong> has been successfully recorded under Receipt No: <code>${receipt_no || 'REC-PENDING'}</code>.
              <br/>Please note that there is an outstanding balance remaining on this fee item.
            </p>`
          : `<p style="font-size: 14px; line-height: 1.6;">
              This is an automated notification regarding your pending fee assignment <strong>${fee_title}</strong>. Please ensure timely settlement to avoid late fines or academic holds.
            </p>`
      }

      <div class="summary-card">
        <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 8px;">
          Fee Breakdown Summary
        </div>
        <table class="table-details">
          <tr>
            <td class="label">Fee Module / Title:</td>
            <td class="value">${fee_title}</td>
          </tr>
          <tr>
            <td class="label">Total Fee Amount:</td>
            <td class="value">${formatPaiseToINR(total_fee_paise)}</td>
          </tr>
          <tr>
            <td class="label">Total Amount Paid:</td>
            <td class="value" style="color: #16a34a;">${formatPaiseToINR(paid_paise)}</td>
          </tr>
          <tr>
            <td class="label">Remaining Balance Due:</td>
            <td class="value" style="color: #dc2626; font-size: 15px;">${formatPaiseToINR(due_paise)}</td>
          </tr>
          <tr>
            <td class="label">Fee Due Date:</td>
            <td class="value">${due_date}</td>
          </tr>
        </table>
      </div>

      ${
        due_paise > 0
          ? `<div style="text-align: center; margin: 24px 0;">
              <a href="#" class="btn">Pay Remaining Balance Online</a>
            </div>`
          : ''
      }

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 20px;">
        For queries or payment adjustments, please contact the College Accounts Office or submit a ticket via the Student Portal.
      </p>
    </div>
    <div class="footer">
      This is an automated system dispatch from ${college_name}. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function evaluateAndGenerateFeeNotifications(params: {
  feeAssignments: FeeAssignment[];
  students: StudentRecord[];
  profiles: Profile[];
  payments: PaymentRecord[];
  existingNotices: NoticeItem[];
  existingLogs: FeeNotificationLog[];
  triggerSource: 'auto_scheduler' | 'organizer_manual_trigger' | 'payment_event';
  specificAssignmentId?: string;
  referenceDateIso?: string;
}): {
  newNotices: NoticeItem[];
  newLogs: FeeNotificationLog[];
  auditEntries: AuditLogEntry[];
  summary: { processedCount: number; newNoticesCount: number; newEmailLogsCount: number };
} {
  const {
    feeAssignments,
    students,
    profiles,
    payments,
    existingNotices,
    existingLogs,
    triggerSource,
    specificAssignmentId,
    referenceDateIso = new Date().toISOString().slice(0, 10),
  } = params;

  const newNotices: NoticeItem[] = [];
  const newLogs: FeeNotificationLog[] = [];
  const auditEntries: AuditLogEntry[] = [];

  const targetAssignments = specificAssignmentId
    ? feeAssignments.filter((fa) => fa.id === specificAssignmentId)
    : feeAssignments;

  const nowIso = new Date().toISOString();
  const refTime = new Date(`${referenceDateIso}T00:00:00Z`).getTime();

  for (const assignment of targetAssignments) {
    const student = students.find((s) => s.id === assignment.student_id);
    const profile = profiles.find(
      (p) => p.id === assignment.student_id || (student && p.id === student.profile_id)
    );

    const studentName = student?.full_name || profile?.full_name || assignment.student_name;
    const studentEmail = profile?.email || student?.email || 'student@campus.edu';
    const enrolmentNo = student?.enrolment_no || assignment.enrolment_no;

    const calc = calculateAssignmentBalancePaise(assignment, referenceDateIso, payments);

    if (calc.outstandingPaise <= 0 && triggerSource !== 'payment_event') {
      continue; // Fully paid, no warning needed
    }

    const dueTime = new Date(`${assignment.due_date}T00:00:00Z`).getTime();
    const diffDays = Math.ceil((dueTime - refTime) / (1000 * 60 * 60 * 24));

    let notifType: FeeNotificationLog['notification_type'] | null = null;
    let subject = '';
    let noticeTitle = '';
    let noticeBody = '';

    // 1. Partial Payment Acknowledgment Trigger
    if (triggerSource === 'payment_event' || (calc.paidPaise > 0 && calc.outstandingPaise > 0)) {
      const recentPayment = payments.find(
        (p) =>
          p.assignment_id === assignment.id ||
          (p.student_id === assignment.student_id && p.fee_title === assignment.title)
      );

      // Check if we already logged this partial payment notification
      const alreadyLoggedPartial = existingLogs.some(
        (l) =>
          l.assignment_id === assignment.id &&
          l.notification_type === 'partial_payment_ack' &&
          l.amount_paid_paise === calc.paidPaise
      );

      if (!alreadyLoggedPartial && calc.paidPaise > 0) {
        notifType = 'partial_payment_ack';
        subject = `[Payment Acknowledged] Partial Fee Paid for ${assignment.title} — Outstanding Balance: ${formatPaiseToINR(calc.outstandingPaise)}`;
        noticeTitle = `[FEE ACKNOWLEDGMENT] Partial Payment Recorded for ${assignment.title}`;
        noticeBody = `Your partial payment of ${formatPaiseToINR(calc.paidPaise)} for ${assignment.title} has been recorded (Receipt: ${recentPayment?.receipt_no || 'REC-ACTIVE'}). Outstanding balance remaining: ${formatPaiseToINR(calc.outstandingPaise)} due on ${assignment.due_date}.`;
      }
    }

    // 2. Deadline Approaching / Overdue Trigger
    if (!notifType && calc.outstandingPaise > 0) {
      if (diffDays < 0) {
        // Overdue
        const alreadyLoggedOverdue = existingLogs.some(
          (l) =>
            l.assignment_id === assignment.id &&
            l.notification_type === 'overdue_warning' &&
            new Date(l.sent_at).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000 // Sent in last 3 days
        );

        if (!alreadyLoggedOverdue) {
          notifType = 'overdue_warning';
          subject = `[OVERDUE FEE NOTICE] ${assignment.title} is Past Due — Balance: ${formatPaiseToINR(calc.outstandingPaise)}`;
          noticeTitle = `[OVERDUE ALERT] Pending Fee ${assignment.title} is Overdue`;
          noticeBody = `Your fee assignment ${assignment.title} of ${formatPaiseToINR(calc.netPrincipalPaise)} was due on ${assignment.due_date}. Current outstanding balance: ${formatPaiseToINR(calc.outstandingPaise)} (Accruing fine: ${formatPaiseToINR(assignment.fine_per_day_paise)}/day). Please settle immediately.`;
        }
      } else if (diffDays === 0) {
        // Due Today
        const alreadyLoggedToday = existingLogs.some(
          (l) =>
            l.assignment_id === assignment.id &&
            l.notification_type === 'deadline_today' &&
            l.sent_at.slice(0, 10) === referenceDateIso
        );

        if (!alreadyLoggedToday) {
          notifType = 'deadline_today';
          subject = `[URGENT] Fee Deadline Today: ${assignment.title} — ${formatPaiseToINR(calc.outstandingPaise)}`;
          noticeTitle = `[URGENT] ${assignment.title} Deadline Today`;
          noticeBody = `Today is the deadline for ${assignment.title}. Total payable balance: ${formatPaiseToINR(calc.outstandingPaise)}. Please submit your payment today to avoid late fines.`;
        }
      } else if (diffDays <= 7) {
        // Approaching within 7 days
        const alreadyLoggedApproaching = existingLogs.some(
          (l) =>
            l.assignment_id === assignment.id &&
            l.notification_type === 'deadline_approaching' &&
            new Date(l.sent_at).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000
        );

        if (!alreadyLoggedApproaching) {
          notifType = 'deadline_approaching';
          subject = `[FEE REMINDER] ${assignment.title} Due in ${diffDays} Days (${assignment.due_date})`;
          noticeTitle = `[DEADLINE REMINDER] ${assignment.title} Due in ${diffDays} Days`;
          noticeBody = `Reminder: Fee assignment ${assignment.title} is due on ${assignment.due_date} (${diffDays} days remaining). Outstanding balance: ${formatPaiseToINR(calc.outstandingPaise)}.`;
        }
      }
    }

    if (notifType) {
      const logId = `fn-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const noticeId = `notif-fee-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const htmlEmail = generateFeeNotificationEmailHtml({
        student_name: studentName,
        enrolment_no: enrolmentNo,
        fee_title: assignment.title,
        total_fee_paise: assignment.amount_paise,
        paid_paise: calc.paidPaise,
        due_paise: calc.outstandingPaise,
        due_date: assignment.due_date,
        notification_type: notifType,
        receipt_no: payments.find((p) => p.assignment_id === assignment.id)?.receipt_no,
      });

      const logItem: FeeNotificationLog = {
        id: logId,
        student_id: assignment.student_id,
        student_name: studentName,
        student_email: studentEmail,
        enrolment_no: enrolmentNo,
        assignment_id: assignment.id,
        fee_title: assignment.title,
        notification_type: notifType,
        trigger_source: triggerSource,
        channel: 'email_and_portal',
        email_subject: subject,
        email_body_html: htmlEmail,
        amount_due_paise: calc.outstandingPaise,
        amount_paid_paise: calc.paidPaise,
        total_fee_paise: assignment.amount_paise,
        due_date: assignment.due_date,
        sent_at: nowIso,
        status: 'delivered',
        receipt_no: payments.find((p) => p.assignment_id === assignment.id)?.receipt_no,
      };

      const noticeItem: NoticeItem = {
        id: noticeId,
        title: noticeTitle,
        body: noticeBody,
        category: 'Fees',
        audience_scope: 'role',
        audience_target: assignment.student_id,
        is_public: false,
        pinned: notifType === 'overdue_warning' || notifType === 'deadline_today',
        publish_at: nowIso,
        created_by_name: 'Automated Fee Notification System',
        created_by_role: 'Accounts Officer',
        read_count: 0,
        total_target_count: 1,
        is_read: false,
      };

      const auditLog: AuditLogEntry = {
        id: `audit-fee-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        actor_id: 'system-fee-notifier',
        actor_name: 'Automated Fee Dispatcher',
        actor_role: 'accounts',
        action: `DISPATCH_${notifType.toUpperCase()}_EMAIL`,
        entity: 'FeeAssignment',
        entity_id: assignment.id,
        metadata: {
          student_id: assignment.student_id,
          student_email: studentEmail,
          fee_title: assignment.title,
          outstanding_paise: calc.outstandingPaise,
          trigger_source: triggerSource,
        },
        ip: '127.0.0.1',
        created_at: nowIso,
      };

      newLogs.push(logItem);
      newNotices.push(noticeItem);
      auditEntries.push(auditLog);
    }
  }

  return {
    newNotices,
    newLogs,
    auditEntries,
    summary: {
      processedCount: targetAssignments.length,
      newNoticesCount: newNotices.length,
      newEmailLogsCount: newLogs.length,
    },
  };
}
