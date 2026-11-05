import React, { useCallback, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HelpCircle,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import {
  AccountStatus,
  AttendanceSession,
  AttendanceStatus,
  AuditLogEntry,
  FeeAssignment,
  FeeStructure,
  GrievanceTicket,
  LeaveRequestItem,
  MentorRequest,
  NoticeItem,
  PaymentRecord,
  Profile,
  ROLE_LABELS,
  StudentRecord,
  Subject,
  SystemSettings,
  TimetableSlot,
  UserRole,
} from '../../types/portal';
import { DEMO_TEACHERS, SEED_FACULTY } from '../../data/seedData';
import { FeeNotificationLog } from '../../utils/feeNotificationEngine';
import { FeeReceiptModal } from './accounts/FeeReceiptModal';
import { MonthlyFeeFiscalInsightsChart } from './MonthlyFeeFiscalInsightsChart';
import {
  calculateAssignmentBalancePaise,
  formatPaiseToINR,
  rupeesToPaise,
  summarizeStudentLedgerPaise,
} from '../../utils/finance';
import {
  exportFeeReceiptCSV,
  generateFeeReceiptPDF,
  generateHallTicketPDF,
  generateLeavePermitPDF,
  generateReportCardPDF,
} from '../../utils/pdfGenerator';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  GlassCard,
  Input,
  ModalDialog,
  NoticeDetailModal,
  PageHeader,
  Select,
  StatTile,
  StatusLabel,
  Switch,
} from '../ui/DesignSystem';

interface AccountsAndAdminModuleProps {
  role: 'accounts' | 'admin' | 'super_admin';
  activeNav: string;
  onNavigate: (navId: string) => void;
  currentProfile?: Profile;
  profiles: Profile[];
  onVerifyPendingStudent: (profileId: string) => void;
  onInviteUser: (email: string, fullName: string, invitedRole: UserRole) => void;
  onUpdateAnyProfile?: (profileId: string, patch: Partial<Profile>) => void;
  onSaveTeacher?: (teacher: Partial<Profile> & { full_name: string; email: string }) => Promise<boolean>;
  students: StudentRecord[];
  onUpdateStudentRecord?: (studentId: string, patch: Partial<StudentRecord>) => void;
  feeStructures: FeeStructure[];
  onAddFeeStructure: (structure: Omit<FeeStructure, 'id'>) => void;
  feeAssignments: FeeAssignment[];
  onAssignFeeToStudent?: (assignment: Omit<FeeAssignment, 'id'>) => void;
  onRecordPayment: (
    assignmentId: string,
    amountPaise: number,
    mode: PaymentRecord['mode'],
    reference: string
  ) => void;
  payments: PaymentRecord[];
  onReversePayment: (paymentId: string, reason: string) => void;
  notices: NoticeItem[];
  onCreateNotice: (
    title: string,
    body: string,
    category: NoticeItem['category'],
    scope: NoticeItem['audience_scope'],
    target: string
  ) => void;
  onMarkNoticeRead?: (noticeId: string) => void;
  tickets: GrievanceTicket[];
  onResolveTicket: (ticketId: string, resolution: string) => void;
  auditLogs: AuditLogEntry[];
  settings: SystemSettings;
  onUpdateSettings: (patch: Partial<SystemSettings>) => void;
  validCollegeCodes?: { code: string; collegeName: string; scope: string; updatedAt?: string }[];
  onRegisterCollegeCode?: (code: string, collegeName: string) => void;
  onDeactivateCollegeCode?: (code: string) => void;
  subjects?: Subject[];
  onAddSubject?: (subject: Omit<Subject, 'id'>) => void;
  onUpdateSubjectMarks?: (
    subjectCode: string,
    studentId: string,
    component: string,
    marks: number
  ) => void;
  timetable?: TimetableSlot[];
  onAddTimetableSlot?: (slot: Omit<TimetableSlot, 'id'>) => void;
  onDeleteTimetableSlot?: (slotId: string) => void;
  attendanceSessions?: AttendanceSession[];
  onSaveAttendanceSession?: (session: AttendanceSession) => void;
  leaveRequests?: LeaveRequestItem[];
  onDecideLeave?: (
    leaveId: string,
    step: 'mentor' | 'hod',
    decision: 'approved' | 'rejected',
    comment: string
  ) => void;
  mentorRequests?: MentorRequest[];
  onReassignMentor?: (studentId: string, mentorId: string, mentorName?: string) => void;
  onSaveSubject?: (subject: Partial<Subject> & { code: string; name: string }) => Promise<boolean>;
  feeNotificationLogs?: FeeNotificationLog[];
  onRunFeeNotificationAudit?: () => any;
  onToast: (msg: string) => void;
  onRefresh?: () => Promise<any>;
}

// ============================================================================
// MEMOIZED SUB-COMPONENTS FOR PERFORMANCE
// ============================================================================

interface StudentTableRowProps {
  stu: CombinedStudentDossier;
  primaryActiveCode: string;
  approvingId: string | null;
  onOpenDossier: (stu: CombinedStudentDossier) => void;
  onVerifyPending: (id: string) => void;
  onToast: (msg: string) => void;
}

const StudentTableRow: React.FC<StudentTableRowProps> = React.memo(({
  stu,
  primaryActiveCode,
  approvingId,
  onOpenDossier,
  onVerifyPending,
  onToast,
}) => {
  return (
    <tr
      onClick={() => onOpenDossier(stu)}
      className="hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
    >
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={stu.full_name} size="sm" />
          <div>
            <div className="font-semibold text-[var(--text)] hover:text-[var(--accent-text)]">
              {stu.full_name}
            </div>
            <div className="font-mono text-xs font-semibold text-[var(--accent-text)]">
              {stu.enrolment_no}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="font-mono text-xs text-[var(--text)]">{stu.email}</div>
        <div className="font-mono text-[11px] text-[var(--text-muted)]">
          {stu.phone}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="text-xs font-semibold text-[var(--text)]">
          {stu.department_code} · Sem {stu.current_semester}
        </div>
        <div className="text-[11px] text-[var(--text-muted)]">{stu.batch_label}</div>
      </td>
      <td className="px-4 py-3.5">
        <span className="rounded-md bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--accent-text)]">
          {stu.college_code || primaryActiveCode}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-12 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div
                className={`h-full rounded-full ${stu.attendance_pct >= 75 ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`}
                style={{ width: `${stu.attendance_pct}%` }}
              />
            </div>
            <span className="text-[10px] font-bold font-mono">{stu.attendance_pct}%</span>
          </div>
          <div className="text-[10px] font-bold text-[var(--text-muted)]">
            CGPA: <span className="text-[var(--text)] font-mono">{stu.cgpa.toFixed(2)}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Badge
          tone={
            stu.status === 'active'
              ? 'success'
              : stu.status === 'pending'
                ? 'warning'
                : 'danger'
          }
          dot
        >
          {stu.status === 'active'
            ? 'Active'
            : stu.status === 'pending'
              ? 'Pending Approval'
              : 'Suspended'}
        </Badge>
      </td>
      <td className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center justify-end gap-1.5">
          {stu.status === 'pending' ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={approvingId === stu.profileId}
              onClick={() => {
                onVerifyPending(stu.profileId);
                onToast(`Approved ${stu.full_name} for portal entry.`);
              }}
            >
              <CheckCircle2 className={`h-3.5 w-3.5 ${approvingId === stu.profileId ? 'animate-spin' : ''}`} />
              <span>{approvingId === stu.profileId ? '...' : 'Approve'}</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenDossier(stu)}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Dossier</span>
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
});

interface UserRegistryRowProps {
  p: Profile;
  deptCode: string;
  primaryActiveCode: string;
  onOpenEdit: (user: Profile) => void;
  onUpdateAnyProfile?: (id: string, patch: Partial<Profile>) => void;
  onVerifyPending: (id: string) => void;
  onSuspend: (user: Profile) => void;
  onToast: (msg: string) => void;
}

const UserRegistryRow: React.FC<UserRegistryRowProps> = React.memo(({
  p,
  deptCode,
  primaryActiveCode,
  onOpenEdit,
  onUpdateAnyProfile,
  onVerifyPending,
  onSuspend,
  onToast,
}) => {
  return (
    <tr
      onClick={() => onOpenEdit(p)}
      className="hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
    >
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar
            name={p.full_name}
            size="sm"
            avatarId={p.avatar_id}
            photoUrl={p.custom_avatar_url || p.photo_url}
          />
          <div className="min-w-0">
            <div className="font-semibold text-ink truncate">{p.full_name}</div>
            <div className="font-mono text-[11px] text-accent truncate">
              {p.identifier_no || p.username || 'Member'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="font-mono text-xs text-ink">{p.email}</div>
        <div className="font-mono text-[11px] text-muted">{p.phone || '—'}</div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="accent">{ROLE_LABELS[p.role]}</Badge>
          <Badge tone="neutral">{deptCode}</Badge>
          <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
            {p.college_code || primaryActiveCode}
          </span>
        </div>
      </td>
      <td
        className="px-4 py-3.5"
        onClick={(e) => {
          e.stopPropagation();
          if (onUpdateAnyProfile) {
            onUpdateAnyProfile(p.id, { totp_enabled: !p.totp_enabled });
            onToast(
              `Updated 2FA status for ${p.full_name} to ${
                !p.totp_enabled ? 'Enabled' : 'Optional'
              }.`
            );
          }
        }}
      >
        <Badge tone={p.totp_enabled ? 'success' : 'neutral'} dot>
          {p.totp_enabled ? '2FA Enabled' : 'Optional'}
        </Badge>
      </td>
      <td className="px-4 py-3.5">
        <Badge
          tone={
            p.status === 'active'
              ? 'success'
              : p.status === 'pending'
                ? 'warning'
                : 'danger'
          }
          dot
        >
          {p.status === 'active'
            ? 'Approved'
            : p.status === 'pending'
              ? 'Pending Approval'
              : 'Suspended'}
        </Badge>
      </td>
      <td
        className="px-6 py-3.5 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inline-flex items-center justify-end gap-1.5">
          {p.status === 'pending' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onVerifyPending(p.id);
                onToast(
                  `Approved ${p.full_name} to enter the college platform!`
                );
              }}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Approve</span>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenEdit(p)}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{p.role === 'student' ? '360° Details' : 'Manage'}</span>
          </Button>
          {p.status !== 'pending' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSuspend(p)}
              className={
                p.status === 'suspended'
                  ? 'text-success hover:bg-success/10'
                  : 'text-danger hover:bg-danger/10'
              }
            >
              {p.status === 'suspended' ? 'Activate' : 'Suspend'}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
});

interface AuditLogSummaryRowProps {
  log: AuditLogEntry;
}

const AuditLogSummaryRow: React.FC<AuditLogSummaryRowProps> = React.memo(({ log }) => (
  <div className="py-3 flex items-center justify-between gap-4">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-accent">
          {log.action}
        </span>
        <span className="text-xs text-muted truncate">· {log.actor_name}</span>
      </div>
      <div className="text-xs text-muted truncate mt-0.5">
        Entity: {log.entity} ({log.entity_id})
      </div>
    </div>
    <span className="font-mono text-[11px] text-muted tabular-nums shrink-0">
      {new Date(log.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  </div>
));

interface AuditLogTableRowProps {
  log: AuditLogEntry;
}

const AuditLogTableRow: React.FC<AuditLogTableRowProps> = React.memo(({ log }) => (
  <tr>
    <td className="px-4 py-3 text-muted">
      {new Date(log.created_at).toLocaleString('en-IN')}
    </td>
    <td className="px-4 py-3 font-sans">
      <div className="font-semibold text-ink">{log.actor_name}</div>
      <div className="text-[11px] text-muted">{log.actor_role}</div>
    </td>
    <td className="px-4 py-3 font-semibold text-accent">{log.action}</td>
    <td className="px-4 py-3 text-ink">
      {log.entity} ({log.entity_id})
    </td>
    <td className="px-4 py-3 text-muted">
      Log Context: {JSON.stringify(log.metadata)} · IP {log.ip}
    </td>
  </tr>
));

interface NoticeSummaryCardProps {
  n: NoticeItem;
  onClick: (n: NoticeItem) => void;
}

const NoticeSummaryCard: React.FC<NoticeSummaryCardProps> = React.memo(({ n, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(n)}
    className="w-full text-left rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5 hover:border-[var(--accent)] transition-all cursor-pointer group"
  >
    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
      <Badge
        tone={
          n.category === 'Urgent'
            ? 'danger'
            : n.category === 'Exam'
              ? 'warning'
              : 'accent'
        }
      >
        {n.category}
      </Badge>
      <span className="font-mono">
        {new Date(n.publish_at).toLocaleDateString('en-IN')}
      </span>
    </div>
    <div className="mt-1.5 text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent-text)] line-clamp-1">
      {n.title}
    </div>
    <p className="mt-0.5 text-xs text-[var(--text-2)] line-clamp-2">{n.body}</p>
  </button>
));

interface NoticeRowProps {
  n: NoticeItem;
  onClick: (n: NoticeItem) => void;
}

const NoticeRow: React.FC<NoticeRowProps> = React.memo(({ n, onClick }) => (
  <GlassCard
    onClick={() => onClick(n)}
    className="cursor-pointer hover:border-[var(--accent)] transition-all group"
  >
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          n.category === 'Urgent' ? 'bg-danger/10 text-danger' : 
          n.category === 'Exam' ? 'bg-warning/10 text-warning' : 
          'bg-accent/10 text-accent'
        }`}>
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-[var(--text)] group-hover:text-[var(--accent-text)] truncate">{n.title}</h4>
            <Badge tone={
              n.category === 'Urgent' ? 'danger' : 
              n.category === 'Exam' ? 'warning' : 
              'accent'
            }>{n.category}</Badge>
          </div>
          <div className="text-xs text-[var(--text-muted)] line-clamp-1">{n.body}</div>
        </div>
      </div>
      <div className="flex flex-col items-end text-right shrink-0">
        <div className="text-[11px] font-mono font-semibold text-[var(--text)]">
          {new Date(n.publish_at).toLocaleDateString('en-IN')}
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">
          By {n.created_by_name}
        </div>
      </div>
    </div>
  </GlassCard>
));

interface NoticeCardProps {
  n: NoticeItem;
  onClick: (n: NoticeItem) => void;
}

const NoticeCard: React.FC<NoticeCardProps> = React.memo(({ n, onClick }) => (
  <GlassCard
    onClick={() => onClick(n)}
    className="cursor-pointer hover:border-[var(--accent)] transition-all"
  >
    <div className="flex items-center justify-between text-xs">
      <Badge tone="accent">{n.category}</Badge>
      <span className="font-mono text-[var(--text-muted)]">
        Read: {n.read_count}/{n.total_target_count}
      </span>
    </div>
    <div className="mt-2 text-base font-bold text-[var(--text)]">{n.title}</div>
    <p className="mt-1 text-xs text-[var(--text-2)]">{n.body}</p>
  </GlassCard>
));

interface FeeStructureTableRowProps {
  struct: FeeStructure;
}

const FeeStructureTableRow: React.FC<FeeStructureTableRowProps> = React.memo(({ struct }) => (
  <tr className="hover:bg-[var(--surface-2)] transition-colors">
    <td className="px-6 py-4 font-semibold text-[var(--text)]">{struct.title}</td>
    <td className="px-4 py-4">
      <Badge tone="neutral">{struct.category}</Badge>
    </td>
    <td className="px-4 py-4 font-mono font-bold text-[var(--accent-text)]">
      {formatPaiseToINR(struct.amount_paise)}
    </td>
    <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
      {new Date(struct.due_date).toLocaleDateString()}
    </td>
  </tr>
));

interface FeeStructureCardProps {
  fs: FeeStructure;
}

const FeeStructureCard: React.FC<FeeStructureCardProps> = React.memo(({ fs }) => (
  <div
    className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-4 flex items-center justify-between"
  >
    <div>
      <Badge tone="accent">{fs.category.toUpperCase()}</Badge>
      <div className="mt-1 font-semibold text-ink">{fs.title}</div>
      <div className="font-mono text-xs text-muted">
        Due: {fs.due_date} · Late Fine: {formatPaiseToINR(fs.fine_per_day_paise)}/day
      </div>
    </div>
    <div className="text-right font-mono">
      <div className="text-lg font-bold tabular-nums text-ink">
        {formatPaiseToINR(fs.amount_paise)}
      </div>
      <div className="text-[11px] text-muted">{fs.amount_paise} paise</div>
    </div>
  </div>
));

interface FeeReceiptRowProps {
  p: PaymentRecord;
  onViewReceipt: (p: PaymentRecord) => void;
  onGeneratePDF: (p: PaymentRecord) => void;
  onSetReversalTarget: (p: PaymentRecord) => void;
}

const FeeReceiptRow: React.FC<FeeReceiptRowProps> = React.memo(({ p, onViewReceipt, onGeneratePDF, onSetReversalTarget }) => {
  const isReversal = Boolean(p.reversed_of);
  const paymentDate = p.created_at
    ? new Date(p.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Recorded';

  return (
    <tr
      key={p.id}
      className="hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
      onClick={() => onViewReceipt(p)}
    >
      <td className="px-4 py-3 font-mono text-xs font-semibold text-ink whitespace-nowrap">
        <div>{p.receipt_no}</div>
        <div className="text-[11px] text-muted font-normal">{paymentDate}</div>
        {p.reversed_of && (
          <div className="text-[10px] text-danger">Reversal of {p.reversed_of}</div>
        )}
      </td>
      <td className="px-4 py-3 min-w-[140px] max-w-[200px]">
        <div className="font-medium text-ink truncate" title={p.student_name}>
          {p.student_name}
        </div>
        <div className="font-mono text-xs text-muted truncate">
          {p.enrolment_no ? `${p.enrolment_no} · ` : ''}{p.reference}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge tone={isReversal ? 'danger' : 'success'} dot>
          {isReversal ? 'Reversed' : (p.status ? p.status.toUpperCase() : 'Settled')}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap text-ink">
        {formatPaiseToINR(p.amount_paise)}
      </td>
      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <Button variant="secondary" size="sm" onClick={() => onViewReceipt(p)}>
          View
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onGeneratePDF(p)}>
          PDF
        </Button>
        {!p.reversed_of && p.amount_paise > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onSetReversalTarget(p)}>
            Reverse
          </Button>
        )}
      </td>
    </tr>
  );
});

interface PendingApprovalRowProps {
  p: Profile;
  onOpenEdit: (p: Profile) => void;
  onApprove: (id: string) => void;
  approvingId: string | null;
  primaryActiveCode: string;
}

const PendingApprovalRow: React.FC<PendingApprovalRowProps> = React.memo(({ p, onOpenEdit, onApprove, approvingId, primaryActiveCode }) => (
  <div
    key={p.id}
    onClick={() => onOpenEdit(p)}
    className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 hover:border-[var(--accent)] cursor-pointer transition-all"
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <Avatar
        name={p.full_name}
        size="sm"
        avatarId={p.avatar_id}
        photoUrl={p.custom_avatar_url || p.photo_url}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--text)] truncate">
            {p.full_name}
          </span>
          <Badge tone="accent">{ROLE_LABELS[p.role]}</Badge>
          {p.college_code && (
            <span className="font-mono text-[11px] font-semibold text-[var(--accent-text)]">
              Code: {p.college_code}
            </span>
          )}
        </div>
        <div className="font-mono text-[11px] text-[var(--text-muted)] truncate">
          {p.email} {p.identifier_no ? `· ID: ${p.identifier_no}` : ''}
        </div>
      </div>
    </div>

    <div
      className="flex items-center gap-1.5 shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onOpenEdit(p)}
      >
        <Eye className="h-3.5 w-3.5" />
        <span>Details</span>
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={approvingId === p.id}
        onClick={() => onApprove(p.id)}
      >
        <CheckCircle2 className={`h-3.5 w-3.5 ${approvingId === p.id ? 'animate-spin' : ''}`} />
        <span>{approvingId === p.id ? 'Approving...' : 'Approve & Allow'}</span>
      </Button>
    </div>
  </div>
));

interface ModuleQuickLaunchButtonProps {
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick: () => void;
}

const ModuleQuickLaunchButton: React.FC<ModuleQuickLaunchButtonProps> = React.memo(({ label, sub, icon: Icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="glass group flex items-center justify-between gap-3.5 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-400/50 cursor-pointer"
  >
    <div className="flex items-center gap-3.5 min-w-0">
      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--accent-soft)] text-accent group-hover:bg-accent group-hover:text-white transition-colors">
        <Icon className="h-5 w-5" strokeWidth={1.85} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold text-ink group-hover:text-accent truncate">
          {label}
        </div>
        <div className="text-xs text-muted truncate">{sub}</div>
      </div>
    </div>
    <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
  </button>
));
const AttendanceGridItem: React.FC<AttendanceGridItemProps> = React.memo(({ stu, status, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(stu.id)}
      className={`rounded-[10px] border p-3 text-left transition-all cursor-pointer ${
        status === 'Present'
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : status === 'Absent'
            ? 'border-rose-500/40 bg-rose-500/5'
            : status === 'Late'
              ? 'border-amber-500/40 bg-amber-500/5'
              : 'border-indigo-500/40 bg-indigo-500/5'
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-tight text-[var(--text-muted)]">
        {stu.enrolment_no}
      </div>
      <div className="mt-0.5 truncate text-[13px] font-bold text-[var(--text)]">
        {stu.full_name}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${
            status === 'Present'
              ? 'bg-emerald-500'
              : status === 'Absent'
                ? 'bg-rose-500'
                : status === 'Late'
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
          }`}
        />
        <span className="text-[11px] font-bold text-[var(--text)]">{status}</span>
      </div>
    </button>
  );
});

interface AttendanceOverviewRowProps {
  s: CombinedStudentDossier;
  minAttendance: number;
  onOpenDossier: (s: CombinedStudentDossier) => void;
  onQuickAdjust: (id: string, next: number) => void;
}

const AttendanceOverviewRow: React.FC<AttendanceOverviewRowProps> = React.memo(({ s, minAttendance, onOpenDossier, onQuickAdjust }) => (
  <tr
    onClick={() => onOpenDossier(s)}
    className="hover:bg-[var(--surface-2)] cursor-pointer"
  >
    <td className="px-5 py-3.5 font-semibold text-[var(--text)]">{s.full_name}</td>
    <td className="px-5 py-3.5 font-mono text-xs text-[var(--accent-text)]">
      {s.enrolment_no}
    </td>
    <td className="px-5 py-3.5 text-xs text-[var(--text-2)]">
      {s.department_code} · {s.batch_label}
    </td>
    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold">
      {s.attendance_pct}%
    </td>
    <td className="px-5 py-3.5">
      <Badge
        tone={
          s.attendance_pct >= minAttendance ? 'success' : 'danger'
        }
        dot
      >
        {s.attendance_pct >= minAttendance
          ? 'Eligible'
          : 'Attendance Shortage'}
      </Badge>
    </td>
    <td
      className="px-5 py-3.5 text-right"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="inline-flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const next = Math.min(100, s.attendance_pct + 2);
            onQuickAdjust(s.id, next);
          }}
        >
          +2%
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOpenDossier(s)}
        >
          Edit
        </Button>
      </div>
    </td>
  </tr>
));

interface LeaveRequestCardProps {
  lv: LeaveRequestItem;
  collegeName: string;
  collegeCode: string;
  comment: string;
  onCommentChange: (id: string, val: string) => void;
  onDecide: (id: string, decision: 'approved' | 'rejected') => void;
  onToast: (msg: string) => void;
}

const LeaveRequestCard: React.FC<LeaveRequestCardProps> = React.memo(({ lv, collegeName, collegeCode, comment, onCommentChange, onDecide, onToast }) => (
  <GlassCard padding="lg" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <span className="font-bold text-[var(--text)]">
          {lv.applicant_name} ({lv.enrolment_no})
        </span>
        <span className="mx-2 text-[var(--text-muted)]">·</span>
        <Badge tone="accent">{lv.type}</Badge>
        <span className="mx-2 text-[var(--text-muted)]">·</span>
        <span className="font-mono text-xs text-[var(--text-muted)]">
          {lv.from_date} to {lv.to_date} ({lv.days_count} day(s))
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          tone={
            lv.status === 'Approved'
              ? 'success'
              : lv.status === 'Rejected'
                ? 'danger'
                : 'warning'
          }
          dot
        >
          {lv.status}
        </Badge>
        {lv.status === 'Approved' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              generateLeavePermitPDF(
                lv,
                collegeName,
                collegeCode
              );
              onToast(`Downloaded Official Leave Permit PDF for ${lv.applicant_name}.`);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Permit PDF</span>
          </Button>
        )}
      </div>
    </div>

    <div className="rounded-[10px] bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-[var(--text)]">
      <strong>Reason:</strong> {lv.reason}
    </div>

    {lv.status !== 'Approved' && lv.status !== 'Rejected' && (
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <input
          type="text"
          placeholder="Decision comment..."
          className="flex-1 rounded-[8px] border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs text-[var(--text)] outline-none"
          value={comment}
          onChange={(e) => onCommentChange(lv.id, e.target.value)}
        />
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDecide(lv.id, 'rejected')}
            className="text-danger"
          >
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onDecide(lv.id, 'approved')}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve Leave
          </Button>
        </div>
      </div>
    )}

    {lv.approvals.length > 0 && (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[10.5px] text-[var(--text-muted)]">
        {lv.approvals.map((a, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <Check className="h-3 w-3 text-success" />
            {a.approver_name}: {a.comment}
          </span>
        ))}
      </div>
    )}
  </GlassCard>
));

interface TicketCardProps {
  t: GrievanceTicket;
  reply: string;
  onReplyChange: (id: string, val: string) => void;
  onResolve: (id: string) => void;
}

const TicketCard: React.FC<TicketCardProps> = React.memo(({ t, reply, onReplyChange, onResolve }) => (
  <GlassCard padding="lg" className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={t.raised_by_name} size="sm" />
        <div>
          <div className="text-sm font-bold text-[var(--text)]">{t.raised_by_name}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{t.created_at}</div>
        </div>
      </div>
      <Badge
        tone={
          t.status === 'resolved'
            ? 'success'
            : 'warning'
        }
      >
        {t.status.toUpperCase()}
      </Badge>
    </div>
    <div className="text-xs font-bold text-[var(--accent-text)] uppercase tracking-wide">
      {t.category}: {t.subject}
    </div>
    <p className="text-xs text-[var(--text-2)] leading-relaxed">{t.body}</p>

    {t.status !== 'resolved' && (
      <div className="flex flex-col gap-2 pt-1">
        <textarea
          rows={2}
          placeholder="Write resolution reply..."
          className="w-full rounded-[10px] border border-[var(--border)] bg-transparent p-2.5 text-xs text-[var(--text)] outline-none"
          value={reply}
          onChange={(e) => onReplyChange(t.id, e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onResolve(t.id)}
          >
            Mark Resolved & Notify Student
          </Button>
        </div>
      </div>
    )}
  </GlassCard>
));

interface TimetableSlotTableRowProps {
  slot: TimetableSlot;
  weekdayLabel: string;
  onDelete?: (id: string) => void;
}

const TimetableSlotTableRow: React.FC<TimetableSlotTableRowProps> = React.memo(({ slot, weekdayLabel, onDelete }) => (
  <tr className="hover:bg-[var(--surface-2)]">
    <td className="px-5 py-3.5 font-semibold text-[var(--text)]">
      {weekdayLabel}
    </td>
    <td className="px-5 py-3.5 font-mono text-xs text-[var(--accent-text)]">
      P{slot.period} · {slot.start_time} – {slot.end_time}
    </td>
    <td className="px-5 py-3.5">
      <div className="font-semibold text-[var(--text)]">
        {slot.subject_code} · {slot.subject_name}
      </div>
      {slot.substitution_note && (
        <div className="text-[11px] text-amber-500">
          Note: {slot.substitution_note}
        </div>
      )}
    </td>
    <td className="px-5 py-3.5 text-xs text-[var(--text-2)]">
      <div>{slot.faculty_name}</div>
      <div className="font-mono text-[var(--text-muted)]">Room {slot.room}</div>
    </td>
    <td className="px-5 py-3.5 text-right">
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(slot.id)}
          className="text-danger hover:bg-danger/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </td>
  </tr>
));

interface OverdueAssignmentRowProps {
  item: FeeAssignment;
  payments?: PaymentRecord[];
  onSendReminder: (name: string) => void;
}

const OverdueAssignmentRow: React.FC<OverdueAssignmentRowProps> = React.memo(({ item, payments, onSendReminder }) => {
  const calc = calculateAssignmentBalancePaise(
    item,
    new Date().toISOString().slice(0, 10),
    payments
  );
  return (
    <div className="flex flex-col justify-between gap-4 py-3.5 sm:flex-row sm:items-center">
      <div>
        <div className="text-sm font-semibold text-ink">
          {item.student_name} ({item.enrolment_no}) · {item.title}
        </div>
        <div className="font-mono text-xs tabular-nums text-muted">
          Due: {item.due_date} ({calc.lateDays}d overdue) · Balance + Fine:{' '}
          <strong className="text-danger">
            {formatPaiseToINR(calc.outstandingPaise)}
          </strong>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onSendReminder(item.student_name)}
      >
        <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
        Send Due Reminder
      </Button>
    </div>
  );
});

interface ExamStandingRowProps {
  s: CombinedStudentDossier;
  subjects: Subject[];
  collegeName: string;
  collegeCode: string;
  onUpdateCgpa: (id: string, cgpa: number) => void;
  onToast: (msg: string) => void;
}

const ExamStandingRow: React.FC<ExamStandingRowProps> = React.memo(({ s, subjects, collegeName, collegeCode, onUpdateCgpa, onToast }) => {
  const stuRecord: StudentRecord = {
    id: s.id,
    profile_id: s.profileId,
    enrolment_no: s.enrolment_no,
    full_name: s.full_name,
    email: s.email,
    phone: s.phone,
    department_code: s.department_code,
    current_semester: s.current_semester,
    attendance_pct: s.attendance_pct,
    cgpa: s.cgpa,
    batch_id: 'UNKNOWN',
    batch_label: s.batch_label,
    department_id: 'UNKNOWN',
    guardian_name: 'UNKNOWN',
    mentor_id: 'UNKNOWN',
    sgpa: 0,
    fee_status: 'pending',
  };

  return (
    <tr className="hover:bg-[var(--surface-2)]">
      <td className="px-5 py-3.5 font-semibold text-[var(--text)]">{s.full_name}</td>
      <td className="px-5 py-3.5 font-mono text-xs text-[var(--accent-text)]">{s.enrolment_no}</td>
      <td className="px-5 py-3.5 text-xs text-[var(--text-2)]">{s.department_code}</td>
      <td className="px-5 py-3.5 text-right font-mono text-xs font-bold">{s.attendance_pct}%</td>
      <td className="px-5 py-3.5 text-right">
        <input
          type="number"
          step="0.01"
          className="w-16 rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-right font-mono text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
          value={s.cgpa}
          onChange={(e) => onUpdateCgpa(s.id, Number(e.target.value))}
        />
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="inline-flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              generateReportCardPDF(stuRecord, subjects, s.current_semester, collegeName, collegeCode);
              onToast(`Generating Report Card for ${s.full_name}...`);
            }}
          >
            Report Card
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              generateHallTicketPDF(stuRecord, subjects, collegeName, collegeCode);
              onToast(`Generating Hall Ticket for ${s.full_name}...`);
            }}
          >
            Hall Ticket
          </Button>
        </div>
      </td>
    </tr>
  );
});

interface AttendanceSessionRowProps {
  ses: AttendanceSession;
}

const AttendanceSessionRow: React.FC<AttendanceSessionRowProps> = React.memo(({ ses }) => (
  <tr className="hover:bg-[var(--surface-2)]">
    <td className="px-5 py-3.5 font-mono text-xs text-[var(--text)]">{ses.date}</td>
    <td className="px-5 py-3.5">
      <div className="font-semibold text-[var(--text)]">
        {ses.subject_code} · {ses.subject_name}
      </div>
      <div className="text-[10px] text-[var(--text-muted)]">Period {ses.period}</div>
    </td>
    <td className="px-5 py-3.5">
      <div className="flex flex-wrap gap-1">
        {Object.entries(ses?.records || {}).slice(0, 3).map(([id, status]) => (
          <Badge key={id} tone={status === 'Present' ? 'success' : 'danger'}>
            {status === 'Present' ? 'P' : 'A'}
          </Badge>
        ))}
        {Object.keys(ses?.records || {}).length > 3 && (
          <span className="text-[10px] text-[var(--text-muted)]">
            +{Object.keys(ses?.records || {}).length - 3} more
          </span>
        )}
      </div>
    </td>
    <td className="px-5 py-3.5 text-right font-mono text-xs text-[var(--text-muted)]">
      {ses.locked_at ? 'Locked' : 'Draft'}
    </td>
  </tr>
));

interface AttendanceGridItemProps {
  stu: CombinedStudentDossier;
  status: AttendanceStatus;
  onClick: (id: string) => void;
}

export interface CombinedStudentDossier {
  id: string;
  profileId: string;
  full_name: string;
  email: string;
  phone: string;
  enrolment_no: string;
  college_code: string;
  college_name: string;
  batch_label: string;
  department_code: string;
  current_semester: number;
  attendance_pct: number;
  cgpa: number;
  status: AccountStatus;
  mentor_id?: string;
  mentor_name?: string;
  created_at?: string;
}

export const AccountsAndAdminModule: React.FC<AccountsAndAdminModuleProps> = React.memo(({
  role,
  activeNav,
  onNavigate,
  currentProfile,
  profiles = [],
  onVerifyPendingStudent,
  onInviteUser,
  onUpdateAnyProfile,
  onSaveTeacher,
  students = [],
  onUpdateStudentRecord,
  feeStructures = [],
  onAddFeeStructure,
  feeAssignments = [],
  onAssignFeeToStudent,
  onRecordPayment,
  payments = [],
  onReversePayment,
  notices = [],
  onCreateNotice,
  onMarkNoticeRead,
  tickets = [],
  onResolveTicket,
  auditLogs = [],
  settings,
  onUpdateSettings,
  validCollegeCodes = [],
  onRegisterCollegeCode,
  onDeactivateCollegeCode,
  subjects = [],
  onAddSubject,
  onUpdateSubjectMarks,
  timetable = [],
  onAddTimetableSlot,
  onDeleteTimetableSlot,
  attendanceSessions = [],
  onSaveAttendanceSession,
  leaveRequests = [],
  onDecideLeave,
  mentorRequests = [],
  onReassignMentor,
  onSaveSubject,
  feeNotificationLogs = [],
  onRunFeeNotificationAudit,
  onToast,
  onRefresh,
}) => {
  // Dedicated Subject Management State (Organizer Module)
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectDeptFilter, setSubjectDeptFilter] = useState('ALL');
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjCode, setSubjCode] = useState('');
  const [subjName, setSubjName] = useState('');
  const [subjDept, setSubjDept] = useState('CSE');
  const [subjSem, setSubjSem] = useState(1);
  const [subjSec, setSubjSec] = useState('A');
  const [subjCredits, setSubjCredits] = useState(3);
  const [subjType, setSubjType] = useState<'theory' | 'practical' | 'elective'>('theory');
  const [subjFacultyId, setSubjFacultyId] = useState(DEMO_TEACHERS[0]?.id || 'tch-001');
  const [subjDesc, setSubjDesc] = useState('');
  const [subjStatus, setSubjStatus] = useState<'active' | 'inactive'>('active');
  const [subjError, setSubjError] = useState<string | null>(null);

  // Mentoring Allocation State & 5-Step Guided Workflow
  const [selectedStudentForMentor, setSelectedStudentForMentor] = useState<CombinedStudentDossier | null>(null);
  const [assigningFacultyId, setAssigningFacultyId] = useState<string>(DEMO_TEACHERS[0]?.id || 'tch-001');
  const [mentorAssignModalOpen, setMentorAssignModalOpen] = useState(false);
  const [mentorWizardStep, setMentorWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [mentorAssignType, setMentorAssignType] = useState<'individual' | 'class' | 'cohort'>('individual');
  const [mentorTargetStudentId, setMentorTargetStudentId] = useState<string>('');
  const [mentorStudentSearch, setMentorStudentSearch] = useState<string>('');
  const [mentorTargetDept, setMentorTargetDept] = useState<string>('CSE');
  const [mentorTargetSem, setMentorTargetSem] = useState<number>(6);
  const [mentorTargetFacultyId, setMentorTargetFacultyId] = useState<string>('');
  const [mentorWizardError, setMentorWizardError] = useState<string | null>(null);
  const [mentorCompletedSummary, setMentorCompletedSummary] = useState<{
    typeLabel: string;
    targetLabel: string;
    mentorName: string;
    count: number;
    timestamp: string;
  } | null>(null);
  const [isSubmittingMentorAssignment, setIsSubmittingMentorAssignment] = useState(false);
  // Accounts State
  const [selectedFeeEmailPreview, setSelectedFeeEmailPreview] = useState<FeeNotificationLog | null>(null);
  const [newStructTitle, setNewStructTitle] = useState('');
  const [newStructCat, setNewStructCat] = useState<FeeStructure['category']>('tuition');
  const [newStructRupees, setNewStructRupees] = useState('');
  const [newStructDue, setNewStructDue] = useState('2026-11-30');
  const [newStructFineRupees, setNewStructFineRupees] = useState('50');

  // Assign Fee to Student State
  const [assignStudentId, setAssignStudentId] = useState(students[0]?.id || '');
  const [assignStructId, setAssignStructId] = useState(feeStructures[0]?.id || '');

  const [payAssignmentId, setPayAssignmentId] = useState(feeAssignments[0]?.id || '');
  const [payRupees, setPayRupees] = useState('');
  const [payMode, setPayMode] = useState<PaymentRecord['mode']>('upi');
  const [payRef, setPayRef] = useState('');

  // Reversal Modal State
  const [reversalTarget, setReversalTarget] = useState<PaymentRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [selectedReceiptModal, setSelectedReceiptModal] = useState<PaymentRecord | null>(null);

  // Staff / Student Invite Modal State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('student');

  // College Organizer Custom Code Generator State
  const [newOrgCollegeName, setNewOrgCollegeName] = useState('');
  const [newOrgCollegeCode, setNewOrgCollegeCode] = useState('');

  // Sync local form state with authoritative profile data when it becomes available (e.g. after registration or hydration)
  React.useEffect(() => {
    if (currentProfile?.college_name && !newOrgCollegeName) {
      setNewOrgCollegeName(currentProfile.college_name);
    }
    if (currentProfile?.college_code && !newOrgCollegeCode) {
      setNewOrgCollegeCode(currentProfile.college_code);
    }
  }, [currentProfile?.college_name, currentProfile?.college_code, newOrgCollegeName, newOrgCollegeCode]);

  // Real-time personal name for Dashboard Welcome Header
  const welcomeDisplayName = useMemo(() => {
    const candidate = (
      currentProfile?.full_name ||
      currentProfile?.display_name ||
      currentProfile?.first_name ||
      ''
    ).trim();
    if (
      !candidate ||
      candidate.toLowerCase() === 'college organizer' ||
      candidate.toLowerCase() === 'super admin' ||
      candidate.toLowerCase() === 'college admin'
    ) {
      return currentProfile?.role ? ROLE_LABELS[currentProfile.role] : 'Authorized User';
    }
    return candidate;
  }, [currentProfile?.full_name, currentProfile?.display_name, currentProfile?.first_name]);

  const [codeFormError, setCodeFormError] = useState<string | null>(null);
  const [deactivateCodeTarget, setDeactivateCodeTarget] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeMenuOpen, setCodeMenuOpen] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  const filteredAuditLogs = useMemo(() => {
    if (!auditSearchQuery.trim()) return auditLogs || [];
    const q = auditSearchQuery.toLowerCase().trim();
    return (auditLogs || []).filter((log) => {
      const actor = (log.actor_name || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const entity = (log.entity || '').toLowerCase();
      const entityId = (log.entity_id || '').toLowerCase();
      const details = JSON.stringify(log.metadata || {}).toLowerCase();
      return (
        actor.includes(q) ||
        action.includes(q) ||
        entity.includes(q) ||
        entityId.includes(q) ||
        details.includes(q)
      );
    });
  }, [auditLogs, auditSearchQuery]);

  // Dashboard Refresh & User Registry Filter State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Registered Students List Filter State
  const [stuSearch, setStuSearch] = useState('');
  const [stuStatusFilter, setStuStatusFilter] = useState<string>('all');
  const [stuDeptFilter, setStuDeptFilter] = useState<string>('all');

  // User Inspection / Edit / Suspend Modals
  const [selectedUserModal, setSelectedUserModal] = useState<Profile | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('student');
  const [editUserStatus, setEditUserStatus] = useState<AccountStatus>('active');
  const [editUserDept, setEditUserDept] = useState('');
  const [suspendConfirmUser, setSuspendConfirmUser] = useState<Profile | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Clickable 360° Student Dossier Modal State
  const [selectedStudentDossier, setSelectedStudentDossier] =
    useState<CombinedStudentDossier | null>(null);
  const [dossierAttendance, setDossierAttendance] = useState<string>('88');
  const [dossierCgpa, setDossierCgpa] = useState<string>('8.40');
  const [dossierDept, setDossierDept] = useState<string>('CSE');
  const [dossierSem, setDossierSem] = useState<string>('6');
  const [dossierEnrolment, setDossierEnrolment] = useState<string>('');

  // Notice Creation & Full Detail Modal State
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeCat, setNoticeCat] = useState<NoticeItem['category']>('Academic');
  const [noticeScope, setNoticeScope] = useState<NoticeItem['audience_scope']>('college');
  const [noticeTarget, setNoticeTarget] = useState('All Campus Roles & Joined Students');
  const [selectedNoticeDetail, setSelectedNoticeDetail] = useState<NoticeItem | null>(null);

  // Timetable Creator State (Organizer / Admin)
  const [ttWeekday, setTtWeekday] = useState<string>('1');
  const [ttPeriod, setTtPeriod] = useState('1');
  const [ttStartTime, setTtStartTime] = useState('09:00');
  const [ttEndTime, setTtEndTime] = useState('09:50');
  const [ttSubjectCode, setTtSubjectCode] = useState(subjects[0]?.code || 'CS601');
  const [ttFacultyName, setTtFacultyName] = useState('');
  const [ttRoom, setTtRoom] = useState('LH-204');
  const [ttNote, setTtNote] = useState('');

  // Attendance Session Creator State (Organizer / Admin)
  const [attSubjectCode, setAttSubjectCode] = useState(subjects[0]?.code || 'CS601');
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attPeriod, setAttPeriod] = useState('1');
  const [attRecords, setAttRecords] = useState<Record<string, AttendanceStatus>>({});

  // Subject Creator & Grade Card Editor State (Organizer / Admin)
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubFaculty, setNewSubFaculty] = useState('');
  const [newSubCredits, setNewSubCredits] = useState('4');
  const [gradeStudentId, setGradeStudentId] = useState(students[0]?.id || '');
  const [gradeSubjectCode, setGradeSubjectCode] = useState(subjects[0]?.code || 'CS601');
  const [gradeComponent, setGradeComponent] = useState('End-Sem / Lab (Max 40)');
  const [gradeMarks, setGradeMarks] = useState('35');

  // Leave Comments & Ticket Replies State
  const [leaveComments, setLeaveComments] = useState<Record<string, string>>({});
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');

  // Password Re-entry for Audit / Fee Export
  const [exportPasswordModal, setExportPasswordModal] = useState(false);
  const [reenteredPassword, setReenteredPassword] = useState('');
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  // Bulk CSV Dry-Run State
  const [csvRaw, setCsvRaw] = useState(
    'full_name,enrolment_no,email,phone,department\nStudent Name,ENROL-101,student@college.edu,+91 00000 00000,CSE'
  );
  const [dryRunRows, setDryRunRows] = useState<
    { line: number; data: string; valid: boolean; error?: string }[]
  >([]);

  const runCsvDryRun = useCallback(() => {
    const lines = csvRaw.trim().split('\n').slice(1);
    const parsed = lines.map((lineText, idx) => {
      const cols = lineText.split(',');
      if (cols.length < 5) {
        return { line: idx + 2, data: lineText, valid: false, error: 'Missing required columns' };
      }
      if (!cols[2].includes('@')) {
        return {
          line: idx + 2,
          data: lineText,
          valid: false,
          error: `Invalid email format "${cols[2]}"`,
        };
      }
      return { line: idx + 2, data: lineText, valid: true };
    });
    setDryRunRows(parsed);
  }, [csvRaw]);

  // Scope profiles and notices to Organizer's college code if set
  const organizerCodes = useMemo(() => {
    const codes = new Set<string>();
    if (currentProfile?.college_code) {
      codes.add(currentProfile.college_code.toUpperCase());
    }
    validCollegeCodes.forEach((c) => codes.add(c.code.toUpperCase()));
    return codes;
  }, [currentProfile?.college_code, validCollegeCodes]);

  // Primary Active Access Code — ALWAYS reflects currentProfile.college_code as first priority
  const primaryActiveCode = useMemo(() => {
    if (currentProfile?.college_code) {
      const codeUpper = (currentProfile.college_code || '').trim().toUpperCase();
      // Find matching entry in validCollegeCodes for extra metadata
      const match = validCollegeCodes.find(c => (c.code || '').trim().toUpperCase() === codeUpper);
      
      return {
        code: codeUpper,
        collegeName: currentProfile.college_name || match?.collegeName || 'Institution Workspace',
        scope: match?.scope || 'Authorized for Students, Teachers & Admins',
      };
    }
    
    // Only if profile has NO code, return empty state (do not fallback to first global code)
    return {
      code: '',
      collegeName: 'Institution Workspace',
      scope: 'Authorized for Students, Teachers & Admins',
    };
  }, [validCollegeCodes, currentProfile?.college_code, currentProfile?.college_name]);

  // Timetable Day Filter State (Monday=1 through Saturday=6)
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<number>(1);

  // Unified Available Teachers: Merges database profiles (role faculty/hod) with 10 Realistic Demo Teachers
  const availableTeachers = useMemo(() => {
    const facultyProfiles = profiles.filter((p) => p.role === 'faculty' || p.role === 'hod');
    const matchedProfiles = organizerCodes.size > 0
      ? facultyProfiles.filter((p) => !p.college_code || organizerCodes.has(p.college_code.toUpperCase()))
      : facultyProfiles;

    const mapped = matchedProfiles.map((p) => ({
      id: p.id,
      profile_id: p.id,
      full_name: p.full_name,
      name: p.full_name,
      employee_id: p.identifier_no || p.id,
      department: p.department || 'General Academics',
      department_code: p.department || 'GEN',
      designation: (p as any).designation || (p.role === 'hod' ? 'Head of Department' : 'Faculty Instructor'),
      email: p.email,
      phone: p.phone || '',
      status: p.status || 'active',
    }));

    const seenIds = new Set(mapped.map((t) => (t.employee_id || t.id).toLowerCase()));
    const seenEmails = new Set(mapped.map((t) => (t.email || '').toLowerCase()));

    const result = [...mapped];
    for (const demo of DEMO_TEACHERS) {
      if (!seenIds.has(demo.employee_id.toLowerCase()) && !seenEmails.has(demo.email.toLowerCase())) {
        result.push({
          id: demo.id,
          profile_id: demo.id,
          full_name: demo.full_name,
          name: demo.name || demo.full_name || '',
          employee_id: demo.employee_id,
          department: demo.department || '',
          department_code: demo.department_code,
          designation: demo.designation,
          email: demo.email,
          phone: demo.phone || '',
          status: 'active' as AccountStatus,
        });
      }
    }
    return result;
  }, [profiles, organizerCodes]);

  // Filtered slots for selected day, sorted chronologically by period and time
  const filteredTimetableSlots = useMemo(() => {
    return timetable
      .filter((slot) => Number(slot.weekday) === selectedTimetableDay)
      .sort((a, b) => {
        if (a.period !== b.period) return a.period - b.period;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
  }, [timetable, selectedTimetableDay]);

  // Teacher Management State
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherDeptFilter, setTeacherDeptFilter] = useState('ALL');
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmpId, setTeacherEmpId] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherDept, setTeacherDept] = useState('Computer Science');
  const [teacherDesignation, setTeacherDesignation] = useState('Assistant Professor');
  const [teacherStatus, setTeacherStatus] = useState<AccountStatus>('active');
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);

  const handleOpenAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherName('');
    const nextNum = String(availableTeachers.length + 1).padStart(3, '0');
    setTeacherEmpId(`TCH-${nextNum}`);
    setTeacherEmail('');
    setTeacherPhone('');
    setTeacherDept('Computer Science');
    setTeacherDesignation('Assistant Professor');
    setTeacherStatus('active');
    setTeacherError(null);
    setTeacherModalOpen(true);
  };

  const handleOpenEditTeacher = (t: any) => {
    setEditingTeacher(t);
    setTeacherName(t.full_name || t.name);
    setTeacherEmpId(t.employee_id || t.id);
    setTeacherEmail(t.email || '');
    setTeacherPhone(t.phone || '');
    setTeacherDept(t.department || 'Computer Science');
    setTeacherDesignation(t.designation || 'Faculty Instructor');
    setTeacherStatus(t.status || 'active');
    setTeacherError(null);
    setTeacherModalOpen(true);
  };

  const handleSubmitTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError(null);
    const cleanName = teacherName.trim();
    const cleanEmpId = teacherEmpId.trim().toUpperCase();
    const cleanEmail = teacherEmail.trim().toLowerCase();

    if (!cleanName) {
      setTeacherError("Teacher's full name is required.");
      return;
    }
    if (!cleanEmpId) {
      setTeacherError('Teacher ID / Employee ID is required.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setTeacherError('A valid email address is required.');
      return;
    }

    const duplicate = availableTeachers.find(
      (t) =>
        (!editingTeacher || t.id !== editingTeacher.id) &&
        (t.employee_id.toUpperCase() === cleanEmpId || t.email.toLowerCase() === cleanEmail)
    );
    if (duplicate) {
      setTeacherError(`A teacher with ID "${cleanEmpId}" or email "${cleanEmail}" already exists (${duplicate.full_name}).`);
      return;
    }

    setIsSavingTeacher(true);
    const payload = {
      id: editingTeacher ? editingTeacher.id : `tch-${cleanEmpId.toLowerCase()}`,
      full_name: cleanName,
      identifier_no: cleanEmpId,
      email: cleanEmail,
      phone: teacherPhone.trim(),
      department: teacherDept,
      designation: teacherDesignation,
      status: teacherStatus,
    };

    if (onSaveTeacher) {
      await onSaveTeacher(payload);
    } else if (onUpdateAnyProfile) {
      onUpdateAnyProfile(payload.id, payload as any);
    }

    setIsSavingTeacher(false);
    setTeacherModalOpen(false);
    onToast(editingTeacher ? `Updated teacher details for ${cleanName}.` : `Added ${cleanName} (${cleanEmpId}) to Teacher Directory.`);
  };

  // Resolve normalized academic department for any profile
  const getProfileDepartment = useMemo(() => {
    const studentDeptByProfileId = new Map<string, string>();
    if (Array.isArray(students)) {
      students.forEach((s) => {
        if (s.department_code) {
          studentDeptByProfileId.set(s.profile_id, s.department_code.toUpperCase());
        }
      });
    }

    return (p: Profile): string => {
      if (!p) return 'ADMIN';
      if (p.department && p.department.trim()) {
        const raw = p.department.trim();
        const upper = raw.toUpperCase();
        if (upper.includes('COMPUTER') || upper === 'CSE') return 'CSE';
        if (upper.includes('ELECTRONICS') || upper === 'ECE') return 'ECE';
        if (upper.includes('MECHANICAL') || upper === 'ME') return 'ME';
        if (upper.includes('CIVIL') || upper === 'CE') return 'CE';
        if (upper.includes('INFORMATION') || upper === 'IT') return 'IT';
        if (upper.includes('ELECTRICAL') || upper === 'EEE') return 'EEE';
        if (upper.includes('ADMIN') || upper.includes('REGISTRY') || upper.includes('FINANCE')) {
          return 'ADMIN';
        }
        return raw;
      }

      const linkedStuDept = studentDeptByProfileId.get(p.id);
      if (linkedStuDept) return linkedStuDept;

      const idNo = (p.identifier_no || '').toUpperCase();
      if (idNo.includes('CSE')) return 'CSE';
      if (idNo.includes('ECE')) return 'ECE';
      if (idNo.includes('ME')) return 'ME';
      if (idNo.includes('CE')) return 'CE';
      if (idNo.includes('IT')) return 'IT';
      if (idNo.includes('EEE')) return 'EEE';

      if (p.role === 'student' || p.role === 'faculty' || p.role === 'hod') {
        return 'CSE';
      }
      if (p.role === 'parent') {
        return 'GUARDIAN';
      }
      return 'ADMIN';
    };
  }, [students]);

  // Available Department Filter Options
  const departmentFilterOptions = useMemo(() => {
    const baseOptions: { value: string; label: string }[] = [
      { value: 'all', label: 'All Academic Departments' },
      { value: 'CSE', label: 'CSE · Computer Science & Engg.' },
      { value: 'ECE', label: 'ECE · Electronics & Comm.' },
      { value: 'ME', label: 'ME · Mechanical Engineering' },
      { value: 'CE', label: 'CE · Civil Engineering' },
      { value: 'IT', label: 'IT · Information Technology' },
      { value: 'EEE', label: 'EEE · Electrical & Electronics' },
      { value: 'ADMIN', label: 'ADMIN · Administration & Finance' },
    ];
    const knownValues = new Set(baseOptions.map((o) => o.value.toUpperCase()));
    if (Array.isArray(profiles)) {
      profiles.forEach((p) => {
        const dept = getProfileDepartment(p);
        if (dept && !knownValues.has(dept.toUpperCase())) {
          knownValues.add(dept.toUpperCase());
          baseOptions.push({ value: dept, label: dept });
        }
      });
    }
    return baseOptions;
  }, [profiles, getProfileDepartment]);

  // Filtered Users for Registry Table (Scoped to this College)
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Security: Only show profiles belonging to this Organizer's college code
      if (
        currentProfile?.college_code &&
        p.college_code &&
        (p.college_code || '').trim().toUpperCase() !== (currentProfile.college_code || '').trim().toUpperCase() &&
        p.role !== 'super_admin' // Super admins might be global in some views, but here we scope
      ) {
        return false;
      }

      const resolvedDept = getProfileDepartment(p);
      const q = userSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        ROLE_LABELS[p.role].toLowerCase().includes(q) ||
        (p.college_code || '').toLowerCase().includes(q) ||
        (p.identifier_no || '').toLowerCase().includes(q) ||
        resolvedDept.toLowerCase().includes(q) ||
        (p.department || '').toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      const matchesDept =
        departmentFilter === 'all' ||
        resolvedDept.toUpperCase() === departmentFilter.toUpperCase();
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [profiles, userSearch, roleFilter, departmentFilter, statusFilter, getProfileDepartment, currentProfile?.college_code]);

  // Unified list of registered students in THIS college
  const registeredCollegeStudents: CombinedStudentDossier[] = useMemo(() => {
    const studentProfiles = profiles.filter(
      (p) =>
        p.role === 'student' &&
        (!currentProfile?.college_code ||
          (p.college_code || '').toUpperCase() === currentProfile.college_code.toUpperCase())
    );
    const byProfileId = new Map<string, StudentRecord>();
    students.forEach((s) => {
      byProfileId.set(s.profile_id, s);
    });

    const combined: CombinedStudentDossier[] = studentProfiles.map((p) => {
      const stu = byProfileId.get(p.id);
      return {
        id: stu?.id || p.id,
        profileId: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone || stu?.phone || '—',
        enrolment_no: p.identifier_no || stu?.enrolment_no || 'UNASSIGNED',
        college_code: p.college_code || primaryActiveCode.code,
        college_name: p.college_name || primaryActiveCode.collegeName,
        batch_label: stu?.batch_label || 'B.Tech 2026 Cohort',
        department_code: p.department || stu?.department_code || 'CSE',
        current_semester: stu?.current_semester || 6,
        attendance_pct: stu?.attendance_pct ?? 88,
        cgpa: stu?.cgpa ?? 8.4,
        status: p.status,
        mentor_id: stu?.mentor_id,
        mentor_name: stu?.mentor_name,
        created_at: p.created_at,
      };
    });

    const seenProfileIds = new Set(studentProfiles.map((p) => p.id));
    students.forEach((stu) => {
      // Check if student record belongs to this college (if we have a way to know from StudentRecord, or fallback to profile)
      const stuProfile = profiles.find(p => p.id === stu.profile_id);
      const stuCollegeCode = stuProfile?.college_code || '';
      
      if (!seenProfileIds.has(stu.profile_id)) {
        if (
          currentProfile?.college_code && 
          stuCollegeCode.toUpperCase() !== currentProfile.college_code.toUpperCase()
        ) {
          return;
        }

        combined.push({
          id: stu.id,
          profileId: stu.profile_id,
          full_name: stu.full_name,
          email: stu.email,
          phone: stu.phone || '—',
          enrolment_no: stu.enrolment_no,
          college_code: primaryActiveCode.code,
          college_name: primaryActiveCode.collegeName,
          batch_label: stu.batch_label || 'B.Tech Cohort',
          department_code: stu.department_code || 'CSE',
          current_semester: stu.current_semester || 6,
          attendance_pct: stu.attendance_pct,
          cgpa: stu.cgpa,
          status: 'active',
          mentor_id: stu.mentor_id,
          mentor_name: stu.mentor_name,
        });
      }
    });

    return combined;
  }, [profiles, students, primaryActiveCode.code, primaryActiveCode.collegeName, currentProfile?.college_code]);

  const openStudentDossier = useCallback((stu: CombinedStudentDossier) => {
    setSelectedStudentDossier(stu);
    setDossierAttendance(String(stu.attendance_pct));
    setDossierCgpa(String(stu.cgpa));
    setDossierDept(stu.department_code);
    setDossierSem(String(stu.current_semester));
    setDossierEnrolment(stu.enrolment_no);
  }, []);

  const openEditUserModal = useCallback((user: Profile) => {
    setSelectedUserModal(user);
    setEditUserName(user.full_name);
    setEditUserRole(user.role);
    setEditUserStatus(user.status);
    setEditUserDept(getProfileDepartment(user));
  }, [getProfileDepartment]);

  const handleQuickAdjust = useCallback((id: string, next: number) => {
    if (onUpdateStudentRecord) {
      onUpdateStudentRecord(id, { attendance_pct: next });
      onToast(`Updated student attendance to ${next}%.`);
    }
  }, [onUpdateStudentRecord, onToast]);

  const handleSendReminder = useCallback((name: string) => {
    onToast(`Dispatched overdue fee reminder to ${name} and linked parent.`);
  }, [onToast]);

  const handleResolveTicket = useCallback((id: string) => {
    const reply = ticketReplies[id]?.trim() || `Reviewed and resolved by ${welcomeDisplayName}.`;
    onResolveTicket(id, reply);
    onToast(`Resolved ticket and notified student.`);
  }, [ticketReplies, welcomeDisplayName, onResolveTicket, onToast]);

  const handleUpdateCgpa = useCallback((id: string, cgpa: number) => {
    if (onUpdateStudentRecord) {
      onUpdateStudentRecord(id, { cgpa });
    }
  }, [onUpdateStudentRecord]);

  const handleLeaveCommentChange = useCallback((id: string, val: string) => {
    setLeaveComments((prev) => ({ ...prev, [id]: val }));
  }, []);

  const handleDecideLeave = useCallback((id: string, decision: 'approved' | 'rejected') => {
    const lv = leaveRequests.find(l => l.id === id);
    if (onDecideLeave && lv) {
      onDecideLeave(
        id,
        'hod',
        decision,
        leaveComments[id]?.trim() ||
          `${decision === 'approved' ? 'Approved & Permitted' : 'Declined'} by ${welcomeDisplayName}.`
      );
      onToast(`${decision === 'approved' ? 'Approved' : 'Rejected'} leave for ${lv.applicant_name}.`);
    }
  }, [onDecideLeave, leaveComments, welcomeDisplayName, onToast, leaveRequests]);

  const handleTicketReplyChange = useCallback((id: string, val: string) => {
    setTicketReplies((prev) => ({ ...prev, [id]: val }));
  }, []);

  const exportRegistryCSV = useCallback(() => {
    const header = 'Full_Name,Email,Role,Department,Identifier_No,College_Code,Status\n';
    const rows = filteredProfiles
      .map(
        (p) =>
          `"${p.full_name}","${p.email}","${ROLE_LABELS[p.role]}","${getProfileDepartment(
            p
          )}","${p.identifier_no || ''}","${p.college_code || primaryActiveCode.code}","${
            p.status
          }"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `College_User_Registry_${primaryActiveCode.code}.csv`;
    a.click();
    onToast(`Exported ${filteredProfiles.length} user records to CSV.`);
  }, [filteredProfiles, getProfileDepartment, primaryActiveCode.code, onToast]);

  // Real-time personal name for Dashboard Welcome Header


  // Shared 360° Student Dossier Modal JSX (rendered wherever needed)
  const renderStudentDossierModal = () => {
    if (!selectedStudentDossier) return null;
    const stu = selectedStudentDossier;

    const fullStudentRecord: StudentRecord = {
      id: stu.id,
      profile_id: stu.profileId,
      enrolment_no: dossierEnrolment || stu.enrolment_no,
      full_name: stu.full_name,
      email: stu.email,
      phone: stu.phone,
      batch_id: 'batch-cse-6a',
      batch_label: stu.batch_label,
      department_id: 'dept-cse',
      department_code: dossierDept || stu.department_code,
      current_semester: Number(dossierSem) || stu.current_semester,
      attendance_pct: Number(dossierAttendance) || stu.attendance_pct,
      cgpa: Number(dossierCgpa) || stu.cgpa,
      sgpa: Number(dossierCgpa) || stu.cgpa,
      fee_status: 'paid',
      mentor_id: 'fac-1',
      guardian_name: 'Registered Guardian',
    };

    return (
      <ModalDialog
        open={Boolean(selectedStudentDossier)}
        onClose={() => setSelectedStudentDossier(null)}
        title={`Student 360° Dossier — ${stu.full_name}`}
        // Removed enrolment/code from description as it's in the identity card
        description="Unified academic performance, identity verification, and record management."
      >
        <div className="space-y-6 max-h-[78vh] overflow-y-auto pr-2 pb-8 scrollbar-thin">
          {/* Profile Identity & Status Card */}
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-center gap-5">
                <Avatar name={stu.full_name} size="xl" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-[var(--text)]">{stu.full_name}</span>
                    <Badge
                      tone={
                        stu.status === 'active'
                          ? 'success'
                          : stu.status === 'pending'
                            ? 'warning'
                            : 'danger'
                      }
                      dot
                    >
                      {stu.status === 'active'
                        ? 'Approved'
                        : stu.status === 'pending'
                          ? 'Pending'
                          : 'Suspended'}
                    </Badge>
                  </div>
                  <div className="flex flex-col text-[13px] text-[var(--text-2)] font-medium gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> {stu.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Enrolment: <span className="font-mono font-bold text-[var(--text)]">{stu.enrolment_no}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-text)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-full border border-[var(--accent-border)]">
                  {stu.college_code}
                </div>
                <div 
                  title={stu.college_name}
                  className="text-xs font-bold text-[var(--text-muted)] max-w-[240px] truncate"
                >
                  {stu.college_name}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-[var(--border)] flex items-center justify-between">
              <div className="text-xs text-[var(--text-muted)] font-medium italic">
                Joined: {stu.created_at ? new Date(stu.created_at).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}
              </div>
              
              <div className="flex items-center gap-2">
                {stu.status === 'active' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (onUpdateAnyProfile) {
                        onUpdateAnyProfile(stu.profileId, { status: 'pending' });
                        setSelectedStudentDossier({ ...stu, status: 'pending' });
                        onToast(`Access locked for ${stu.full_name}.`);
                      }
                    }}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Lock Access
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={approvingId === stu.profileId}
                    onClick={() => {
                      setApprovingId(stu.profileId);
                      onVerifyPendingStudent(stu.profileId);
                      setSelectedStudentDossier({ ...stu, status: 'active' });
                      onToast(`Student ${stu.full_name} has been approved.`);
                      setTimeout(() => setApprovingId(null), 1500);
                    }}
                  >
                    <CheckCircle2 className={`h-3.5 w-3.5 ${approvingId === stu.profileId ? 'animate-spin' : ''}`} />
                    {approvingId === stu.profileId ? 'Processing...' : 'Approve Student'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Academic Controls & PDF Exports */}
          <div className="space-y-6 rounded-[16px] border border-[var(--border)] p-5 bg-[var(--surface)] shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[var(--accent)]" />
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-2)]">
                  Academic Performance & Records
                </div>
              </div>
              <Badge tone="accent" dot>Admin Overrides</Badge>
            </div>
            
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-4">
                <Input
                  label="Registration / Enrolment ID"
                  value={dossierEnrolment}
                  onChange={(e) => setDossierEnrolment(e.target.value.toUpperCase())}
                />
                <Input
                  label="Academic Department"
                  value={dossierDept}
                  onChange={(e) => setDossierDept(e.target.value.toUpperCase())}
                />
                <Input
                  label="Current Semester"
                  type="number"
                  value={dossierSem}
                  onChange={(e) => setDossierSem(e.target.value)}
                />
              </div>
              <div className="space-y-4">
                <Input
                  label="Attendance Percentage (%)"
                  type="number"
                  value={dossierAttendance}
                  onChange={(e) => setDossierAttendance(e.target.value)}
                />
                <Input
                  label="Cumulative CGPA (Scale 10.0)"
                  type="number"
                  step="0.01"
                  value={dossierCgpa}
                  onChange={(e) => setDossierCgpa(e.target.value)}
                />
                
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-2 block">Document Generation</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        generateReportCardPDF(
                          fullStudentRecord,
                          subjects,
                          Number(dossierSem),
                          primaryActiveCode.collegeName,
                          primaryActiveCode.code
                        );
                        onToast("Generating Grade Card PDF...");
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Grade Card
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        generateHallTicketPDF(
                          fullStudentRecord,
                          subjects,
                          primaryActiveCode.collegeName,
                          primaryActiveCode.code
                        );
                        onToast("Generating Hall Ticket PDF...");
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Hall Ticket
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2">
              <Button
                variant="primary"
                className="w-full py-2.5 shadow-md shadow-[var(--accent-soft)]"
                size="md"
                onClick={() => {
                  if (onUpdateStudentRecord) {
                    onUpdateStudentRecord(stu.id, {
                      department_code: dossierDept,
                      current_semester: Number(dossierSem),
                      attendance_pct: Number(dossierAttendance),
                      cgpa: Number(dossierCgpa),
                      enrolment_no: dossierEnrolment,
                    });
                    onToast(`Academic records updated for ${stu.full_name}.`);
                  }
                }}
              >
                <Save className="h-4 w-4" />
                Save Academic Updates
              </Button>
            </div>
          </div>
        </div>
      </ModalDialog>
    );
  };

  // ===========================================================================
  // ACCOUNTS OFFICER VIEWS
  // ===========================================================================
  if (role === 'accounts') {
    const totalCollectedPaise = payments.reduce((a, b) => a + b.amount_paise, 0);
    const overdueAssignments = feeAssignments.filter((f) => f.status === 'overdue');

    if (activeNav === 'notices') {
      return (
        <div className="space-y-6">
          <PageHeader
            eyebrow="INSTITUTIONAL CIRCULARS"
            title="Official College Announcements & Fee Notices"
            subtitle="Publish fee due circulars or inspect institutional announcements."
            actions={
              <Button variant="primary" size="sm" onClick={() => setNoticeModalOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Publish Fee Notice
              </Button>
            }
          />
          {notices.length === 0 ? (
            <EmptyState
              title="No Circulars Published Yet"
              description="Click 'Publish Fee Notice' above to broadcast a circular."
            />
          ) : (
            <div className="space-y-3">
              {notices.map((n) => (
                <NoticeCard key={n.id} n={n} onClick={setSelectedNoticeDetail} />
              ))}
            </div>
          )}
          <NoticeDetailModal
            notice={selectedNoticeDetail}
            onClose={() => setSelectedNoticeDetail(null)}
          />
        </div>
      );
    }

    if (activeNav === 'dashboard' || activeNav === 'dues' || activeNav === 'reports') {
      return (
        <div className="space-y-6">
          <PageHeader
            eyebrow="ACCOUNTS & TREASURY OFFICE"
            title={`Welcome back, ${welcomeDisplayName}`}
            subtitle={`${primaryActiveCode.collegeName} (${primaryActiveCode.code}) · Integer-Paise Fee & Receipt Ledger`}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    exportFeeReceiptCSV(payments);
                    onToast('Exported complete fee receipt ledger to CSV.');
                  }}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export Ledger CSV
                </Button>
                <Button variant="primary" size="sm" onClick={() => onNavigate('payments')}>
                  <Plus className="h-3.5 w-3.5" />
                  Issue Receipt
                </Button>
              </div>
            }
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
            <StatTile
              label="Total Collected"
              value={formatPaiseToINR(totalCollectedPaise)}
              icon={CheckCircle2}
              tone="success"
              footerText={`${totalCollectedPaise.toLocaleString('en-IN')} integer paise`}
            />
            <StatTile
              label="Overdue Accounts"
              value={overdueAssignments.length}
              icon={Bell}
              tone={overdueAssignments.length > 0 ? 'danger' : 'success'}
              footerText="Automated T+1 reminders active"
              emptyHint="No overdue accounts ✓"
            />
            <StatTile
              label="Receipts Issued"
              value={payments.length}
              icon={BookOpen}
              tone="accent"
              footerText="Sequential & immutable"
              emptyHint="No receipts issued yet"
              ctaLabel="Record →"
              onCtaClick={() => onNavigate('payments')}
            />
            <StatTile
              label="Hall Ticket Gate"
              value={settings.block_hall_ticket_on_overdue_fees ? 'Enforced' : 'Permissive'}
              icon={ShieldCheck}
              tone="warning"
              footerText="Overdue clearance rule"
            />
          </div>

          {/* Overdue List with One-Click Reminder */}
          <GlassCard className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--glass-border-subtle)] pb-4">
              <div>
                <h2 className="font-editorial text-lg font-bold text-ink">
                  Overdue Fee Ledger &amp; One-Click Due Reminders
                </h2>
                <p className="text-xs text-muted">
                  Reminders dispatch at T-7 days, T-2 days, and T+1 day overdue via in-app notice and email.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => onNavigate('payments')}>
                Record Payment
              </Button>
            </div>

            {(!Array.isArray(overdueAssignments) || overdueAssignments.length === 0) ? (
              <div className="rounded-[14px] border border-dashed border-[var(--glass-border-subtle)] p-6 text-center text-xs text-muted">
                No overdue fee accounts recorded.
              </div>
            ) : (
              <div className="divide-y divide-[var(--glass-border-subtle)]">
                {(Array.isArray(overdueAssignments) ? overdueAssignments : []).map((item) => (
                  <OverdueAssignmentRow
                    key={item.id}
                    item={item}
                    payments={payments}
                    onSendReminder={handleSendReminder}
                  />
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      );
    }

    if (activeNav === 'fee-structures' || activeNav === 'assignments') {
      return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <GlassCard equalHeight className="space-y-4 lg:col-span-5">
            <h2 className="font-editorial text-lg font-bold text-ink">
              Define Fee Structure (Integer Paise)
            </h2>
            <Input
              label="Fee Structure Title"
              value={newStructTitle}
              onChange={(e) => setNewStructTitle(e.target.value)}
              placeholder="e.g., Spring Semester 6 Tuition Fee"
            />
            <Select
              label="Category"
              value={newStructCat}
              onChange={(e) => setNewStructCat(e.target.value as FeeStructure['category'])}
              options={[
                { value: 'tuition', label: 'Tuition Fee' },
                { value: 'exam', label: 'Examination & Lab Fee' },
                { value: 'hostel', label: 'Hostel & Mess Fee' },
                { value: 'transport', label: 'Campus Transport' },
                { value: 'library', label: 'Library & Periodicals' },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Amount (INR ₹)"
                type="number"
                value={newStructRupees}
                onChange={(e) => setNewStructRupees(e.target.value)}
              />
              <Input
                label="Late Fine / Day (INR ₹)"
                type="number"
                value={newStructFineRupees}
                onChange={(e) => setNewStructFineRupees(e.target.value)}
              />
            </div>
            <Input
              label="Due Date"
              type="date"
              value={newStructDue}
              onChange={(e) => setNewStructDue(e.target.value)}
            />
            <Button
              variant="primary"
              className="w-full mt-auto"
              onClick={() => {
                if (!newStructTitle.trim()) return;
                onAddFeeStructure({
                  course_id: 'course-btech-cse',
                  year: 3,
                  category: newStructCat,
                  title: newStructTitle,
                  amount_paise: rupeesToPaise(Number(newStructRupees) || 0),
                  due_date: newStructDue,
                  fine_per_day_paise: rupeesToPaise(Number(newStructFineRupees) || 0),
                });
                setNewStructTitle('');
                onToast('Fee structure added in exact integer paise.');
              }}
            >
              Create Fee Structure
            </Button>
          </GlassCard>

          <GlassCard equalHeight className="space-y-4 lg:col-span-7">
            <h2 className="font-editorial text-lg font-bold text-ink">
              Active Fee Structures &amp; Batch Assignments
            </h2>
            {feeStructures.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[var(--glass-border-subtle)] p-8 text-center text-xs text-muted my-auto">
                No fee structures defined yet. Create a fee structure on the left to begin.
              </div>
            ) : (
              <div className="space-y-3">
                {feeStructures.map((fs) => (
                  <FeeStructureCard key={fs.id} fs={fs} />
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      );
    }

    // PAYMENTS & IMMUTABLE RECEIPTS + REVERSAL ENTRY
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <GlassCard equalHeight className="space-y-4 lg:col-span-5">
            <h2 className="font-editorial text-lg font-bold text-ink">
              Record Fee Payment &amp; Issue Receipt
            </h2>
            <Select
              label="Student Fee Assignment"
              value={payAssignmentId}
              onChange={(e) => setPayAssignmentId(e.target.value)}
              options={Array.from(new Map(feeAssignments.map(fa => [fa.id, fa])).values()).map((fa) => ({
                value: fa.id,
                label: `${fa.enrolment_no} · ${fa.student_name} (${fa.title})`,
              }))}
            />
            <Input
              label="Amount Received (INR ₹)"
              type="number"
              value={payRupees}
              onChange={(e) => setPayRupees(e.target.value)}
            />
            <Select
              label="Payment Mode"
              value={payMode}
              onChange={(e) => setPayMode(e.target.value as PaymentRecord['mode'])}
              options={[
                { value: 'upi', label: 'UPI Verified Reference' },
                { value: 'bank_transfer', label: 'NEFT / RTGS Bank Transfer' },
                { value: 'cash', label: 'Cash Counter Challan' },
                { value: 'gateway', label: 'Razorpay Test Gateway' },
              ]}
            />
            <Input
              label="Transaction / Challan Reference"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
            />
            <Button
              variant="primary"
              className="w-full mt-auto"
              onClick={() => {
                const paise = rupeesToPaise(Number(payRupees) || 0);
                if (paise <= 0) return;
                onRecordPayment(payAssignmentId, paise, payMode, payRef);
                setPayRupees('');
                setPayRef('');
                onToast('Payment recorded and numbered immutable receipt issued.');
              }}
            >
              Issue Numbered Receipt
            </Button>
          </GlassCard>

          <GlassCard equalHeight className="space-y-4 lg:col-span-7 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--glass-border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-lg font-bold text-ink">
                  Immutable Receipt Register ({payments.length})
                </h2>
                <Badge tone="accent">Sequential Ledger</Badge>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  exportFeeReceiptCSV(payments);
                  onToast('Exported fee receipts to CSV.');
                }}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV
              </Button>
            </div>
            <div className="max-h-[380px] overflow-y-auto pr-1 scrollbar-thin border border-[var(--glass-border-subtle)] rounded-[10px]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--surface-2)] z-10 border-b border-[var(--glass-border-subtle)] text-xs text-muted backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-3 font-medium">Receipt &amp; Date</th>
                    <th className="px-4 py-3 font-medium">Student Details</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--glass-border-subtle)]">
                  {payments.map((p) => (
                    <FeeReceiptRow
                      key={p.id}
                      p={p}
                      onViewReceipt={(receipt) => setSelectedReceiptModal(receipt)}
                      onGeneratePDF={(receipt) =>
                        generateFeeReceiptPDF(
                          receipt,
                          primaryActiveCode.collegeName,
                          primaryActiveCode.code
                        )
                      }
                      onSetReversalTarget={setReversalTarget}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        <ModalDialog
          open={Boolean(reversalTarget)}
          onClose={() => setReversalTarget(null)}
          title="Issue Formal Payment Reversal Entry"
          description="Receipts cannot be edited or deleted. Issuing a reversal creates an offsetting ledger row and writes to audit_logs."
        >
          {reversalTarget && (
            <div className="space-y-4">
              <div className="rounded-[12px] border border-[var(--glass-border-subtle)] p-3 font-mono text-xs">
                Reversing Receipt: {reversalTarget.receipt_no} (
                {formatPaiseToINR(reversalTarget.amount_paise)})
              </div>
              <Input
                label="Mandatory Reason for Audit Trail"
                placeholder="e.g., Duplicate UPI reference entry; re-booking under correct head"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setReversalTarget(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    onReversePayment(
                      reversalTarget.id,
                      reversalReason || 'Administrative reversal entry'
                    );
                    setReversalTarget(null);
                    setReversalReason('');
                    onToast('Reversal receipt generated and logged to audit_logs.');
                  }}
                >
                  Confirm Reversal Entry
                </Button>
              </div>
            </div>
          )}
        </ModalDialog>
      </div>
    );
  }

  // ===========================================================================
  // ADMIN & SUPER ADMIN (COLLEGE ORGANIZER) WORKSPACE
  // ===========================================================================
  const activeCollegeCode = (currentProfile?.college_code || '').trim().toUpperCase();

  const collegeProfiles = profiles.filter(
    (p) => 
      (p.college_code || '').trim().toUpperCase() === activeCollegeCode || 
      p.id === currentProfile?.id ||
      (currentProfile?.role === 'super_admin' && p.status === 'pending')
  );

  const pendingProfiles = collegeProfiles.filter((p) => p.status === 'pending');
  const activeProfilesCount = collegeProfiles.filter((p) => p.status === 'active').length;
  const suspendedProfilesCount = collegeProfiles.filter((p) => p.status === 'suspended').length;
  const studentProfilesCount = registeredCollegeStudents.length;
  const facultyProfilesCount = collegeProfiles.filter(
    (p) => p.role === 'faculty' || p.role === 'hod'
  ).length;
  const totpEnabledCount = collegeProfiles.filter((p) => p.totp_enabled).length;
  const totpCoveragePct =
    collegeProfiles.length > 0 ? Math.round((totpEnabledCount / collegeProfiles.length) * 100) : 100;

  const formattedCurrentDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  // Students / Staff who joined using the Organizer's college code
  const joinedMembersWithCode = collegeProfiles.filter(
    (p) => p.role !== 'super_admin' && (p.college_code || '').trim().toUpperCase() === activeCollegeCode
  );

  // ===========================================================================
  // DEDICATED PAGE: USER & ROLE REGISTRY (activeNav === 'users' || activeNav === 'admin-users')
  // ===========================================================================
  if (activeNav === 'users' || activeNav === 'admin-users') {
    const roleCounts = {
      student: profiles.filter((p) => p.role === 'student').length,
      faculty: profiles.filter((p) => p.role === 'faculty').length,
      hod: profiles.filter((p) => p.role === 'hod').length,
      admin: profiles.filter((p) => p.role === 'admin' || p.role === 'super_admin').length,
      accounts: profiles.filter((p) => p.role === 'accounts').length,
      parent: profiles.filter((p) => p.role === 'parent').length,
    };



    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={`INSTITUTIONAL DIRECTORY · ${primaryActiveCode.code}`}
          title="User & Role Registry · Student Approvals & Access Control"
          subtitle="Dedicated directory of all students, faculty, HODs, and administrators. Click any student or user row to open their 360° profile dossier."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {pendingProfiles.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    pendingProfiles.forEach((p) => onVerifyPendingStudent(p.id));
                    onToast(
                      `Approved all ${pendingProfiles.length} pending student/user account(s)!`
                    );
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve All Pending ({pendingProfiles.length})
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={exportRegistryCSV}>
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                + Add / Invite User
              </Button>
            </div>
          }
        />

        {/* Role Breakdown Interactive Filter Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { id: 'all', label: 'All Members', count: profiles.length },
            { id: 'student', label: 'Students', count: roleCounts.student },
            { id: 'faculty', label: 'Teachers / Faculty', count: roleCounts.faculty },
            { id: 'hod', label: 'HODs', count: roleCounts.hod },
            { id: 'admin', label: 'Admins & Organizer', count: roleCounts.admin },
            { id: 'accounts', label: 'Accounts & Parents', count: roleCounts.accounts + roleCounts.parent },
          ].map((rc) => {
            const active = roleFilter === rc.id;
            return (
              <button
                key={rc.id}
                type="button"
                onClick={() => setRoleFilter(rc.id)}
                className={`rounded-[12px] border p-3.5 text-left transition-all cursor-pointer ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {rc.label}
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-[var(--text)]">
                  {rc.count}
                </div>
              </button>
            );
          })}
        </div>

        {/* Pending Student Approval Banner */}
        {pendingProfiles.length > 0 && (
          <GlassCard className="border-amber-500/40 bg-amber-500/5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-sm font-bold text-[var(--text)]">
                  {pendingProfiles.length} Student(s) / User(s) Waiting for Organizer Approval
                </h3>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                Click any row to inspect details before approving
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {pendingProfiles.map((p) => (
                <PendingApprovalRow
                  key={p.id}
                  p={p}
                  onOpenEdit={openEditUserModal}
                  onApprove={onVerifyPendingStudent}
                  approvingId={approvingId}
                  primaryActiveCode={primaryActiveCode.code}
                />
              ))}
            </div>
          </GlassCard>
        )}

        {/* Main Filterable User & Role Registry Table */}
        <GlassCard padding="none" className="overflow-hidden">
          <div className="border-b border-[var(--border)] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-editorial text-lg font-bold text-[var(--text)]">
                  Complete Institutional User &amp; Role Registry ({filteredProfiles.length} of{' '}
                  {profiles.length})
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Click any student or staff row to inspect full details, academic metrics, or modify role permissions.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <Badge tone="success" dot>
                  {activeProfilesCount} Approved
                </Badge>
                <Badge tone="warning" dot>
                  {pendingProfiles.length} Pending
                </Badge>
                <Badge tone="danger" dot>
                  {suspendedProfilesCount} Suspended
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-3">
                <Input
                  placeholder="Search name, email, ID, dept..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <Select
                  aria-label="Filter by Institutional Role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Institutional Roles' },
                    { value: 'student', label: 'Student' },
                    { value: 'faculty', label: 'Teacher / Faculty' },
                    { value: 'hod', label: 'Head of Department (HOD)' },
                    { value: 'admin', label: 'College Admin' },
                    { value: 'super_admin', label: 'College Organizer' },
                    { value: 'accounts', label: 'Accounts Officer' },
                    { value: 'parent', label: 'Parent / Guardian' },
                  ]}
                />
              </div>
              <div className="md:col-span-3">
                <Select
                  aria-label="Filter by Academic Department"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  options={departmentFilterOptions}
                />
              </div>
              <div className="md:col-span-3">
                <Select
                  aria-label="Filter by Account Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Account Statuses' },
                    { value: 'pending', label: 'Pending Organizer Approval' },
                    { value: 'active', label: 'Approved & Active' },
                    { value: 'suspended', label: 'Suspended / Rejected' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredProfiles.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="font-editorial text-base font-bold text-ink">
                  No matching user profiles found
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setUserSearch('');
                    setRoleFilter('all');
                    setDepartmentFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="px-6 py-3.5 min-w-[200px]">User &amp; ID</th>
                    <th className="px-4 py-3.5 min-w-[180px]">Email &amp; Phone</th>
                    <th className="px-4 py-3.5 min-w-[240px]">Role, Dept &amp; College Code</th>
                    <th className="px-4 py-3.5 min-w-[120px]">Two-Factor</th>
                    <th className="px-4 py-3.5 min-w-[140px]">Approval Status</th>
                    <th className="px-6 py-3.5 text-right min-w-[180px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredProfiles.map((p) => (
                    <UserRegistryRow
                      key={p.id}
                      p={p}
                      deptCode={getProfileDepartment(p)}
                      primaryActiveCode={primaryActiveCode.code}
                      onOpenEdit={openEditUserModal}
                      onUpdateAnyProfile={onUpdateAnyProfile}
                      onVerifyPending={onVerifyPendingStudent}
                      onSuspend={setSuspendConfirmUser}
                      onToast={onToast}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </GlassCard>

        {renderStudentDossierModal()}

        {/* Invite User Modal */}
        <ModalDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          title="Invite or Add Institutional User"
          description={`Creates a verified account linked to ${primaryActiveCode.collegeName} (${primaryActiveCode.code}).`}
        >
          <div className="space-y-4">
            <Input
              label="Full Name *"
              placeholder="e.g., Dr. Kavita Nair or Aarav Sharma"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
            <Input
              label="Email Address *"
              type="email"
              placeholder="user@college.edu"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Select
              label="Assign Institutional Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              options={[
                { value: 'student', label: 'Student' },
                { value: 'faculty', label: 'Teacher / Faculty' },
                { value: 'hod', label: 'Head of Department (HOD)' },
                { value: 'admin', label: 'College Admin' },
                { value: 'accounts', label: 'Accounts Officer' },
              ]}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!inviteName.trim() || !inviteEmail.includes('@')) return;
                  onInviteUser(inviteEmail.trim(), inviteName.trim(), inviteRole);
                  setInviteName('');
                  setInviteEmail('');
                  setInviteOpen(false);
                  onToast(
                    `Added ${inviteName.trim()} (${ROLE_LABELS[inviteRole]}) to your college platform.`
                  );
                }}
              >
                Create &amp; Add User
              </Button>
            </div>
          </div>
        </ModalDialog>

        {/* Manage Staff User Modal */}
        <ModalDialog
          open={Boolean(selectedUserModal)}
          onClose={() => setSelectedUserModal(null)}
          title="Manage Institutional User Profile"
          description="Update role assignment, department, or approval status."
        >
          {selectedUserModal && (
            <div className="space-y-4">
              <Input
                label="Full Name"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
              />
              <Input
                label="Department / Unit"
                value={editUserDept}
                onChange={(e) => setEditUserDept(e.target.value)}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label="Assigned Role"
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                  options={[
                    { value: 'student', label: 'Student' },
                    { value: 'faculty', label: 'Teacher / Faculty' },
                    { value: 'hod', label: 'Head of Department' },
                    { value: 'accounts', label: 'Accounts Officer' },
                    { value: 'admin', label: 'College Admin' },
                    { value: 'super_admin', label: 'College Organizer' },
                    { value: 'parent', label: 'Parent / Guardian' },
                  ]}
                />
                <Select
                  label="Approval Status"
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value as AccountStatus)}
                  options={[
                    { value: 'active', label: 'Approved & Active' },
                    { value: 'pending', label: 'Pending Organizer Approval' },
                    { value: 'suspended', label: 'Suspended / Rejected' },
                  ]}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedUserModal(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (onUpdateAnyProfile && selectedUserModal) {
                      onUpdateAnyProfile(selectedUserModal.id, {
                        full_name: editUserName.trim() || selectedUserModal.full_name,
                        display_name: editUserName.trim() || selectedUserModal.full_name,
                        role: editUserRole,
                        status: editUserStatus,
                        department: editUserDept.trim(),
                      });
                      onToast(`Updated profile settings for ${editUserName}.`);
                    }
                    setSelectedUserModal(null);
                  }}
                >
                  Save User Changes
                </Button>
              </div>
            </div>
          )}
        </ModalDialog>

        {/* Suspend / Activate Confirmation Dialog */}
        <ModalDialog
          open={Boolean(suspendConfirmUser)}
          onClose={() => setSuspendConfirmUser(null)}
          title={
            suspendConfirmUser?.status === 'suspended'
              ? 'Reactivate User Account'
              : 'Suspend User Account'
          }
          description="This action immediately updates session permissions."
        >
          {suspendConfirmUser && (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Confirm status change for <strong>{suspendConfirmUser.full_name}</strong> (
                <code className="font-mono">{suspendConfirmUser.email}</code>)?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSuspendConfirmUser(null)}>
                  Cancel
                </Button>
                <Button
                  variant={suspendConfirmUser.status === 'suspended' ? 'primary' : 'danger'}
                  size="sm"
                  onClick={() => {
                    const nextStatus: AccountStatus =
                      suspendConfirmUser.status === 'suspended' ? 'active' : 'suspended';
                    if (onUpdateAnyProfile) {
                      onUpdateAnyProfile(suspendConfirmUser.id, { status: nextStatus });
                    }
                    onToast(
                      `${suspendConfirmUser.full_name} status set to ${nextStatus.toUpperCase()}.`
                    );
                    setSuspendConfirmUser(null);
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </ModalDialog>
      </div>
    );
  }

  // ===========================================================================
  // DEDICATED PAGE: SUBJECT MANAGEMENT (activeNav === 'subjects')
  // ===========================================================================
  if (activeNav === 'subjects') {
    const collegeSubjects = subjects.filter(
      (s) => !s.college_code || s.college_code.trim().toUpperCase() === primaryActiveCode.code
    );
    const filteredSubjects = collegeSubjects.filter((s) => {
      const matchesSearch =
        s.code.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        (s.faculty_name && s.faculty_name.toLowerCase().includes(subjectSearch.toLowerCase()));
      const matchesDept = subjectDeptFilter === 'ALL' || s.department === subjectDeptFilter;
      return matchesSearch && matchesDept;
    });

    const openAddSubjectModal = () => {
      setEditingSubject(null);
      setSubjCode('');
      setSubjName('');
      setSubjDept('CSE');
      setSubjSem(1);
      setSubjSec('A');
      setSubjCredits(3);
      setSubjType('theory');
      setSubjFacultyId(SEED_FACULTY[0]?.id || 'fac-1');
      setSubjDesc('');
      setSubjStatus('active');
      setSubjError(null);
      setSubjectModalOpen(true);
    };

    const openEditSubjectModal = (sub: Subject) => {
      setEditingSubject(sub);
      setSubjCode(sub.code);
      setSubjName(sub.name);
      setSubjDept(sub.department || 'CSE');
      setSubjSem(sub.semester || 1);
      setSubjSec(sub.section || 'A');
      setSubjCredits(sub.credits || 3);
      setSubjType((sub.type as any) || 'theory');
      setSubjFacultyId(sub.faculty_id || SEED_FACULTY[0]?.id || 'fac-1');
      setSubjDesc(sub.description || '');
      setSubjStatus(sub.status || 'active');
      setSubjError(null);
      setSubjectModalOpen(true);
    };

    const handleSaveSubjectSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubjError(null);
      const cleanCode = subjCode.trim().toUpperCase();
      const cleanName = subjName.trim();

      if (!cleanCode || !cleanName) {
        setSubjError('Subject code and subject name are required.');
        return;
      }

      // Check duplicate code
      const duplicate = collegeSubjects.find(
        (s) => s.code.toUpperCase() === cleanCode && (!editingSubject || s.id !== editingSubject.id)
      );
      if (duplicate) {
        setSubjError(`Subject code "${cleanCode}" is already in use by "${duplicate.name}". Subject codes must be unique.`);
        return;
      }

      const assignedFac: any = availableTeachers.find((f) => f.id === subjFacultyId);
      const payload: Partial<Subject> & { code: string; name: string } = {
        ...(editingSubject ? { id: editingSubject.id } : {}),
        code: cleanCode,
        name: cleanName,
        department: subjDept,
        semester: Number(subjSem),
        section: subjSec,
        credits: Number(subjCredits),
        type: subjType,
        faculty_id: subjFacultyId,
        faculty_name: assignedFac?.name || assignedFac?.full_name || 'Assigned Faculty',
        faculty_email: assignedFac?.email || '',
        faculty_cabin: assignedFac?.cabin || '',
        description: subjDesc,
        status: subjStatus,
        college_code: primaryActiveCode.code,
      };

      if (onSaveSubject) {
        const ok = await onSaveSubject(payload);
        if (ok) {
          setSubjectModalOpen(false);
        }
      } else if (onAddSubject) {
        onAddSubject(payload as any);
        setSubjectModalOpen(false);
        onToast(`Subject ${cleanCode} saved.`);
      }
    };

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={`CURRICULUM MANAGEMENT · ${primaryActiveCode.code}`}
          title="Dedicated Subject & Curriculum Management"
          subtitle="Create, configure, and assign academic subjects, courses, and faculty instructors in real time."
          actions={
            <Button variant="primary" size="sm" onClick={openAddSubjectModal}>
              <Plus className="h-3.5 w-3.5" />
              + Add New Subject
            </Button>
          }
        />

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Total Subjects</div>
            <div className="text-2xl font-bold text-ink mt-1">{collegeSubjects.length}</div>
            <div className="text-[11px] text-accent mt-0.5 font-mono">{primaryActiveCode.code} Active Curriculum</div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Active Subjects</div>
            <div className="text-2xl font-bold text-success mt-1">
              {collegeSubjects.filter((s) => s.status !== 'inactive').length}
            </div>
            <div className="text-[11px] text-muted mt-0.5">Visible to Students & Faculty</div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Assigned Faculty</div>
            <div className="text-2xl font-bold text-ink mt-1">
              {new Set(collegeSubjects.map((s) => s.faculty_id).filter(Boolean)).size}
            </div>
            <div className="text-[11px] text-muted mt-0.5">Faculty Members Teaching</div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Departments Covered</div>
            <div className="text-2xl font-bold text-accent mt-1">
              {new Set(collegeSubjects.map((s) => s.department || 'CSE')).size}
            </div>
            <div className="text-[11px] text-muted mt-0.5">Academic Streams</div>
          </GlassCard>
        </div>

        {/* Filter Bar */}
        <GlassCard padding="sm" className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search code, name, teacher..."
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="w-64"
            />
            <Select
              value={subjectDeptFilter}
              onChange={(e) => setSubjectDeptFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Departments' },
                { value: 'CSE', label: 'Computer Science (CSE)' },
                { value: 'ECE', label: 'Electronics (ECE)' },
                { value: 'MECH', label: 'Mechanical (MECH)' },
                { value: 'CIVIL', label: 'Civil Engineering' },
                { value: 'MGMT', label: 'Management' },
              ]}
            />
          </div>
          <div className="text-xs text-muted font-mono">
            Showing {filteredSubjects.length} of {collegeSubjects.length} subjects
          </div>
        </GlassCard>

        {/* Subjects Table */}
        {filteredSubjects.length === 0 ? (
          <GlassCard padding="lg" className="text-center py-12">
            <BookOpen className="h-10 w-10 text-muted mx-auto mb-2 opacity-50" />
            <div className="text-sm font-semibold text-ink">No Subjects Found</div>
            <div className="text-xs text-muted mt-1">
              {subjectSearch ? 'No subjects matched your filter criteria.' : 'Click "+ Add New Subject" above to create your first curriculum record.'}
            </div>
          </GlassCard>
        ) : (
          <GlassCard padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface/50 text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Subject Code & Name</th>
                    <th className="px-5 py-3.5 font-semibold">Department</th>
                    <th className="px-5 py-3.5 font-semibold">Sem / Sec</th>
                    <th className="px-5 py-3.5 font-semibold">Credits & Type</th>
                    <th className="px-5 py-3.5 font-semibold">Assigned Faculty</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredSubjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-surface/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-ink flex items-center gap-2">
                          <span className="font-mono text-accent">{sub.code}</span>
                          <span>·</span>
                          <span>{sub.name}</span>
                        </div>
                        {sub.description && (
                          <div className="text-xs text-muted truncate max-w-xs mt-0.5">{sub.description}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink font-medium">
                        {sub.department || 'CSE'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted font-mono">
                        Sem {sub.semester || 1} · Sec {sub.section || 'A'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink font-mono">
                        {sub.credits || 3} Credits · {sub.type || 'Theory'}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <div className="font-medium text-ink">{sub.faculty_name || 'Unassigned'}</div>
                        <div className="text-[11px] text-muted">{sub.faculty_email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={sub.status === 'inactive' ? 'danger' : 'success'} dot>
                          {sub.status === 'inactive' ? 'Inactive' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditSubjectModal(sub)}
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const nextStatus = sub.status === 'inactive' ? 'active' : 'inactive';
                              if (onSaveSubject) {
                                await onSaveSubject({ id: sub.id, code: sub.code, name: sub.name, status: nextStatus });
                              }
                              onToast(`Subject ${sub.code} marked ${nextStatus}.`);
                            }}
                          >
                            {sub.status === 'inactive' ? 'Activate' : 'Deactivate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* Create / Edit Subject Modal */}
        <ModalDialog
          open={subjectModalOpen}
          onClose={() => setSubjectModalOpen(false)}
          title={editingSubject ? `Edit Subject · ${editingSubject.code}` : 'Create New Academic Subject'}
          description="Subject definitions immediately synchronize with Faculty registers and Student timetables."
        >
          <form onSubmit={handleSaveSubjectSubmit} className="space-y-4">
            {subjError && (
              <div className="rounded-[10px] border border-danger bg-danger/5 p-3 text-xs text-danger font-medium">
                {subjError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Subject Code *"
                placeholder="e.g. CS601"
                value={subjCode}
                onChange={(e) => setSubjCode(e.target.value.toUpperCase())}
                required
                className="font-mono uppercase"
              />
              <Input
                label="Subject Name *"
                placeholder="e.g. Distributed Cloud Systems"
                value={subjName}
                onChange={(e) => setSubjName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Department"
                value={subjDept}
                onChange={(e) => setSubjDept(e.target.value)}
                options={[
                  { value: 'CSE', label: 'Computer Science (CSE)' },
                  { value: 'ECE', label: 'Electronics (ECE)' },
                  { value: 'MECH', label: 'Mechanical (MECH)' },
                  { value: 'CIVIL', label: 'Civil Engineering' },
                  { value: 'MGMT', label: 'Management' },
                ]}
              />
              <Input
                label="Semester (1-8)"
                type="number"
                min={1}
                max={8}
                value={subjSem}
                onChange={(e) => setSubjSem(Number(e.target.value))}
                required
              />
              <Input
                label="Section"
                placeholder="A / B / C"
                value={subjSec}
                onChange={(e) => setSubjSec(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Credits"
                type="number"
                min={1}
                max={12}
                value={subjCredits}
                onChange={(e) => setSubjCredits(Number(e.target.value))}
                required
              />
              <Select
                label="Subject Type"
                value={subjType}
                onChange={(e) => setSubjType(e.target.value as any)}
                options={[
                  { value: 'theory', label: 'Theory' },
                  { value: 'practical', label: 'Lab / Practical' },
                  { value: 'elective', label: 'Department Elective' },
                ]}
              />
              <Select
                label="Status"
                value={subjStatus}
                onChange={(e) => setSubjStatus(e.target.value as any)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>

            <Select
              label="Assigned Faculty Instructor *"
              value={subjFacultyId}
              onChange={(e) => setSubjFacultyId(e.target.value)}
              options={
                availableTeachers.length > 0
                  ? availableTeachers.map((f: any) => ({
                      value: f.id,
                      label: `${f.full_name || f.name} (${f.designation} · ${f.department || f.department_code})`,
                    }))
                  : [{ value: '', label: 'No teachers available' }]
              }
            />

            <Input
              label="Description / Syllabus Summary"
              placeholder="Brief course objectives and syllabus overview..."
              value={subjDesc}
              onChange={(e) => setSubjDesc(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button type="button" variant="secondary" size="sm" onClick={() => setSubjectModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                {editingSubject ? 'Save Changes' : 'Create Subject'}
              </Button>
            </div>
          </form>
        </ModalDialog>
      </div>
    );
  }

  // ===========================================================================
  // DEDICATED PAGE: LEAVE APPROVALS (activeNav === 'leaves' || activeNav === 'leave')
  // ===========================================================================
  if (activeNav === 'leaves' || activeNav === 'leave') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={`LEAVE MANAGEMENT · ${primaryActiveCode.code}`}
          title="Student Leave Applications & Approval Authority"
          subtitle="Review and decide student leave applications for your college. Decisions synchronize with Student and Teacher panels in real time."
        />

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Pending Approvals</div>
            <div className="text-2xl font-bold text-warning mt-1">
              {leaveRequests.filter((l) => l.status === 'Pending Mentor' || l.status === 'Pending HOD').length}
            </div>
            <div className="text-[11px] text-muted mt-0.5">Awaiting Official Decision</div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Approved Leaves</div>
            <div className="text-2xl font-bold text-success mt-1">
              {leaveRequests.filter((l) => l.status === 'Approved').length}
            </div>
            <div className="text-[11px] text-muted mt-0.5">Permit Generated</div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Rejected Applications</div>
            <div className="text-2xl font-bold text-danger mt-1">
              {leaveRequests.filter((l) => l.status === 'Rejected').length}
            </div>
            <div className="text-[11px] text-muted mt-0.5">Attendance Not Excused</div>
          </GlassCard>
        </div>

        {leaveRequests.length === 0 ? (
          <GlassCard padding="lg" className="text-center py-12">
            <div className="text-sm font-semibold text-ink">No Leave Applications Found</div>
            <div className="text-xs text-muted mt-1">When students submit leave requests, they will appear here for review.</div>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {leaveRequests.map((lv) => {
              const isPending = lv.status === 'Pending Mentor' || lv.status === 'Pending HOD';
              return (
                <GlassCard key={lv.id} padding="lg" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                    <div>
                      <span className="font-bold text-ink text-base">{lv.applicant_name}</span>
                      <span className="mx-2 text-muted">·</span>
                      <span className="font-mono text-xs text-muted">{lv.enrolment_no}</span>
                      <span className="mx-2 text-muted">·</span>
                      <span className="text-xs font-semibold text-accent">{lv.type} Leave</span>
                      <span className="mx-2 text-muted">·</span>
                      <span className="font-mono text-xs text-muted">{lv.from_date} to {lv.to_date} ({lv.days_count} days)</span>
                    </div>
                    <Badge
                      tone={
                        lv.status === 'Approved'
                          ? 'success'
                          : lv.status === 'Rejected'
                            ? 'danger'
                            : 'warning'
                      }
                      dot
                    >
                      {lv.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-ink">{lv.reason}</p>

                  {lv.falls_on_exam_day && (
                    <div className="text-xs text-danger font-semibold flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Note: Overlaps with Examination Dates (Escalated Approval)
                    </div>
                  )}

                  {/* Approval Trail */}
                  {(lv.approvals || []).length > 0 && (
                    <div className="rounded-[10px] bg-surface/50 border border-line p-3 text-xs space-y-1">
                      <div className="text-muted font-medium">Decision History:</div>
                      {lv.approvals.map((ap, i) => (
                        <div key={i} className="text-ink">
                          <strong className="text-accent">{ap.step.toUpperCase()} ({ap.approver_name}):</strong>{' '}
                          {ap.decision.toUpperCase()} — &ldquo;{ap.comment}&rdquo;{' '}
                          <span className="text-muted font-mono text-[10px]">({ap.decided_at.slice(0, 10)})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {isPending && (
                    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
                      <Input
                        placeholder="Decision remarks / audit notes..."
                        value={leaveComments[lv.id] || ''}
                        onChange={(e) => setLeaveComments((prev) => ({ ...prev, [lv.id]: e.target.value }))}
                        className="w-72"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (onDecideLeave) {
                            onDecideLeave(
                              lv.id,
                              'hod',
                              'approved',
                              leaveComments[lv.id] || `Approved by College Organizer ${welcomeDisplayName}.`
                            );
                          }
                          onToast(`Approved leave application for ${lv.applicant_name}.`);
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve Leave
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (onDecideLeave) {
                            onDecideLeave(
                              lv.id,
                              'hod',
                              'rejected',
                              leaveComments[lv.id] || 'Rejected due to academic schedule / lack of margin.'
                            );
                          }
                          onToast(`Rejected leave application for ${lv.applicant_name}.`);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // DEDICATED PAGE: FACULTY MENTORING ALLOCATION (activeNav === 'mentor' || activeNav === 'mentees')
  // ===========================================================================
  if (activeNav === 'mentor' || activeNav === 'mentees') {
    const unassignedCount = registeredCollegeStudents.filter((s) => !s.mentor_id).length;
    const pendingMentorRequests = (mentorRequests || []).filter((r) => r.status === 'pending');

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={`FACULTY MENTORING · ${primaryActiveCode.code}`}
          title="Faculty Mentoring & Student Advisor Assignment"
          subtitle="Manage student-faculty advisor assignments, process student mentorship requests, and balance departmental mentoring cohorts."
        />

        {/* Mentoring Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Total Registered Students</div>
            <div className="text-2xl font-bold text-ink mt-1">{registeredCollegeStudents.length}</div>
            <div className="text-[11px] text-muted mt-0.5">Enrolled in College</div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Students with Mentor</div>
            <div className="text-2xl font-bold text-success mt-1">
              {registeredCollegeStudents.filter((s) => Boolean(s.mentor_id)).length}
            </div>
            <div className="text-[11px] text-muted mt-0.5">Advisors Assigned</div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Unassigned Students</div>
            <div className="text-2xl font-bold text-warning mt-1">{unassignedCount}</div>
            <div className="text-[11px] text-warning mt-0.5 font-medium">Require Mentor Assignment</div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Pending Student Requests</div>
            <div className="text-2xl font-bold text-accent mt-1">{pendingMentorRequests.length}</div>
            <div className="text-[11px] text-muted mt-0.5">Awaiting Confirmation</div>
          </GlassCard>
        </div>

        {/* Incoming Student Mentorship Requests */}
        {pendingMentorRequests.length > 0 && (
          <GlassCard padding="lg" className="border-warning/40 bg-warning/5 space-y-4">
            <div className="flex items-center justify-between border-b border-warning/20 pb-3">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  Incoming Student Mentor Requests ({pendingMentorRequests.length})
                </h3>
                <p className="text-xs text-muted">Students who submitted preferred advisor requests awaiting assignment.</p>
              </div>
              <Badge tone="warning" dot>Action Required</Badge>
            </div>
            <div className="divide-y divide-line/40">
              {pendingMentorRequests.map((req) => (
                <div key={req.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-ink text-sm">
                      {req.student_name} ({req.enrolment_no})
                    </div>
                    <div className="text-xs text-accent font-medium mt-0.5">
                      Requested Mentor: {req.mentor_name}
                    </div>
                    {req.notes && <div className="text-xs text-muted mt-0.5">Goals: &ldquo;{req.notes}&rdquo;</div>}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (onReassignMentor) {
                        onReassignMentor(req.student_id, req.mentor_id, req.mentor_name);
                      }
                      onToast(`Confirmed ${req.mentor_name} as mentor for ${req.student_name}.`);
                    }}
                  >
                    Confirm &amp; Assign
                  </Button>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* 5-STEP GUIDED MENTORING & ADVISOR ASSIGNMENT WORKFLOW */}
        <div id="mentoring-wizard-card">
          <GlassCard padding="lg" className="border-accent/30 bg-surface/80 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="accent">Step {mentorWizardStep} of 5</Badge>
                  <span className="text-xs font-mono text-muted uppercase tracking-wider">
                    Institutional Mentoring & Advisor Assignment Wizard
                  </span>
                </div>
                <h3 className="mt-1.5 text-lg font-bold text-ink">
                  {mentorWizardStep === 1 && 'Step 1: Select Assignment Scope & Type'}
                  {mentorWizardStep === 2 && 'Step 2: Select Student, Class Cohort, or Department Group'}
                  {mentorWizardStep === 3 && 'Step 3: Designate Eligible Faculty Mentor or Advisor'}
                  {mentorWizardStep === 4 && 'Step 4: Review Mentoring Cohort Allocation & Confirm'}
                  {mentorWizardStep === 5 && 'Step 5: Assignment Completed & Persisted'}
                </h3>
                <p className="text-xs text-muted">
                  Assign academic mentors with seamless persistence and real-time updates across Student, Teacher, and Organizer panels.
                </p>
              </div>
              {mentorWizardStep < 5 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMentorWizardStep(1);
                      setMentorWizardError(null);
                    }}
                  >
                    Reset Steps
                  </Button>
                </div>
              )}
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { step: 1, title: '1. Type', desc: 'Assignment scope' },
                { step: 2, title: '2. Target', desc: 'Student or class' },
                { step: 3, title: '3. Mentor', desc: 'Eligible faculty' },
                { step: 4, title: '4. Review', desc: 'Verification' },
                { step: 5, title: '5. Complete', desc: 'Active in DB' },
              ].map((s) => {
                const isCurrent = mentorWizardStep === s.step;
                const isPassed = mentorWizardStep > s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    disabled={s.step > mentorWizardStep && s.step !== 5}
                    onClick={() => {
                      if (s.step < mentorWizardStep) setMentorWizardStep(s.step as any);
                    }}
                    className={`rounded-[10px] p-2.5 text-left border transition-all cursor-pointer ${
                      isCurrent
                        ? 'border-accent bg-accent/10 shadow-sm'
                        : isPassed
                          ? 'border-success/40 bg-success/5 hover:border-success'
                          : 'border-line/60 bg-surface/30 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isCurrent ? 'text-accent' : isPassed ? 'text-success' : 'text-muted'}`}>
                        {s.title}
                      </span>
                      {isPassed && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                    </div>
                    <div className="text-[10px] text-muted truncate mt-0.5">{s.desc}</div>
                  </button>
                );
              })}
            </div>

            {mentorWizardError && (
              <div role="alert" className="rounded-[10px] border border-danger bg-danger/5 p-3 text-xs text-danger flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{mentorWizardError}</span>
              </div>
            )}

            {/* STEP 1: SELECT ASSIGNMENT TYPE */}
            {mentorWizardStep === 1 && (
              <div className="space-y-4">
                <div className="text-xs font-medium text-muted">
                  Choose how you want to allocate academic mentorship for this institution:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'individual',
                      title: 'Individual Student Assignment',
                      badge: 'Direct 1-on-1',
                      desc: 'Assign an academic mentor to a specific student for personalized guidance, semester monitoring, and leave approvals.',
                    },
                    {
                      id: 'class',
                      title: 'Class / Section Cohort',
                      badge: 'Class Section',
                      desc: 'Designate a class advisor for all enrolled students in a specific Department and Semester (e.g. CSE · Semester 6).',
                    },
                    {
                      id: 'cohort',
                      title: 'Department Batch Allocation',
                      badge: 'Batch Fill',
                      desc: 'Assign a departmental mentor to all currently unassigned students in a selected Department.',
                    },
                  ].map((t) => {
                    const isSelected = mentorAssignType === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setMentorAssignType(t.id as any);
                          setMentorWizardError(null);
                        }}
                        className={`rounded-[12px] p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-accent bg-accent/10 shadow-sm ring-1 ring-accent'
                            : 'border-line bg-surface/50 hover:border-line-hover'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-ink">{t.title}</span>
                            <Badge tone={isSelected ? 'accent' : 'neutral'}>{t.badge}</Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted leading-relaxed">{t.desc}</p>
                        </div>
                        <div className="mt-4 pt-2 border-t border-line/40 flex items-center justify-between text-xs">
                          <span className={isSelected ? 'font-semibold text-accent' : 'text-muted'}>
                            {isSelected ? 'Selected Type ✓' : 'Click to Select'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2 border-t border-line">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setMentorWizardError(null);
                      if (!mentorTargetStudentId && registeredCollegeStudents.length > 0) {
                        setMentorTargetStudentId(registeredCollegeStudents[0].id);
                      }
                      if (!mentorTargetFacultyId && availableTeachers.length > 0) {
                        setMentorTargetFacultyId(availableTeachers[0].id);
                      }
                      setMentorWizardStep(2);
                    }}
                  >
                    <span>Next: Select Student or Group</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT STUDENT, CLASS, OR GROUP */}
            {mentorWizardStep === 2 && (
              <div className="space-y-4">
                {mentorAssignType === 'individual' && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-xs font-semibold text-ink">
                        Select an Enrolled Student from the College Directory:
                      </div>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted" />
                        <input
                          type="text"
                          placeholder="Search student or roll no..."
                          value={mentorStudentSearch}
                          onChange={(e) => setMentorStudentSearch(e.target.value)}
                          className="w-full rounded-[8px] border border-line bg-surface py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 border border-line rounded-[10px] p-2 bg-surface/30 scrollbar-thin">
                      {registeredCollegeStudents
                        .filter((s) => {
                          const q = mentorStudentSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            s.full_name.toLowerCase().includes(q) ||
                            s.enrolment_no.toLowerCase().includes(q) ||
                            (s.department_code || '').toLowerCase().includes(q)
                          );
                        })
                        .map((s) => {
                          const isSelected = mentorTargetStudentId === s.id;
                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                setMentorTargetStudentId(s.id);
                                setMentorWizardError(null);
                              }}
                              className={`p-2.5 rounded-[8px] border transition-colors cursor-pointer flex items-center justify-between text-xs ${
                                isSelected
                                  ? 'border-accent bg-accent/10 ring-1 ring-accent'
                                  : 'border-line/60 bg-surface/50 hover:bg-surface'
                              }`}
                            >
                              <div>
                                <div className="font-semibold text-ink">
                                  {s.full_name} <span className="font-mono text-muted">({s.enrolment_no})</span>
                                </div>
                                <div className="text-[11px] text-muted">
                                  {s.department_code || 'CSE'} · Sem {s.current_semester || 1} · {s.attendance_pct}% Att.
                                </div>
                              </div>
                              <div className="text-right">
                                {s.mentor_id ? (
                                  <Badge tone="neutral">Current: {s.mentor_name || s.mentor_id}</Badge>
                                ) : (
                                  <Badge tone="warning" dot>No Mentor</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {mentorAssignType === 'class' && (
                  <div className="space-y-4">
                    <div className="text-xs text-muted">
                      Specify the Department and Semester for this class cohort:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select
                        label="Department Code"
                        value={mentorTargetDept}
                        onChange={(e) => setMentorTargetDept(e.target.value)}
                        options={[
                          { value: 'CSE', label: 'Computer Science & Engineering (CSE)' },
                          { value: 'ECE', label: 'Electronics & Communication (ECE)' },
                          { value: 'ME', label: 'Mechanical Engineering (ME)' },
                          { value: 'CE', label: 'Civil Engineering (CE)' },
                          { value: 'IT', label: 'Information Technology (IT)' },
                          { value: 'EEE', label: 'Electrical & Electronics (EEE)' },
                        ]}
                      />
                      <Select
                        label="Semester"
                        value={String(mentorTargetSem)}
                        onChange={(e) => setMentorTargetSem(Number(e.target.value))}
                        options={[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ({
                          value: String(sem),
                          label: `Semester ${sem}`,
                        }))}
                      />
                    </div>
                    {(() => {
                      const matching = registeredCollegeStudents.filter(
                        (s) =>
                          (s.department_code || 'CSE').toUpperCase() === mentorTargetDept.toUpperCase() &&
                          Number(s.current_semester || 1) === Number(mentorTargetSem)
                      );
                      return (
                        <div className="rounded-[10px] border border-line bg-surface/50 p-3 text-xs flex items-center justify-between">
                          <div>
                            <strong>Cohort Preview:</strong> {matching.length} student(s) enrolled in{' '}
                            <span className="font-mono text-accent font-semibold">{mentorTargetDept} · Sem {mentorTargetSem}</span>
                          </div>
                          <Badge tone={matching.length > 0 ? 'success' : 'warning'}>
                            {matching.length} Students
                          </Badge>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {mentorAssignType === 'cohort' && (
                  <div className="space-y-4">
                    <div className="text-xs text-muted">
                      Select Department to assign advisor to all unassigned students:
                    </div>
                    <Select
                      label="Department"
                      value={mentorTargetDept}
                      onChange={(e) => setMentorTargetDept(e.target.value)}
                      options={[
                        { value: 'CSE', label: 'Computer Science & Engineering (CSE)' },
                        { value: 'ECE', label: 'Electronics & Communication (ECE)' },
                        { value: 'ME', label: 'Mechanical Engineering (ME)' },
                        { value: 'CE', label: 'Civil Engineering (CE)' },
                        { value: 'IT', label: 'Information Technology (IT)' },
                        { value: 'EEE', label: 'Electrical & Electronics (EEE)' },
                      ]}
                    />
                    {(() => {
                      const unassignedInDept = registeredCollegeStudents.filter(
                        (s) =>
                          !s.mentor_id &&
                          (s.department_code || 'CSE').toUpperCase() === mentorTargetDept.toUpperCase()
                      );
                      return (
                        <div className="rounded-[10px] border border-line bg-surface/50 p-3 text-xs flex items-center justify-between">
                          <div>
                            <strong>Unassigned Students in {mentorTargetDept}:</strong>{' '}
                            {unassignedInDept.length} students currently require an advisor.
                          </div>
                          <Badge tone={unassignedInDept.length > 0 ? 'warning' : 'neutral'}>
                            {unassignedInDept.length} Unassigned
                          </Badge>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setMentorWizardError(null);
                      setMentorWizardStep(1);
                    }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    <span>Back to Step 1</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setMentorWizardError(null);
                      if (mentorAssignType === 'individual' && !mentorTargetStudentId) {
                        setMentorWizardError('Please select a student from the list.');
                        return;
                      }
                      if (!mentorTargetFacultyId && availableTeachers.length > 0) {
                        setMentorTargetFacultyId(availableTeachers[0].id);
                      }
                      setMentorWizardStep(3);
                    }}
                  >
                    <span>Next: Select Faculty Mentor</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: SELECT FACULTY MENTOR OR ADVISOR */}
            {mentorWizardStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-ink">
                    Select an Eligible Faculty Mentor ({availableTeachers.length} Registered Teachers):
                  </div>
                  <Badge tone="neutral">Institutional Faculty Roster</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                  {availableTeachers.map((fac: any) => {
                    const isSelected = mentorTargetFacultyId === fac.id;
                    const assignedCount = registeredCollegeStudents.filter(
                      (s) => s.mentor_id === fac.id || (s.mentor_name && (s.mentor_name === fac.full_name || s.mentor_name === fac.name))
                    ).length;

                    return (
                      <div
                        key={fac.id}
                        onClick={() => {
                          setMentorTargetFacultyId(fac.id);
                          setMentorWizardError(null);
                        }}
                        className={`rounded-[10px] p-3 border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-accent bg-accent/10 ring-1 ring-accent shadow-sm'
                            : 'border-line bg-surface/50 hover:border-line-hover'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-muted">{fac.employee_id || fac.id}</span>
                            <Badge tone={assignedCount > 0 ? 'accent' : 'neutral'}>
                              {assignedCount} Mentees
                            </Badge>
                          </div>
                          <div className="mt-1 font-bold text-ink text-sm">
                            {fac.full_name || fac.name}
                          </div>
                          <div className="text-xs text-accent font-medium">{fac.designation}</div>
                          <div className="text-[11px] text-muted">{fac.department || fac.department_code}</div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-line/40 text-[11px] text-muted space-y-0.5">
                          <div className="truncate">Email: {fac.email}</div>
                          <div>Cabin: {fac.cabin || 'Main Faculty Block'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setMentorWizardError(null);
                      setMentorWizardStep(2);
                    }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    <span>Back to Step 2</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (!mentorTargetFacultyId) {
                        setMentorWizardError('Please select a faculty mentor to proceed.');
                        return;
                      }
                      setMentorWizardError(null);
                      setMentorWizardStep(4);
                    }}
                  >
                    <span>Next: Review & Confirm</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW AND CONFIRM */}
            {mentorWizardStep === 4 && (
              <div className="space-y-4">
                {(() => {
                  const selectedFaculty: any = availableTeachers.find((f: any) => f.id === mentorTargetFacultyId);
                  const selectedStudent = registeredCollegeStudents.find((s) => s.id === mentorTargetStudentId);
                  const facultyName = selectedFaculty?.full_name || selectedFaculty?.name || 'Assigned Faculty';

                  let targetSummary = '';
                  let studentCount = 1;

                  if (mentorAssignType === 'individual') {
                    targetSummary = selectedStudent
                      ? `${selectedStudent.full_name} (${selectedStudent.enrolment_no}) · ${selectedStudent.department_code || 'CSE'} Sem ${selectedStudent.current_semester || 1}`
                      : 'Selected Student';
                  } else if (mentorAssignType === 'class') {
                    const match = registeredCollegeStudents.filter(
                      (s) =>
                        (s.department_code || 'CSE').toUpperCase() === mentorTargetDept.toUpperCase() &&
                        Number(s.current_semester || 1) === Number(mentorTargetSem)
                    );
                    studentCount = match.length;
                    targetSummary = `${studentCount} Students in ${mentorTargetDept} · Semester ${mentorTargetSem}`;
                  } else {
                    const match = registeredCollegeStudents.filter(
                      (s) =>
                        !s.mentor_id &&
                        (s.department_code || 'CSE').toUpperCase() === mentorTargetDept.toUpperCase()
                    );
                    studentCount = match.length;
                    targetSummary = `${studentCount} Unassigned Students in ${mentorTargetDept}`;
                  }

                  return (
                    <div className="space-y-4">
                      <div className="rounded-[12px] border border-line bg-surface/40 p-4 space-y-3">
                        <div className="text-xs font-semibold text-muted uppercase tracking-wider">
                          Assignment Summary Overview
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <span className="text-muted">Assignment Scope:</span>
                            <div className="font-bold text-ink capitalize">
                              {mentorAssignType === 'individual'
                                ? 'Individual 1-on-1 Student'
                                : mentorAssignType === 'class'
                                  ? 'Class / Section Cohort'
                                  : 'Department Batch'}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted">Target Student(s):</span>
                            <div className="font-bold text-ink">{targetSummary}</div>
                          </div>
                          <div className="space-y-1 sm:col-span-2 border-t border-line/40 pt-2">
                            <span className="text-muted">Designated Faculty Mentor:</span>
                            <div className="font-bold text-accent text-sm">
                              {facultyName} ({selectedFaculty?.designation || 'Academic Advisor'})
                            </div>
                            <div className="text-[11px] text-muted">
                              {selectedFaculty?.department || selectedFaculty?.department_code} · {selectedFaculty?.email} · Cabin: {selectedFaculty?.cabin || 'Main Faculty Block'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[10px] bg-accent/5 border border-accent/20 p-3 text-xs text-muted leading-relaxed">
                        <strong className="text-ink">Real-time Persistence:</strong> Confirming this assignment immediately updates the institutional database. The student and faculty views will reflect this assignment in real time without requiring manual page refreshes.
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-line">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isSubmittingMentorAssignment}
                          onClick={() => {
                            setMentorWizardError(null);
                            setMentorWizardStep(3);
                          }}
                        >
                          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                          <span>Back to Edit Selections</span>
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isSubmittingMentorAssignment}
                          onClick={async () => {
                            try {
                              setIsSubmittingMentorAssignment(true);
                              setMentorWizardError(null);

                              if (mentorAssignType === 'individual') {
                                if (onReassignMentor && selectedStudent) {
                                  await onReassignMentor(selectedStudent.id, mentorTargetFacultyId, facultyName);
                                }
                              } else if (mentorAssignType === 'class') {
                                const matching = registeredCollegeStudents.filter(
                                  (s) =>
                                    (s.department_code || 'CSE').toUpperCase() === mentorTargetDept.toUpperCase() &&
                                    Number(s.current_semester || 1) === Number(mentorTargetSem)
                                );
                                for (const s of matching) {
                                  if (onReassignMentor) {
                                    await onReassignMentor(s.id, mentorTargetFacultyId, facultyName);
                                  }
                                }
                              } else if (mentorAssignType === 'cohort') {
                                const unassigned = registeredCollegeStudents.filter(
                                  (s) =>
                                    !s.mentor_id &&
                                    (s.department_code || 'CSE').toUpperCase() === mentorTargetDept.toUpperCase()
                                );
                                for (const s of unassigned) {
                                  if (onReassignMentor) {
                                    await onReassignMentor(s.id, mentorTargetFacultyId, facultyName);
                                  }
                                }
                              }

                              setMentorCompletedSummary({
                                typeLabel:
                                  mentorAssignType === 'individual'
                                    ? 'Individual Student'
                                    : mentorAssignType === 'class'
                                      ? 'Class / Section Cohort'
                                      : 'Department Batch',
                                targetLabel: targetSummary,
                                mentorName: facultyName,
                                count: studentCount,
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              });

                              setMentorWizardStep(5);
                              onToast(`Successfully assigned ${facultyName} as mentor!`);
                            } catch (err: any) {
                              setMentorWizardError(err?.message || 'Failed to save mentor assignment. Please try again.');
                            } finally {
                              setIsSubmittingMentorAssignment(false);
                            }
                          }}
                        >
                          <CheckCircle2 className={`h-3.5 w-3.5 mr-1 ${isSubmittingMentorAssignment ? 'animate-spin' : ''}`} />
                          <span>{isSubmittingMentorAssignment ? 'Saving Assignment...' : 'Confirm Assignment'}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* STEP 5: ASSIGNMENT COMPLETED */}
            {mentorWizardStep === 5 && mentorCompletedSummary && (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 border border-success/30 text-success">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-ink">
                    Faculty Mentoring Assignment Successfully Saved!
                  </h4>
                  <p className="text-xs text-muted max-w-md mx-auto">
                    Designated <strong>{mentorCompletedSummary.mentorName}</strong> as academic advisor for{' '}
                    <strong>{mentorCompletedSummary.targetLabel}</strong> ({mentorCompletedSummary.count} student(s)).
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/5 px-4 py-1.5 text-xs text-success">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span>Persisted in Institutional Database · Live Synced across Panels at {mentorCompletedSummary.timestamp}</span>
                </div>

                <div className="pt-4 border-t border-line flex justify-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setMentorWizardStep(1);
                      setMentorCompletedSummary(null);
                      setMentorWizardError(null);
                    }}
                  >
                    <span>Assign Another Faculty Advisor</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const el = document.getElementById('mentoring-roster-table');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <span>View Updated Student Roster</span>
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Student Mentoring Roster Table */}
        <div id="mentoring-roster-table">
        <GlassCard padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">Student Mentoring Cohort Roster</h3>
            <span className="text-xs text-muted font-mono">{registeredCollegeStudents.length} Students</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface/50 text-xs text-muted">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Student Name & Roll No</th>
                  <th className="px-5 py-3.5 font-semibold">Department & Sem</th>
                  <th className="px-5 py-3.5 font-semibold">Attendance</th>
                  <th className="px-5 py-3.5 font-semibold">Currently Assigned Mentor</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Assign / Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {registeredCollegeStudents.map((stu) => {
                  const assignedFac: any = availableTeachers.find(
                    (f: any) =>
                      f.id === stu.mentor_id ||
                      f.name === stu.mentor_id ||
                      f.full_name === stu.mentor_id ||
                      (stu.mentor_name &&
                        (f.full_name === stu.mentor_name || f.name === stu.mentor_name))
                  );
                  return (
                    <tr key={stu.id} className="hover:bg-surface/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-ink">{stu.full_name}</div>
                        <div className="font-mono text-xs text-muted">{stu.enrolment_no}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted font-mono">
                        {stu.department_code || 'CSE'} · Sem {stu.current_semester || 1}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono">
                        <span className={stu.attendance_pct >= 75 ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                          {stu.attendance_pct}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        {assignedFac || stu.mentor_name ? (
                          <div>
                            <div className="font-medium text-ink">
                              {assignedFac?.full_name || assignedFac?.name || stu.mentor_name}
                            </div>
                            <div className="text-[11px] text-accent">
                              {assignedFac?.designation || 'Faculty Mentor'} · {assignedFac?.department || assignedFac?.department_code || 'Academic Advisor'}
                            </div>
                          </div>
                        ) : (
                          <Badge tone="warning" dot>No Mentor Assigned</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setMentorAssignType('individual');
                            setMentorTargetStudentId(stu.id);
                            setSelectedStudentForMentor(stu);
                            const facId = stu.mentor_id || availableTeachers[0]?.id || 'tch-001';
                            setAssigningFacultyId(facId);
                            setMentorTargetFacultyId(facId);
                            setMentorWizardStep(3);
                            setMentorWizardError(null);
                            const el = document.getElementById('mentoring-wizard-card');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          {assignedFac || stu.mentor_name ? 'Reassign' : 'Assign Mentor'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
        </div>

        {/* Assign Mentor Modal */}
        <ModalDialog
          open={mentorAssignModalOpen}
          onClose={() => setMentorAssignModalOpen(false)}
          title={selectedStudentForMentor ? `Assign Faculty Mentor · ${selectedStudentForMentor.full_name}` : 'Assign Mentor'}
          description="Designate an eligible faculty advisor to supervise the student's academic progress."
        >
          <div className="space-y-4">
            {selectedStudentForMentor && (
              <div className="rounded-[10px] border border-line bg-surface/50 p-3 text-xs space-y-1">
                <div>Student: <strong className="text-ink">{selectedStudentForMentor.full_name}</strong></div>
                <div>Roll / Enrolment: <strong className="font-mono text-ink">{selectedStudentForMentor.enrolment_no}</strong></div>
                <div>Department: <strong className="text-ink">{selectedStudentForMentor.department_code || 'CSE'}</strong></div>
              </div>
            )}

            <Select
              label="Select Faculty Mentor *"
              value={assigningFacultyId}
              onChange={(e) => setAssigningFacultyId(e.target.value)}
              options={
                availableTeachers.length > 0
                  ? availableTeachers.map((f: any) => ({
                      value: f.id,
                      label: `${f.full_name || f.name} (${f.designation} · ${f.department || f.department_code})`,
                    }))
                  : [{ value: '', label: 'No eligible faculty available' }]
              }
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button variant="secondary" size="sm" onClick={() => setMentorAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (selectedStudentForMentor && onReassignMentor) {
                    const fac: any = availableTeachers.find((f) => f.id === assigningFacultyId);
                    const mentorName = fac?.full_name || fac?.name || assigningFacultyId;
                    onReassignMentor(selectedStudentForMentor.id, assigningFacultyId, mentorName);
                    onToast(`Assigned faculty mentor ${mentorName} to ${selectedStudentForMentor.full_name}.`);
                  }
                  setMentorAssignModalOpen(false);
                }}
              >
                Confirm Assignment
              </Button>
            </div>
          </div>
        </ModalDialog>
      </div>
    );
  }

  // ===========================================================================
  // DEDICATED PAGE: TEACHER MANAGEMENT (activeNav === 'teachers')
  // ===========================================================================
  if (activeNav === 'teachers') {
    const departments = Array.from(new Set(availableTeachers.map((t) => t.department).filter(Boolean)));
    const filteredTeachers = availableTeachers.filter((t) => {
      const q = teacherSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.full_name.toLowerCase().includes(q) ||
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.employee_id && t.employee_id.toLowerCase().includes(q)) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.department && t.department.toLowerCase().includes(q)) ||
        (t.designation && t.designation.toLowerCase().includes(q));

      const matchesDept = teacherDeptFilter === 'ALL' || t.department === teacherDeptFilter;
      return matchesSearch && matchesDept;
    });

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={`FACULTY DIRECTORY · ${primaryActiveCode.code || 'CAMPUS'}`}
          title="Teacher Management & Faculty Directory"
          subtitle="Manage academic faculty profiles, employee IDs, designations, departments, and course assignment eligibility."
          actions={
            <Button variant="primary" size="sm" onClick={handleOpenAddTeacher}>
              <UserPlus className="h-4 w-4" />
              Add New Teacher
            </Button>
          }
        />

        {/* Teacher Overview Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Total Teachers Available</div>
            <div className="text-2xl font-bold text-ink mt-1">{availableTeachers.length}</div>
            <div className="text-[11px] text-muted mt-0.5">Includes 10 Demo Teachers</div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Active Instructors</div>
            <div className="text-2xl font-bold text-success mt-1">
              {availableTeachers.filter((t) => t.status === 'active').length}
            </div>
            <div className="text-[11px] text-muted mt-0.5">Ready for Class Assignment</div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Academic Departments</div>
            <div className="text-2xl font-bold text-accent mt-1">{departments.length}</div>
            <div className="text-[11px] text-muted mt-0.5">CSE, IT, Math, ECE, etc.</div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="text-xs text-muted font-medium">Assigned in Timetable</div>
            <div className="text-2xl font-bold text-ink mt-1">
              {new Set(timetable.map((t) => t.faculty_name).filter(Boolean)).size}
            </div>
            <div className="text-[11px] text-muted mt-0.5">Faculty on Active Schedule</div>
          </GlassCard>
        </div>

        {/* Filter and Search Bar */}
        <GlassCard padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search teachers by name, employee ID (e.g., TCH-001), email, or designation..."
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="w-full rounded-[10px] border border-line bg-surface/50 pl-9 pr-4 py-2 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={teacherDeptFilter}
              onChange={(e) => setTeacherDeptFilter(e.target.value)}
              aria-label="Filter by department"
              className="rounded-[10px] border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-accent focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={handleOpenAddTeacher}>
              <Plus className="h-4 w-4" />
              Add Teacher
            </Button>
          </div>
        </GlassCard>

        {/* Teachers Table */}
        <GlassCard padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-ink">Faculty &amp; Instructor Registry</h3>
              <p className="text-xs text-muted">
                Eligible for Timetable assignments, Subject Instructors, and Student Mentoring.
              </p>
            </div>
            <span className="text-xs text-muted font-mono">{filteredTeachers.length} of {availableTeachers.length} Teachers</span>
          </div>

          {filteredTeachers.length === 0 ? (
            <div className="p-8 text-center text-sm font-medium text-muted">
              No teachers match your search criteria. Click &quot;Add New Teacher&quot; to register a teacher.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface/50 text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Teacher Name &amp; ID</th>
                    <th className="px-5 py-3.5 font-semibold">Department</th>
                    <th className="px-5 py-3.5 font-semibold">Designation</th>
                    <th className="px-5 py-3.5 font-semibold">Contact (Email &amp; Phone)</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredTeachers.map((t) => (
                    <tr key={t.id} className="hover:bg-surface/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-ink">{t.full_name || t.name}</div>
                        <div className="font-mono text-xs text-accent">{t.employee_id || t.id}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink font-medium">
                        {t.department}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted">
                        {t.designation}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <div className="font-mono text-ink">{t.email}</div>
                        {t.phone && <div className="text-[11px] text-muted">{t.phone}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={t.status === 'active' ? 'success' : t.status === 'suspended' ? 'danger' : 'warning'} dot>
                          {t.status === 'active' ? 'Active' : t.status === 'suspended' ? 'Suspended' : 'On Leave'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditTeacher(t)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Add / Edit Teacher Modal */}
        <ModalDialog
          open={teacherModalOpen}
          onClose={() => setTeacherModalOpen(false)}
          title={editingTeacher ? `Edit Teacher Details · ${editingTeacher.full_name}` : 'Add New Academic Teacher'}
          description="Register faculty credentials, department, and contact info to immediately enable timetable and mentoring assignments."
        >
          <form onSubmit={handleSubmitTeacher} className="space-y-4">
            {teacherError && (
              <div className="rounded-[10px] border border-danger bg-danger/10 p-3 text-xs text-danger font-medium">
                {teacherError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Full Name *"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="e.g., Dr. Amit Sharma"
                required
              />
              <Input
                label="Teacher ID / Employee ID *"
                value={teacherEmpId}
                onChange={(e) => setTeacherEmpId(e.target.value.toUpperCase())}
                placeholder="e.g., TCH-011"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Email Address *"
                type="email"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                placeholder="teacher@campus.edu"
                required
              />
              <Input
                label="Phone Number"
                value={teacherPhone}
                onChange={(e) => setTeacherPhone(e.target.value)}
                placeholder="+91 98000 00000"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Department / Specialization *"
                value={teacherDept}
                onChange={(e) => setTeacherDept(e.target.value)}
                placeholder="e.g., Computer Science"
                required
              />
              <Select
                label="Designation *"
                value={teacherDesignation}
                onChange={(e) => setTeacherDesignation(e.target.value)}
                options={[
                  { value: 'Professor & HOD', label: 'Professor & HOD' },
                  { value: 'Professor', label: 'Professor' },
                  { value: 'Associate Professor', label: 'Associate Professor' },
                  { value: 'Assistant Professor', label: 'Assistant Professor' },
                  { value: 'Lecturer', label: 'Lecturer' },
                  { value: 'Visiting Faculty', label: 'Visiting Faculty' },
                ]}
              />
            </div>

            <Select
              label="Availability / Employment Status"
              value={teacherStatus}
              onChange={(e) => setTeacherStatus(e.target.value as AccountStatus)}
              options={[
                { value: 'active', label: 'Active (Available for Teaching & Mentoring)' },
                { value: 'pending', label: 'On Leave / Sabbatical' },
                { value: 'suspended', label: 'Suspended / Inactive' },
              ]}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button type="button" variant="secondary" size="sm" onClick={() => setTeacherModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSavingTeacher}>
                {isSavingTeacher ? 'Saving...' : editingTeacher ? 'Save Changes' : 'Add Teacher'}
              </Button>
            </div>
          </form>
        </ModalDialog>
      </div>
    );
  }

  // ===========================================================================
  // ORGANIZER & ADMIN COMMAND CENTER DASHBOARD (activeNav === 'dashboard')
  // ===========================================================================
  if (activeNav === 'dashboard') {
    const totalCollectedPaise = (Array.isArray(payments) ? payments : []).reduce((a, b) => a + b.amount_paise, 0);
    const pendingLeavesCount = (Array.isArray(leaveRequests) ? leaveRequests : []).filter(
      (l) => l.status === 'Pending Mentor' || l.status === 'Pending HOD'
    ).length;
    const openTicketsCount = (Array.isArray(tickets) ? tickets : []).filter((t) => t.status !== 'resolved').length;

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={
            role === 'super_admin'
              ? `COLLEGE ORGANIZER COMMAND CENTER · ${primaryActiveCode.code}`
              : `INSTITUTIONAL ADMIN DASHBOARD · ${primaryActiveCode.code}`
          }
          title={`Welcome back, ${welcomeDisplayName}`}
          subtitle={`${primaryActiveCode.collegeName} · Active Code: ${primaryActiveCode.code} · Live Platform Operations, Student Approvals & Academic Control`}
          datePill={formattedCurrentDate}
          actions={
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={isRefreshing}
                onClick={async () => {
                  setIsRefreshing(true);
                  if (onRefresh) {
                    await onRefresh();
                  }
                  setIsRefreshing(false);
                  onToast('Synchronized real-time student registrations and platform data.');
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.85} />
                <span className="hidden sm:inline">Sync Live</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onNavigate('profile')}
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.85} />
                <span>My Profile</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5" strokeWidth={1.9} />
                <span>+ Invite User</span>
              </Button>
            </>
          }
        />

        {/* ROW 1 — 4 EQUAL STAT GLASS TILES */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
          <StatTile
            label="Registered Students"
            value={studentProfilesCount}
            icon={GraduationCap}
            tone="accent"
            footerText={`${joinedMembersWithCode.filter((m) => m.role === 'student').length} joined via college code`}
            ctaLabel="View Roster →"
            onCtaClick={() => onNavigate('users')}
            progressPct={Math.min(100, studentProfilesCount * 20)}
          />

          <StatTile
            label="Pending Student Approvals"
            value={pendingProfiles.length}
            icon={ShieldCheck}
            tone={pendingProfiles.length > 0 ? 'warning' : 'success'}
            footerText={
              pendingProfiles.length > 0
                ? `${pendingProfiles.length} waiting to enter portal`
                : 'All registered students approved ✓'
            }
            ctaLabel={pendingProfiles.length > 0 ? 'Approve Now →' : 'User Registry →'}
            onCtaClick={() => onNavigate('users')}
            progressPct={totpCoveragePct}
          />

          <StatTile
            label="Faculty & Subjects"
            value={`${facultyProfilesCount} / ${subjects.length}`}
            icon={Users}
            tone="brass"
            footerText={`${timetable.length} weekly lecture slots`}
            ctaLabel="Timetable →"
            onCtaClick={() => onNavigate('timetable')}
            progressPct={85}
          />

          <StatTile
            label="Fee Collected"
            value={formatPaiseToINR(totalCollectedPaise)}
            icon={BookOpen}
            tone="success"
            footerText={`${payments.length} PDF receipts · ${pendingLeavesCount} pending leaves`}
            ctaLabel="Fee Ledger →"
            onCtaClick={() => onNavigate('fees')}
            progressPct={90}
          />
        </div>

        {/* ROW 2 — COLLEGE ACCESS CODE + REAL-TIME STUDENT APPROVALS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          {/* Left Column (col-span-7): Create/Update Code + Student Approval Queue */}
          <GlassCard equalHeight padding="lg" className="lg:col-span-7 space-y-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-editorial text-lg font-bold text-ink">
                    Create &amp; Share Unique College Code
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Clicking &ldquo;Generate&rdquo; or &ldquo;Save &amp; Activate Code&rdquo; immediately updates your Primary Active Access Code and persists across relogins.
                  </p>
                </div>
                <Badge tone="accent" dot>
                  Active: {primaryActiveCode.code}
                </Badge>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCodeFormError(null);
                  const cleanCode = (newOrgCollegeCode || primaryActiveCode.code)
                    .trim()
                    .toUpperCase();
                  const cleanName =
                    newOrgCollegeName.trim() ||
                    primaryActiveCode.collegeName ||
                    'Institution Workspace';
                  if (!cleanCode || cleanCode.length < 4) {
                    setCodeFormError(
                      'Code must be at least 4 characters (e.g., COLL-1234).'
                    );
                    return;
                  }
                  if (onRegisterCollegeCode) {
                    onRegisterCollegeCode(cleanCode, cleanName);
                    setNewOrgCollegeCode(cleanCode);
                    onToast(
                      `Activated Unique College Code "${cleanCode}" for ${cleanName}. Persisted for relogin!`
                    );
                  }
                }}
                className="space-y-3.5"
              >
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <Input
                    label="College / Institution Name"
                    placeholder="e.g., National Institute of Technology"
                    value={newOrgCollegeName}
                    onChange={(e) => setNewOrgCollegeName(e.target.value)}
                    required
                  />
                  <Input
                    label="Unique College Code"
                    placeholder={primaryActiveCode.code}
                    value={newOrgCollegeCode}
                    onChange={(e) => {
                      setCodeFormError(null);
                      setNewOrgCollegeCode(e.target.value.toUpperCase());
                    }}
                    error={codeFormError || undefined}
                    className="font-mono uppercase tracking-wider"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setCodeFormError(null);
                      const cleanName =
                        newOrgCollegeName.trim() ||
                        primaryActiveCode.collegeName ||
                        'Institution Workspace';
                      const prefix = (
                        cleanName.replace(/[^a-zA-Z]/g, '').slice(0, 4) || 'INST'
                      ).toUpperCase();
                      const rnd = Math.floor(1000 + Math.random() * 9000);
                      const generatedCode = `${prefix}-${rnd}`;
                      setNewOrgCollegeCode(generatedCode);
                      if (onRegisterCollegeCode) {
                        onRegisterCollegeCode(generatedCode, cleanName);
                      }
                      onToast(
                        `Generated & Activated new Unique College Code: ${generatedCode}`
                      );
                    }}
                  >
                    <Sparkles
                      className="h-3.5 w-3.5 text-[var(--accent-text)]"
                      strokeWidth={1.85}
                    />
                    <span>Generate New Code</span>
                  </Button>

                  <Button type="submit" variant="primary" size="md">
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Save &amp; Activate Code</span>
                  </Button>
                </div>
              </form>
            </div>

            {/* Bottom Section: Real-Time Pending Student Approval Queue */}
            <div className="mt-auto pt-4 border-t border-[var(--border)] space-y-3">
              {pendingProfiles.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text)] flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--warning)] animate-pulse" />
                      Students Requesting College Access ({pendingProfiles.length})
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Click any student to inspect details or approve
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[165px] overflow-y-auto pr-1">
                    {pendingProfiles.map((p) => (
                      <PendingApprovalRow
                        key={p.id}
                        p={p}
                        onOpenEdit={openEditUserModal}
                        onApprove={(id) => {
                          setApprovingId(id);
                          onVerifyPendingStudent(id);
                          onToast(
                            `Approved ${p.full_name} (${ROLE_LABELS[p.role]}) to enter ${
                              p.college_name || primaryActiveCode.collegeName
                            }!`
                          );
                          setTimeout(() => setApprovingId(null), 1500);
                        }}
                        approvingId={approvingId}
                        primaryActiveCode={primaryActiveCode.code}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[var(--text)]">
                      Real-Time Student Registration &amp; Approval Workflow
                    </span>
                    <span className="text-xs font-semibold text-[var(--success)]">
                      0 pending approvals ✓
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-[14px] py-[12px]">
                      <div className="text-[13px] font-semibold text-[var(--text)]">
                        1. Share Active Code
                      </div>
                      <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--text-2)]">
                        Share{' '}
                        <code className="font-mono font-semibold text-[var(--accent-text)]">
                          {primaryActiveCode.code}
                        </code>{' '}
                        with your students &amp; staff.
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-[14px] py-[12px]">
                      <div className="text-[13px] font-semibold text-[var(--text)]">
                        2. Student Registers
                      </div>
                      <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--text-2)]">
                        Students register with your code and wait on the approval screen.
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-[14px] py-[12px]">
                      <div className="text-[13px] font-semibold text-[var(--text)]">
                        3. Inspect &amp; Approve
                      </div>
                      <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--text-2)]">
                        Click any student row below to inspect their 360° details and approve.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </GlassCard>

          {/* Right Column (col-span-5): Primary Active Access Code Showcase Card */}
          <GlassCard
            equalHeight
            padding="lg"
            className="lg:col-span-5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Primary Active Access Code
              </span>
              <Badge tone="success" dot>
                Live &amp; Persisted
              </Badge>
            </div>

            <div className="my-6 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-[24px] text-center">
              <div className="font-mono text-[36px] font-bold tracking-[0.12em] text-[var(--accent-text)] leading-none select-all">
                {primaryActiveCode.code}
              </div>
              <div className="mt-3 text-sm font-semibold text-[var(--text)]">
                {primaryActiveCode.collegeName}
              </div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Authorized for Students, Teachers &amp; Admins · {joinedMembersWithCode.length}{' '}
                member(s) joined
              </div>
            </div>

            <div className="mt-auto flex items-center gap-2.5 relative">
              <Button
                type="button"
                variant="primary"
                size="md"
                className="flex-1"
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(primaryActiveCode.code).catch(() => {});
                  }
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                  onToast(
                    `Copied Unique College Code "${primaryActiveCode.code}" to clipboard.`
                  );
                }}
              >
                {codeCopied ? (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2.2} />
                    <span>Copied ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" strokeWidth={1.85} />
                    <span>Copy Code</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  const shareText = `Join ${primaryActiveCode.collegeName} on Campus Portal using Unique College Code: ${primaryActiveCode.code}`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareText).catch(() => {});
                  }
                  onToast('Copied invitation message & college code to clipboard.');
                }}
                title="Share invitation message"
              >
                <Share2 className="h-4 w-4" strokeWidth={1.85} />
                <span>Share</span>
              </Button>

              {/* Overflow menu (⋯) for Regenerate & Deactivate */}
              <div className="relative">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setCodeMenuOpen((prev) => !prev)}
                  aria-label="More code actions"
                  title="Regenerate or Deactivate code"
                >
                  <MoreHorizontal className="h-4 w-4" strokeWidth={1.85} />
                </Button>

                {codeMenuOpen && (
                  <div className="absolute right-0 bottom-12 w-48 glass-strong rounded-[14px] p-1.5 shadow-xl z-30">
                    <button
                      type="button"
                      onClick={() => {
                        setCodeMenuOpen(false);
                        const prefix = (
                          primaryActiveCode.collegeName
                            .replace(/[^a-zA-Z]/g, '')
                            .slice(0, 4) || 'INST'
                        ).toUpperCase();
                        const nextCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
                        setNewOrgCollegeCode(nextCode);
                        if (onRegisterCollegeCode) {
                          onRegisterCollegeCode(nextCode, primaryActiveCode.collegeName);
                          onToast(`Regenerated & activated new Unique College Code: ${nextCode}`);
                        }
                      }}
                      className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-xs font-medium text-ink hover:bg-[var(--accent-soft)] hover:text-accent cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Regenerate Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCodeMenuOpen(false);
                        setDeactivateCodeTarget(primaryActiveCode.code);
                      }}
                      className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Deactivate Code</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ROW 3 — PLATFORM PULSE & MODULE QUICK LAUNCHER (For Organizer & Admin) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          {[
            {
              label: 'Timetable & Room Planner',
              sub: `${timetable.length} active slots · Add or edit schedule`,
              icon: Calendar,
              onClick: () => onNavigate('timetable'),
            },
            {
              label: 'Attendance Register',
              sub: `${attendanceSessions.length} sessions · Mark & monitor 75% rule`,
              icon: UserCheck,
              onClick: () => onNavigate('attendance'),
            },
            {
              label: 'Exams & Grade Cards',
              sub: `${subjects.length} subjects · PDF Report Cards & Hall Tickets`,
              icon: GraduationCap,
              onClick: () => onNavigate('results'),
            },
            {
              label: 'Leaves & Helpdesk Queue',
              sub: `${pendingLeavesCount} pending leaves · ${openTicketsCount} open doubts`,
              icon: HelpCircle,
              onClick: () => onNavigate('leaves'),
            },
          ].map((act, idx) => (
            <ModuleQuickLaunchButton
              key={idx}
              label={act.label}
              sub={act.sub}
              icon={act.icon}
              onClick={act.onClick}
            />
          ))}
        </div>

        {/* ALL REGISTERED STUDENTS IN THE COLLEGE (Clickable Rows for 360° Details & Real-Time Approval) */}
        <GlassCard padding="none" className="overflow-hidden">
          <div className="border-b border-[var(--border)] p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-lg font-bold text-[var(--text)]">
                  All Registered Students in College ({registeredCollegeStudents.length})
                </h2>
                <Badge
                  tone={
                    registeredCollegeStudents.some((s) => s.status === 'pending')
                      ? 'warning'
                      : 'success'
                  }
                  dot
                >
                  {registeredCollegeStudents.filter((s) => s.status === 'pending').length} Pending
                  Approval
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Click any student row to inspect their complete 360° details, edit attendance/CGPA, download PDF Report Cards, or approve portal entry.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] px-3 py-1.5 min-w-[240px]">
                <Users className="h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search student name or enrolment..."
                  value={stuSearch}
                  onChange={(e) => setStuSearch(e.target.value)}
                  className="bg-transparent border-none text-xs text-[var(--text)] outline-none w-full"
                />
              </div>
              
              <select
                value={stuDeptFilter}
                onChange={(e) => setStuDeptFilter(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] px-3 py-1.5 text-xs text-[var(--text)] outline-none"
              >
                {departmentFilterOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={stuStatusFilter}
                onChange={(e) => setStuStatusFilter(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] px-3 py-1.5 text-xs text-[var(--text)] outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>

              <Button variant="secondary" size="sm" onClick={() => onNavigate('users')}>
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">User Registry</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setInviteRole('student');
                  setInviteOpen(true);
                }}
              >
                <UserPlus className="h-3.5 w-3.5" strokeWidth={1.85} />
                <span className="hidden sm:inline">+ Register Student</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {registeredCollegeStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                No students registered yet. Share your Unique College Code ({primaryActiveCode.code}) with students or click &ldquo;+ Register Student&rdquo;.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="px-6 py-3.5">Student Name &amp; Enrolment No</th>
                    <th className="px-4 py-3.5">Email &amp; Phone</th>
                    <th className="px-4 py-3.5">Department &amp; Batch</th>
                    <th className="px-4 py-3.5">College Code</th>
                    <th className="px-4 py-3.5">Academic Standing</th>
                    <th className="px-4 py-3.5">Portal Access Status</th>
                    <th className="px-6 py-3.5 text-right">Organizer Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {registeredCollegeStudents
                    .filter(s => {
                      const q = stuSearch.toLowerCase().trim();
                      const matchesSearch = !q || s.full_name.toLowerCase().includes(q) || s.enrolment_no.toLowerCase().includes(q);
                      const matchesStatus = stuStatusFilter === 'all' || s.status === stuStatusFilter;
                      const matchesDept = stuDeptFilter === 'all' || s.department_code.toUpperCase() === stuDeptFilter.toUpperCase();
                      return matchesSearch && matchesStatus && matchesDept;
                    })
                    .map((stu) => (
                      <StudentTableRow
                        key={stu.id}
                        stu={stu}
                        primaryActiveCode={primaryActiveCode.code}
                        approvingId={approvingId}
                        onOpenDossier={openStudentDossier}
                        onVerifyPending={onVerifyPendingStudent}
                        onToast={onToast}
                      />
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </GlassCard>

        {/* Equal-Height 2-Column Operational Row: Live Platform Activity Log + Clickable Announcements */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          {/* Left (col-span-7): Live Platform Activity & Audit Feed */}
          <GlassCard equalHeight padding="lg" className="lg:col-span-7">
            <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] pb-3.5">
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-accent" strokeWidth={1.9} />
                <h3 className="font-editorial text-base font-bold text-ink">
                  What&apos;s Happening Across the Platform (Live Activity Stream)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('audit-log')}
                className="text-xs font-semibold text-accent hover:underline cursor-pointer"
              >
                Full Activity Log →
              </button>
            </div>

            <div className="my-3 flex-1 max-h-[320px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-[var(--glass-border-subtle)] p-8 text-center text-xs text-muted">
                  Recent administrative actions, student registrations, approvals, fee receipts, and leave decisions appear here in real time.
                </div>
              ) : (
                <div className="divide-y divide-[var(--glass-border-subtle)]">
                  {auditLogs.slice(0, 10).map((log) => (
                    <AuditLogSummaryRow key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-auto pt-3 border-t border-[var(--glass-border-subtle)] flex items-center justify-between text-xs text-muted">
              <span>Two-Factor Coverage: {totpCoveragePct}%</span>
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="font-semibold text-accent hover:underline cursor-pointer"
              >
                Policy &amp; Thresholds →
              </button>
            </div>
          </GlassCard>

          {/* Right (col-span-5): Published College Announcements */}
          <GlassCard equalHeight padding="lg" className="lg:col-span-5">
            <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] pb-3.5">
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-accent" strokeWidth={1.9} />
                <h3 className="font-editorial text-base font-bold text-ink">
                  College Announcements &amp; Circulars
                </h3>
                <Badge tone="accent">{notices.length}</Badge>
              </div>
              <Button variant="primary" size="sm" onClick={() => setNoticeModalOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                <span>Publish</span>
              </Button>
            </div>

            <div className="my-3 flex-1 max-h-[380px] overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
              {notices.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-[var(--glass-border-subtle)] p-8 text-center text-xs text-muted">
                  No announcements published yet.
                </div>
              ) : (
                notices.map((n) => (
                  <NoticeSummaryCard key={n.id} n={n} onClick={setSelectedNoticeDetail} />
                ))
              )}
            </div>

            <div className="mt-auto pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Click any notice to inspect full bulletin</span>
              <button
                type="button"
                onClick={() => onNavigate('notices')}
                className="font-semibold text-[var(--accent-text)] hover:underline cursor-pointer"
              >
                All Notices →
              </button>
            </div>
          </GlassCard>
        </div>

        {renderStudentDossierModal()}

        {/* Invite User Modal */}
        <ModalDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          title="Invite or Add Institutional User"
          description="Creates a verified account pre-linked to your institution's Unique College Code."
        >
          <div className="space-y-4">
            <Input
              label="Full Name *"
              placeholder="e.g., Dr. Kavita Nair or Aarav Sharma"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
            <Input
              label="Email Address *"
              type="email"
              placeholder="user@college.edu"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Select
              label="Assign Institutional Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              options={[
                { value: 'student', label: 'Student' },
                { value: 'faculty', label: 'Teacher / Faculty' },
                { value: 'hod', label: 'Head of Department (HOD)' },
                { value: 'admin', label: 'College Admin' },
                { value: 'accounts', label: 'Accounts Officer' },
              ]}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!inviteName.trim() || !inviteEmail.includes('@')) return;
                  onInviteUser(inviteEmail.trim(), inviteName.trim(), inviteRole);
                  setInviteName('');
                  setInviteEmail('');
                  setInviteOpen(false);
                  onToast(
                    `Added ${inviteName.trim()} (${ROLE_LABELS[inviteRole]}) to your college platform.`
                  );
                }}
              >
                Send Invitation &amp; Create Account
              </Button>
            </div>
          </div>
        </ModalDialog>

        {/* Deactivate College Code Confirmation Modal */}
        <ModalDialog
          open={Boolean(deactivateCodeTarget)}
          onClose={() => setDeactivateCodeTarget(null)}
          title="Deactivate Unique College Code"
          description="Deactivating a code prevents new students, faculty, or admins from joining with it."
        >
          {deactivateCodeTarget && (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Confirm deactivation of institutional code{' '}
                <code className="font-mono font-bold text-danger">{deactivateCodeTarget}</code>?
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDeactivateCodeTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (onDeactivateCollegeCode) {
                      onDeactivateCollegeCode(deactivateCodeTarget);
                    }
                    onToast(`Deactivated college code ${deactivateCodeTarget}.`);
                    setDeactivateCodeTarget(null);
                  }}
                >
                  Deactivate Code
                </Button>
              </div>
            </div>
          )}
        </ModalDialog>

        {/* Publish Notice Modal */}
        <ModalDialog
          open={noticeModalOpen}
          onClose={() => setNoticeModalOpen(false)}
          title="Publish Official College Announcement"
          description={`Visible to all approved students and staff in ${primaryActiveCode.collegeName} (${primaryActiveCode.code}).`}
        >
          <div className="space-y-4">
            <Input
              label="Announcement Title *"
              placeholder="e.g., Mid-Semester Examination Timetable & Hall Ticket Notice"
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Category"
                value={noticeCat}
                onChange={(e) => setNoticeCat(e.target.value as NoticeItem['category'])}
                options={[
                  { value: 'Academic', label: 'Academic' },
                  { value: 'Exam', label: 'Examination' },
                  { value: 'Fees', label: 'Fees & Finance' },
                  { value: 'Event', label: 'Campus Event' },
                  { value: 'Urgent', label: 'Urgent Alert' },
                ]}
              />
              <Select
                label="Audience Scope"
                value={noticeScope}
                onChange={(e) => setNoticeScope(e.target.value as NoticeItem['audience_scope'])}
                options={[
                  { value: 'college', label: 'Entire College Platform' },
                  { value: 'department', label: 'Departmental' },
                  { value: 'batch', label: 'Student Batch' },
                ]}
              />
            </div>
            <Input
              label="Target Audience Label"
              value={noticeTarget}
              onChange={(e) => setNoticeTarget(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[var(--text)]">
                Full Announcement Details &amp; Instructions *
              </label>
              <textarea
                rows={4}
                value={noticeBody}
                onChange={(e) => setNoticeBody(e.target.value)}
                placeholder="Write complete announcement details..."
                className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setNoticeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!noticeTitle.trim()) return;
                  onCreateNotice(
                    noticeTitle.trim(),
                    noticeBody.trim() || 'Official institutional announcement.',
                    noticeCat,
                    noticeScope,
                    noticeTarget.trim() || 'All Campus Roles'
                  );
                  setNoticeTitle('');
                  setNoticeBody('');
                  setNoticeModalOpen(false);
                  onToast(
                    `Published announcement to ${primaryActiveCode.collegeName} (${primaryActiveCode.code}).`
                  );
                }}
              >
                Publish Announcement
              </Button>
            </div>
          </div>
        </ModalDialog>

        <NoticeDetailModal
          notice={selectedNoticeDetail}
          onClose={() => setSelectedNoticeDetail(null)}
        />
      </div>
    );
  }

  // PLATFORM ACTIVITY & APPEND-ONLY AUDIT LOG (Accessible to both Admin & Super Admin)
  if (activeNav === 'audit-log') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="PLATFORM ACTIVITY & AUDIT STREAM"
          title="Live Platform Operations & Append-Only Audit Trail"
          subtitle="Real-time visibility into every user registration, approval, attendance session, mark entry, fee receipt, and policy change across the platform."
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExportPasswordModal(true)}
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              Export Audit CSV
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 items-stretch">
          <StatTile
            label="Audit Events"
            value={auditLogs.length}
            icon={Activity}
            tone="accent"
            footerText="Real-time platform events"
          />
          <StatTile
            label="Active Users"
            value={activeProfilesCount}
            icon={Users}
            tone="success"
            footerText={`${pendingProfiles.length} pending verification`}
          />
          <StatTile
            label="Attendance Sessions"
            value={attendanceSessions.length}
            icon={UserCheck}
            tone="brass"
            footerText="Faculty & Admin registers"
          />
          <StatTile
            label="Receipts & Leaves"
            value={`${(Array.isArray(payments) ? payments : []).length} / ${(Array.isArray(leaveRequests) ? leaveRequests : []).length}`}
            icon={CheckCircle2}
            tone="success"
            footerText="Financial & leave records"
          />
        </div>

        <GlassCard padding="md" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-[var(--text)]">
              Audit Logs Stream ({filteredAuditLogs.length} Events)
            </h3>
            <Input
              placeholder="Search by actor name, entity type, or action description..."
              value={auditSearchQuery}
              onChange={(e) => setAuditSearchQuery(e.target.value)}
              className="w-full sm:w-80"
            />
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              {auditSearchQuery.trim()
                ? `No audit logs matched search "${auditSearchQuery.trim()}".`
                : 'No audit log entries recorded yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[10px] border border-[var(--border)]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--glass-border-subtle)] text-xs text-muted bg-[var(--surface-2)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Actor &amp; Role</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">Details &amp; IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--glass-border-subtle)] font-mono text-xs tabular-nums">
                  {filteredAuditLogs.map((log) => (
                    <AuditLogTableRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        <ModalDialog
          open={exportPasswordModal}
          onClose={() => setExportPasswordModal(false)}
          title="Confirm Password to Export Audit CSV"
          description="Exporting sensitive institutional records requires step-up password confirmation."
        >
          <div className="space-y-4">
            <Input
              label="Confirm Password"
              type="password"
              value={reenteredPassword}
              onChange={(e) => setReenteredPassword(e.target.value)}
              placeholder="Enter password (6+ characters)..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setExportPasswordModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (reenteredPassword.length < 4) return;
                  setExportPasswordModal(false);
                  setReenteredPassword('');
                  onToast('Step-up authentication verified. Audit log CSV exported.');
                }}
              >
                Verify &amp; Export CSV
              </Button>
            </div>
          </div>
        </ModalDialog>
      </div>
    );
  }

  // SYSTEM SETTINGS & POLICY THRESHOLDS
  if (activeNav === 'settings') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="INSTITUTIONAL GOVERNANCE"
          title="System Policy & Statutory Threshold Settings"
          subtitle="Configure statutory attendance thresholds, hall ticket fee clearance rules, examination result publishing, and administrative security."
        />
        <GlassCard padding="lg" className="space-y-6">
          <div className="border-b border-[var(--glass-border-subtle)] pb-4">
            <h2 className="text-base font-bold text-ink">
              1. Statutory Academic &amp; Attendance Thresholds
            </h2>
            <p className="text-xs text-muted">
              Configure minimum mandatory attendance percentages. Applied to student dashboards and shortage reports.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                Mandatory Minimum Attendance (%) *
              </label>
              <input
                type="number"
                min={50}
                max={100}
                value={settings.minimum_attendance_pct || 75}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 50 && val <= 100) {
                    onUpdateSettings({ minimum_attendance_pct: val });
                    onToast(`Minimum attendance policy updated to ${val}%.`);
                  } else {
                    onToast('Minimum attendance threshold must be between 50% and 100%.');
                  }
                }}
                className="w-full rounded-xl border border-line bg-surface p-2.5 text-xs text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-[10px] text-muted mt-1 block">Students below this threshold are flagged for condonation.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                Warning Threshold Level (%) *
              </label>
              <input
                type="number"
                min={60}
                max={100}
                value={settings.warning_attendance_pct || 80}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 60 && val <= 100) {
                    onUpdateSettings({ warning_attendance_pct: val });
                    onToast(`Warning attendance threshold set to ${val}%.`);
                  } else {
                    onToast('Warning threshold must be between 60% and 100%.');
                  }
                }}
                className="w-full rounded-xl border border-line bg-surface p-2.5 text-xs text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-[10px] text-muted mt-1 block">Students entering this bracket receive advisory alerts.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                Daily Late Fine Amount (Rs.) *
              </label>
              <input
                type="number"
                min={0}
                value={Math.round((settings.default_late_fine_paise_per_day || 5000) / 100)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0) {
                    onUpdateSettings({ default_late_fine_paise_per_day: val * 100 });
                    onToast(`Daily overdue late fine set to Rs. ${val}/day.`);
                  } else {
                    onToast('Fine amount cannot be negative.');
                  }
                }}
                className="w-full rounded-xl border border-line bg-surface p-2.5 text-xs text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-[10px] text-muted mt-1 block">Automated surcharge added per day on past-due fee invoices.</span>
            </div>
          </div>

          <div className="border-t border-[var(--glass-border-subtle)] pt-4">
            <h2 className="text-base font-bold text-ink mb-1">
              2. Governance &amp; Clearance Gating Switches
            </h2>
            <p className="text-xs text-muted mb-4">
              Toggle statutory enforcement rules across student and faculty modules in real time.
            </p>
          </div>

          <div className="divide-y divide-[var(--glass-border-subtle)]">
            <Switch
              checked={settings.block_hall_ticket_on_overdue_fees}
              onChange={(val) => {
                onUpdateSettings({ block_hall_ticket_on_overdue_fees: val });
                onToast(`Hall Ticket fee clearance restriction ${val ? 'ENABLED' : 'DISABLED'}.`);
              }}
              label="Block Hall Ticket Download on Overdue Fees"
              description="When enabled, students with outstanding overdue installments cannot download examination hall tickets."
            />
            <Switch
              checked={settings.results_published}
              onChange={(val) => {
                onUpdateSettings({ results_published: val });
                onToast(`Semester results publication status set to ${val ? 'ACTIVE / PUBLISHED' : 'HIDDEN / DRAFT'}.`);
              }}
              label="Publish Semester Examination Results to Student Portal"
              description="When enabled, semester grades and report cards are accessible to student accounts."
            />
            <Switch
              checked={settings.require_totp_for_admins}
              onChange={(val) => {
                onUpdateSettings({ require_totp_for_admins: val });
                onToast(`Mandatory 2FA authentication ${val ? 'ENFORCED' : 'OPTIONAL'}.`);
              }}
              label="Enforce Mandatory TOTP Two-Factor for Administrative Roles"
              description="Requires multi-factor authenticator codes during sensitive platform operations."
            />
          </div>
        </GlassCard>
      </div>
    );
  }

  // ===========================================================================
  // 1. ATTENDANCE REGISTER & SESSION CREATOR (Admin / Organizer View)
  // ===========================================================================
  if (activeNav === 'attendance') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="INSTITUTIONAL ATTENDANCE REGISTER"
          title="Register Attendance, Create Sessions & Monitor Student Standing"
          subtitle="Record new class attendance sessions or directly adjust student attendance percentages — visible to students in real time."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 items-stretch">
          <StatTile
            label="Registered Students"
            value={registeredCollegeStudents.length}
            icon={GraduationCap}
            tone="accent"
            footerText="Monitored for 75% threshold"
          />
          <StatTile
            label="Above 75% Threshold"
            value={registeredCollegeStudents.filter((s) => s.attendance_pct >= 75).length}
            icon={CheckCircle2}
            tone="success"
            footerText="Eligible for hall ticket"
          />
          <StatTile
            label="Shortage (< 75%)"
            value={registeredCollegeStudents.filter((s) => s.attendance_pct < 75).length}
            icon={Bell}
            tone={
              registeredCollegeStudents.some((s) => s.attendance_pct < 75) ? 'danger' : 'success'
            }
            footerText={`Minimum policy: ${settings.minimum_attendance_pct}%`}
          />
        </div>

        {/* Create & Mark New Attendance Session */}
        <GlassCard className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <h3 className="text-base font-bold text-[var(--text)]">
                Register New Lecture Attendance Session (Updates Student Dashboards Live)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Select subject, date, and period, toggle student status, and save to update student attendance.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const allPresent = Object.fromEntries(
                    registeredCollegeStudents.map((s) => [s.id, 'Present'])
                  ) as Record<string, AttendanceStatus>;
                  setAttRecords(allPresent);
                  onToast('Marked all students Present.');
                }}
              >
                Mark All Present
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const subj = subjects.find((s) => s.code === attSubjectCode) || subjects[0];
                  const finalRecords = Object.fromEntries(
                    registeredCollegeStudents.map((s) => [s.id, attRecords[s.id] || 'Present'])
                  ) as Record<string, AttendanceStatus>;
                  const newSes: AttendanceSession = {
                    id: `ses-${Date.now()}`,
                    subject_code: attSubjectCode || 'CS601',
                    subject_name: subj?.name || 'Academic Lecture',
                    batch_id: 'batch-cse-6a',
                    batch_label: 'CSE Sem-6 — Sec A',
                    date: attDate || new Date().toISOString().slice(0, 10),
                    period: Number(attPeriod) || 1,
                    marked_by_faculty_id: currentProfile?.id || 'admin-1',
                    created_at: new Date().toISOString(),
                    locked_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    records: finalRecords,
                  };
                  if (onSaveAttendanceSession) {
                    onSaveAttendanceSession(newSes);
                  }
                  onToast(
                    `Saved attendance register for ${newSes.subject_code} (${newSes.date}) and updated student percentages.`
                  );
                }}
              >
                <Save className="h-3.5 w-3.5" />
                Save Attendance Register
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Subject"
              value={attSubjectCode}
              onChange={(e) => setAttSubjectCode(e.target.value)}
              options={
                subjects.length > 0
                  ? subjects.map((s) => ({
                      value: s.code,
                      label: `${s.code} · ${s.name}`,
                    }))
                  : [{ value: 'CS601', label: 'CS601 · Core Subject' }]
              }
            />
            <Input
              label="Session Date"
              type="date"
              value={attDate}
              onChange={(e) => setAttDate(e.target.value)}
            />
            <Input
              label="Period #"
              type="number"
              min={1}
              max={8}
              value={attPeriod}
              onChange={(e) => setAttPeriod(e.target.value)}
            />
          </div>

          {registeredCollegeStudents.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {registeredCollegeStudents.map((stu) => (
                <AttendanceGridItem
                  key={stu.id}
                  stu={stu}
                  status={attRecords[stu.id] || 'Present'}
                  onClick={(id) => {
                    const st = attRecords[id] || 'Present';
                    const cycle: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'On Duty'];
                    const next = cycle[(cycle.indexOf(st) + 1) % cycle.length];
                    setAttRecords((prev) => ({ ...prev, [id]: next }));
                  }}
                />
              ))}
            </div>
          )}
        </GlassCard>

        {/* Student Attendance Standing Table with Direct Percentage Update */}
        <GlassCard padding="none" className="overflow-hidden">
          <div className="border-b border-[var(--border)] p-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--text)]">
                Student Attendance Standing ({registeredCollegeStudents.length} Students)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Click any student row to inspect or adjust their overall attendance percentage in real time.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Student</th>
                  <th className="px-5 py-3.5 font-semibold">Enrolment No</th>
                  <th className="px-5 py-3.5 font-semibold">Department &amp; Batch</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Attendance %</th>
                  <th className="px-5 py-3.5 font-semibold">Eligibility Status</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Quick Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {registeredCollegeStudents.map((s) => (
                  <AttendanceOverviewRow
                    key={s.id}
                    s={s}
                    minAttendance={settings.minimum_attendance_pct}
                    onOpenDossier={openStudentDossier}
                    onQuickAdjust={handleQuickAdjust}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {renderStudentDossierModal()}
      </div>
    );
  }

  // ===========================================================================
  // 2. EXAMS, GRADE CARDS & SUBJECT CREATOR (Admin / Organizer View)
  // ===========================================================================
  if (activeNav === 'results' || activeNav === 'academics') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="EXAMINATIONS, GRADE CARDS & CURRICULUM"
          title="Exams, Grade Card Generator & Subject Curriculum"
          subtitle="Create subjects, enter or update student marks & CGPA, publish semester results, and generate official PDF Report Cards & Hall Tickets."
          actions={
            <Button
              variant={settings.results_published ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => {
                onUpdateSettings({ results_published: !settings.results_published });
                onToast(
                  `Semester examination results are now ${
                    !settings.results_published ? 'PUBLISHED' : 'HIDDEN'
                  } for students.`
                );
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {settings.results_published ? 'Hide Semester Results' : 'Publish Semester Results'}
              </span>
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 items-stretch">
          <StatTile
            label="Result Publication Status"
            value={settings.results_published ? 'Published Live' : 'Draft / Hidden'}
            icon={ShieldCheck}
            tone={settings.results_published ? 'success' : 'warning'}
            footerText="Visible on student & parent portals"
          />
          <StatTile
            label="Active Subjects"
            value={subjects.length}
            icon={BookOpen}
            tone="accent"
            footerText="10-point UGC credit scale"
          />
          <StatTile
            label="Evaluated Students"
            value={registeredCollegeStudents.length}
            icon={GraduationCap}
            tone="success"
            footerText="PDF Grade Cards & Hall Tickets ready"
          />
        </div>

        {/* Row: Create Subject + Enter/Update Student Marks */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <GlassCard equalHeight className="lg:col-span-5 space-y-4">
            <h3 className="text-base font-bold text-[var(--text)]">
              Add New Curriculum Subject / Exam Paper
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Subject Code *"
                placeholder="e.g., CS605"
                value={newSubCode}
                onChange={(e) => setNewSubCode(e.target.value.toUpperCase())}
              />
              <Input
                label="Credits"
                type="number"
                min={1}
                max={6}
                value={newSubCredits}
                onChange={(e) => setNewSubCredits(e.target.value)}
              />
            </div>
            <Input
              label="Subject Title *"
              placeholder="e.g., Cloud Computing & Distributed Systems"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
            />
            <Input
              label="Assigned Faculty Instructor"
              placeholder="e.g., Dr. Jane Smith"
              value={newSubFaculty}
              onChange={(e) => setNewSubFaculty(e.target.value)}
            />
            <Button
              variant="primary"
              className="w-full mt-auto"
              onClick={() => {
                if (!newSubCode.trim() || !newSubName.trim()) return;
                if (onAddSubject) {
                  onAddSubject({
                    code: newSubCode.trim().toUpperCase(),
                    name: newSubName.trim(),
                    semester: 6,
                    credits: Number(newSubCredits) || 4,
                    course_id: 'course-btech-cse',
                    faculty_id: 'fac-1',
                    faculty_name: newSubFaculty.trim() || 'Assigned Faculty',
                    faculty_email: 'faculty@campus.edu',
                    faculty_cabin: 'Block-A 204',
                    syllabus_url: '#',
                    classes_attended: 28,
                    classes_held: 30,
                    internal_1_marks: 22,
                    internal_1_max: 25,
                    internal_2_marks: 21,
                    internal_2_max: 25,
                    assignment_marks: 9,
                    assignment_max: 10,
                    lab_marks: 35,
                    lab_max: 40,
                    grade: 'A+',
                    grade_points: 9,
                    class_average_pct: 84,
                  });
                }
                setNewSubCode('');
                setNewSubName('');
                onToast('Added new subject to college curriculum and student grade cards.');
              }}
            >
              <Plus className="h-4 w-4" />
              Add Subject to Curriculum
            </Button>
          </GlassCard>

          <GlassCard equalHeight className="lg:col-span-7 space-y-4">
            <h3 className="text-base font-bold text-[var(--text)]">
              Enter / Update Student Exam Marks &amp; Grade Card
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Select Student"
                value={gradeStudentId}
                onChange={(e) => setGradeStudentId(e.target.value)}
                options={registeredCollegeStudents.map((s) => ({
                  value: s.id,
                  label: `${s.enrolment_no} · ${s.full_name}`,
                }))}
              />
              <Select
                label="Select Subject"
                value={gradeSubjectCode}
                onChange={(e) => setGradeSubjectCode(e.target.value)}
                options={subjects.map((sub) => ({
                  value: sub.code,
                  label: `${sub.code} · ${sub.name}`,
                }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Assessment Component"
                value={gradeComponent}
                onChange={(e) => setGradeComponent(e.target.value)}
                options={[
                  { value: 'Internal 1 (Max 25)', label: 'Internal 1 (Max 25)' },
                  { value: 'Internal 2 (Max 25)', label: 'Internal 2 (Max 25)' },
                  { value: 'Assignment (Max 10)', label: 'Assignment (Max 10)' },
                  { value: 'End-Sem / Lab (Max 40)', label: 'End-Sem / Lab (Max 40)' },
                ]}
              />
              <Input
                label="Marks Awarded"
                type="number"
                min={0}
                max={40}
                value={gradeMarks}
                onChange={(e) => setGradeMarks(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 mt-auto">
              <Button
                variant="primary"
                onClick={() => {
                  if (onUpdateSubjectMarks) {
                    onUpdateSubjectMarks(
                      gradeSubjectCode,
                      gradeStudentId,
                      gradeComponent,
                      Number(gradeMarks) || 0
                    );
                  }
                  onToast(
                    `Updated ${gradeSubjectCode} (${gradeComponent}) marks and recalculated student Grade Card.`
                  );
                }}
              >
                <Save className="h-4 w-4" />
                Save Marks &amp; Update Grade Card
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* Registered Students Grade Cards & PDF Downloads */}
        <GlassCard padding="none" className="overflow-hidden">
          <div className="border-b border-[var(--border)] p-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[var(--text)]">
                Student Examination Standing, Grade Cards &amp; Hall Tickets
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Click any student to edit CGPA or download their Official Report Card PDF &amp; Hall Ticket PDF.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Student Name</th>
                  <th className="px-5 py-3.5 font-semibold">Enrolment No</th>
                  <th className="px-5 py-3.5 font-semibold">Department</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Attendance</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Cumulative CGPA</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Official PDF Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {registeredCollegeStudents.map((s) => (
                  <ExamStandingRow
                    key={s.id}
                    s={s}
                    subjects={subjects}
                    collegeName={primaryActiveCode.collegeName}
                    collegeCode={primaryActiveCode.code}
                    onUpdateCgpa={handleUpdateCgpa}
                    onToast={onToast}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {renderStudentDossierModal()}
      </div>
    );
  }

  // ===========================================================================
  // 3. TIMETABLE CREATOR & SCHEDULE MANAGER (Admin / Organizer View)
  // ===========================================================================
  if (activeNav === 'timetable') {
    const weekdayLabels: Record<number, string> = {
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
    };

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="MASTER ACADEMIC SCHEDULE"
          title="Create & Manage College Timetable Slots"
          subtitle="Schedule lectures, laboratories, faculty assignments, and rooms. Changes appear in real time on Student and Teacher portals."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left: Create Timetable Slot Form */}
          <GlassCard className="lg:col-span-4 space-y-4">
            <h3 className="text-base font-bold text-[var(--text)]">
              Create New Timetable Slot
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Day of Week"
                value={ttWeekday}
                onChange={(e) => setTtWeekday(e.target.value)}
                options={[
                  { value: '1', label: 'Monday' },
                  { value: '2', label: 'Tuesday' },
                  { value: '3', label: 'Wednesday' },
                  { value: '4', label: 'Thursday' },
                  { value: '5', label: 'Friday' },
                  { value: '6', label: 'Saturday' },
                ]}
              />
              <Input
                label="Period #"
                type="number"
                min={1}
                max={8}
                value={ttPeriod}
                onChange={(e) => setTtPeriod(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Time"
                value={ttStartTime}
                onChange={(e) => setTtStartTime(e.target.value)}
                placeholder="09:00"
              />
              <Input
                label="End Time"
                value={ttEndTime}
                onChange={(e) => setTtEndTime(e.target.value)}
                placeholder="09:50"
              />
            </div>

            <Select
              label="Subject"
              value={ttSubjectCode}
              onChange={(e) => {
                setTtSubjectCode(e.target.value);
                const found = subjects.find((s) => s.code === e.target.value);
                if (found) setTtFacultyName(found.faculty_name);
              }}
              options={
                subjects.length > 0
                  ? subjects.map((s) => ({
                      value: s.code,
                      label: `${s.code} · ${s.name}`,
                    }))
                  : [{ value: 'CS601', label: 'CS601 · Core Subject' }]
              }
            />

            <Select
              label="Assigned Faculty Instructor *"
              value={ttFacultyName}
              onChange={(e) => setTtFacultyName(e.target.value)}
              options={
                availableTeachers.length > 0
                  ? availableTeachers.map((t) => ({
                      value: t.full_name || t.name,
                      label: `${t.full_name || t.name} (${t.designation} · ${t.department})`,
                    }))
                  : [{ value: '', label: 'No teachers available' }]
              }
            />

            <Input
              label="Lecture Hall / Laboratory Room"
              value={ttRoom}
              onChange={(e) => setTtRoom(e.target.value)}
              placeholder="LH-204"
            />

            <Input
              label="Special Note / Substitution (Optional)"
              value={ttNote}
              onChange={(e) => setTtNote(e.target.value)}
              placeholder="e.g., Lab Batch B / Guest Lecture"
            />

            <Button
              variant="primary"
              className="w-full"
              disabled={isAddingSlot}
              onClick={async () => {
                setIsAddingSlot(true);
                const subj = subjects.find((s) => s.code === ttSubjectCode);
                const assignedFac = availableTeachers.find(
                  (t) => (t.full_name || t.name) === ttFacultyName
                );
                const wDay = Number(ttWeekday) || 1;
                if (onAddTimetableSlot) {
                  onAddTimetableSlot({
                    batch_id: 'batch-cse-6a',
                    weekday: wDay,
                    period: Number(ttPeriod) || 1,
                    start_time: ttStartTime || '09:00',
                    end_time: ttEndTime || '09:50',
                    subject_code: ttSubjectCode,
                    subject_name: subj?.name || 'Academic Session',
                    faculty_id: assignedFac?.id || subj?.faculty_id || 'fac-1',
                    faculty_name: ttFacultyName || assignedFac?.full_name || subj?.faculty_name || 'Faculty',
                    room: ttRoom || 'LH-201',
                    substitution_note: ttNote.trim() || undefined,
                  });
                }
                setTtNote('');
                onToast(
                  `Added ${weekdayLabels[wDay] || 'Monday'} Period ${ttPeriod} (${ttSubjectCode}) to Master Timetable.`
                );
                setTimeout(() => setIsAddingSlot(false), 500);
              }}
            >
              {isAddingSlot ? 'Adding...' : <><Plus className="h-4 w-4" /> Add Slot to Timetable</>}
            </Button>
          </GlassCard>

          {/* Right: Master Timetable Table */}
          <GlassCard padding="none" className="lg:col-span-8 overflow-hidden">
            <div className="border-b border-[var(--border)] p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text)]">
                  Published Master Timetable ({filteredTimetableSlots.length} Slots)
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Synchronized live across all student and teacher accounts.
                </p>
              </div>
              <div className="w-52">
                <Select
                  label=""
                  value={String(selectedTimetableDay)}
                  onChange={(e) => setSelectedTimetableDay(Number(e.target.value) || 1)}
                  options={[
                    { value: '1', label: 'Monday' },
                    { value: '2', label: 'Tuesday' },
                    { value: '3', label: 'Wednesday' },
                    { value: '4', label: 'Thursday' },
                    { value: '5', label: 'Friday' },
                    { value: '6', label: 'Saturday' },
                  ]}
                />
              </div>
            </div>
            {filteredTimetableSlots.length === 0 ? (
              <div className="p-8 text-center text-sm font-medium text-[var(--text-muted)]">
                No classes scheduled for this day.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-muted)]">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Day</th>
                      <th className="px-5 py-3.5 font-semibold">Period &amp; Time</th>
                      <th className="px-5 py-3.5 font-semibold">Subject</th>
                      <th className="px-5 py-3.5 font-semibold">Faculty &amp; Room</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredTimetableSlots.map((slot) => (
                      <TimetableSlotTableRow
                        key={slot.id}
                        slot={slot}
                        weekdayLabel={weekdayLabels[slot.weekday] || `Day ${slot.weekday}`}
                        onDelete={onDeleteTimetableSlot}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // 4. FEE LEDGER, STRUCTURES & PDF/CSV RECEIPTS (Admin / Organizer View)
  // ===========================================================================
  if (activeNav === 'fees' || activeNav === 'fee-structures' || activeNav === 'payments' || activeNav === 'dues' || activeNav === 'reports') {
    const totalCollectedPaise = payments.reduce((a, b) => a + b.amount_paise, 0);
    const overdueAssignments = feeAssignments.filter((f) => f.status === 'overdue');
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="INSTITUTIONAL FINANCE & FISCAL AUDIT"
          title="Fee Structures, Monthly D3 Analytics & Printable PDF Receipts"
          subtitle="Define fee structures, inspect monthly collected vs. outstanding fiscal analytics, assign fees, and issue PDF receipts."
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                exportFeeReceiptCSV(payments);
                onToast('Exported complete fee receipt register to CSV.');
              }}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export All Receipts (CSV)
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 items-stretch">
          <StatTile
            label="Total Fee Collected"
            value={formatPaiseToINR(totalCollectedPaise)}
            icon={CheckCircle2}
            tone="success"
            footerText={`${payments.length} numbered receipts issued`}
          />
          <StatTile
            label="Overdue Accounts"
            value={overdueAssignments.length}
            icon={Bell}
            tone={overdueAssignments.length > 0 ? 'danger' : 'success'}
            footerText="Hall ticket clearance rule active"
          />
          <StatTile
            label="Active Fee Structures"
            value={feeStructures.length}
            icon={BookOpen}
            tone="accent"
            footerText="Exact integer-paise accounting"
          />
        </div>

        {/* D3 Monthly Fee Fiscal Insights Component */}
        <MonthlyFeeFiscalInsightsChart
          feeAssignments={feeAssignments}
          payments={payments}
          onToast={onToast}
        />

        {/* Create Fee Structure + Assign to Student */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <GlassCard equalHeight className="space-y-4 lg:col-span-6">
            <h2 className="text-base font-bold text-[var(--text)]">
              1. Create New Fee Structure
            </h2>
            <Input
              label="Fee Head Title *"
              value={newStructTitle}
              onChange={(e) => setNewStructTitle(e.target.value)}
              placeholder="e.g., Semester 6 Tuition & Laboratory Fee"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category"
                value={newStructCat}
                onChange={(e) => setNewStructCat(e.target.value as FeeStructure['category'])}
                options={[
                  { value: 'tuition', label: 'Tuition Fee' },
                  { value: 'exam', label: 'Examination Fee' },
                  { value: 'hostel', label: 'Hostel & Mess Fee' },
                  { value: 'transport', label: 'Transport Fee' },
                  { value: 'library', label: 'Library Fee' },
                ]}
              />
              <Input
                label="Due Date"
                type="date"
                value={newStructDue}
                onChange={(e) => setNewStructDue(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Fee Amount (INR ₹)"
                type="number"
                value={newStructRupees}
                onChange={(e) => setNewStructRupees(e.target.value)}
                placeholder="e.g., 65000"
              />
              <Input
                label="Late Fine / Day (INR ₹)"
                type="number"
                value={newStructFineRupees}
                onChange={(e) => setNewStructFineRupees(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              className="w-full mt-auto"
              onClick={() => {
                if (!newStructTitle.trim()) return;
                onAddFeeStructure({
                  course_id: 'course-btech-cse',
                  year: 3,
                  category: newStructCat,
                  title: newStructTitle.trim(),
                  amount_paise: rupeesToPaise(Number(newStructRupees) || 45000),
                  due_date: newStructDue || '2026-11-30',
                  fine_per_day_paise: rupeesToPaise(Number(newStructFineRupees) || 50),
                });
                setNewStructTitle('');
                setNewStructRupees('');
                onToast('Created new fee structure.');
              }}
            >
              <Plus className="h-4 w-4" />
              Add Fee Structure
            </Button>
          </GlassCard>

          <GlassCard equalHeight className="space-y-4 lg:col-span-6">
            <h2 className="text-base font-bold text-[var(--text)]">
              2. Assign Fee Structure to Student
            </h2>
            <Select
              label="Select Registered Student"
              value={assignStudentId}
              onChange={(e) => setAssignStudentId(e.target.value)}
              options={registeredCollegeStudents.map((s) => ({
                value: s.id,
                label: `${s.enrolment_no} · ${s.full_name}`,
              }))}
            />
            {(() => {
                const stu = registeredCollegeStudents.find((s) => s.id === assignStudentId);
                if (!stu) return null;
                const studentAssignments = feeAssignments.filter(a => a.student_id === stu.id);
                const summary = summarizeStudentLedgerPaise(studentAssignments, new Date().toISOString().slice(0, 10), payments);
                return (
                    <div className="p-3 rounded-md bg-warning/10 border border-warning/20 text-warning text-xs font-semibold">
                        Total Outstanding Due: {formatPaiseToINR(summary.totalDuePaise)}
                    </div>
                );
            })()}
            <Select
              label="Select Fee Structure"
              value={assignStructId}
              onChange={(e) => setAssignStructId(e.target.value)}
              options={feeStructures.map((fs) => ({
                value: fs.id,
                label: `${fs.title} (${formatPaiseToINR(fs.amount_paise)})`,
              }))}
            />
            <p className="text-xs text-[var(--text-muted)]">
              Assigning a fee structure immediately displays the invoice on the student&apos;s Fee &amp; Receipts portal.
            </p>
            <Button
              variant="primary"
              className="w-full mt-auto"
              onClick={() => {
                const stu =
                  registeredCollegeStudents.find((s) => s.id === assignStudentId) ||
                  registeredCollegeStudents[0];
                const struct =
                  feeStructures.find((f) => f.id === assignStructId) || feeStructures[0];
                if (!stu || !struct) return;
                if (onAssignFeeToStudent) {
                  onAssignFeeToStudent({
                    student_id: stu.id,
                    student_name: stu.full_name,
                    enrolment_no: stu.enrolment_no,
                    structure_id: struct.id,
                    title: struct.title,
                    category: struct.category,
                    amount_paise: struct.amount_paise,
                    concession_paise: 0,
                    fine_per_day_paise: struct.fine_per_day_paise,
                    due_date: struct.due_date,
                    paid_paise: 0,
                    status: 'pending',
                  });
                }
                onToast(`Assigned "${struct.title}" to ${stu.full_name}.`);
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Assign Fee to Student
            </Button>
          </GlassCard>
        </div>

        {/* Record Payment + Receipt Register */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <GlassCard equalHeight className="space-y-4 lg:col-span-5">
            <h2 className="text-base font-bold text-[var(--text)]">
              3. Record Fee Payment &amp; Issue Receipt
            </h2>
            <Select
              label="Student Fee Assignment"
              value={payAssignmentId}
              onChange={(e) => setPayAssignmentId(e.target.value)}
              options={Array.from(new Map(feeAssignments.map(fa => [fa.id, fa])).values()).map((fa) => ({
                value: fa.id,
                label: `${fa.enrolment_no} · ${fa.student_name} (${fa.title})`,
              }))}
            />
            <Input
              label="Amount Received (INR ₹)"
              type="number"
              value={payRupees}
              onChange={(e) => setPayRupees(e.target.value)}
              placeholder="e.g., 45000"
            />
            <Select
              label="Payment Mode"
              value={payMode}
              onChange={(e) => setPayMode(e.target.value as PaymentRecord['mode'])}
              options={[
                { value: 'upi', label: 'UPI Verified Reference' },
                { value: 'bank_transfer', label: 'NEFT / RTGS Bank Transfer' },
                { value: 'cash', label: 'Cash Counter Challan' },
                { value: 'gateway', label: 'Online Payment Gateway' },
              ]}
            />
            <Input
              label="Transaction / Challan Reference"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g., UPI-4192837192"
            />
            <Button
              variant="primary"
              className="w-full mt-auto"
              onClick={() => {
                const paise = rupeesToPaise(Number(payRupees) || 0);
                if (paise <= 0) return;
                const targetId = payAssignmentId || feeAssignments[0]?.id;
                if (!targetId) return;
                onRecordPayment(targetId, paise, payMode, payRef);
                setPayRupees('');
                setPayRef('');
                onToast('Payment recorded and numbered PDF receipt issued.');
              }}
            >
              Issue Numbered Receipt
            </Button>
          </GlassCard>

          <GlassCard equalHeight className="space-y-4 lg:col-span-7 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text)]">
                  Issued Fee Receipts ({payments.length})
                </h2>
                <Badge tone="accent">Sequential Ledger</Badge>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  exportFeeReceiptCSV(payments);
                  onToast('Downloaded CSV receipt ledger.');
                }}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
            <div className="max-h-[380px] overflow-y-auto pr-1 scrollbar-thin border border-[var(--border)] rounded-[10px]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--surface-2)] z-10 border-b border-[var(--border)] text-xs text-[var(--text-muted)] backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-3 font-medium">Receipt &amp; Date</th>
                    <th className="px-4 py-3 font-medium">Student Details</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {payments.map((p) => (
                    <FeeReceiptRow
                      key={p.id}
                      p={p}
                      onViewReceipt={(receipt) => setSelectedReceiptModal(receipt)}
                      onGeneratePDF={(receipt) => {
                        generateFeeReceiptPDF(
                          receipt,
                          primaryActiveCode.collegeName,
                          primaryActiveCode.code,
                          summarizeStudentLedgerPaise(feeAssignments.filter(a => a.student_id === receipt.student_id), new Date().toISOString().slice(0, 10), payments).totalDuePaise
                        );
                        onToast(`Downloaded PDF Receipt ${receipt.receipt_no}.`);
                      }}
                      onSetReversalTarget={setReversalTarget}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Section 4: Automated Fee Deadline & Partial Payment Email Dispatch Log */}
        <GlassCard padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text)]">
                  Automated Fee Deadline &amp; Partial Payment Email Dispatch Log
                </h2>
                <Badge tone="accent">{feeNotificationLogs.length} Dispatched</Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                System automatically sends email directives and in-portal alerts when fee deadlines approach or when partial payments are recorded.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (onRunFeeNotificationAudit) {
                  onRunFeeNotificationAudit();
                } else {
                  onToast('Automated Fee Audit complete. Dispatched deadline and partial payment reminders.');
                }
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Run Automated Fee Deadline Audit</span>
            </Button>
          </div>

          {feeNotificationLogs.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-muted)]">
              No fee notification emails dispatched yet. Click &quot;Run Automated Fee Deadline Audit&quot; above to scan student accounts and send automated deadline alerts.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student &amp; Email</th>
                    <th className="px-4 py-3 font-semibold">Fee Title &amp; Trigger</th>
                    <th className="px-4 py-3 font-semibold">Notification Type</th>
                    <th className="px-4 py-3 font-semibold text-right">Balance Due</th>
                    <th className="px-4 py-3 font-semibold text-right">Dispatched At</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {feeNotificationLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--text)]">{log.student_name}</div>
                        <div className="font-mono text-xs text-[var(--accent-text)]">{log.student_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--text)]">{log.fee_title}</div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono">Enrolment: {log.enrolment_no}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            log.notification_type === 'partial_payment_ack'
                              ? 'accent'
                              : log.notification_type === 'overdue_warning'
                              ? 'danger'
                              : log.notification_type === 'deadline_today'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {log.notification_type === 'partial_payment_ack'
                            ? 'Partial Payment Ack'
                            : log.notification_type === 'overdue_warning'
                            ? 'Overdue Warning'
                            : log.notification_type === 'deadline_today'
                            ? 'Due Today'
                            : 'Deadline Approaching'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[var(--danger)]">
                        {formatPaiseToINR(log.amount_due_paise)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-muted)]">
                        {new Date(log.sent_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedFeeEmailPreview(log)}
                        >
                          <Mail className="h-3.5 w-3.5 text-[var(--accent-text)]" />
                          <span>Preview Email</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Email Preview Modal */}
        <ModalDialog
          open={!!selectedFeeEmailPreview}
          onClose={() => setSelectedFeeEmailPreview(null)}
          title={`Dispatched Email Preview: ${selectedFeeEmailPreview?.email_subject || 'Fee Notification'}`}
          description={`Sent to ${selectedFeeEmailPreview?.student_email} for student ${selectedFeeEmailPreview?.student_name}`}
        >
          {selectedFeeEmailPreview && (
            <div className="space-y-4">
              <div className="rounded-[10px] border border-[var(--border)] bg-white dark:bg-slate-900 p-2 max-h-[480px] overflow-y-auto">
                <iframe
                  title="Fee Email Preview"
                  srcDoc={selectedFeeEmailPreview.email_body_html}
                  className="w-full h-[420px] border-none rounded-md"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                <div className="text-xs text-[var(--text-muted)]">
                  Dispatched via Institutional SMTP Gateway · Status: <span className="font-semibold text-[var(--success)]">Delivered ✓</span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setSelectedFeeEmailPreview(null)}>
                  Close Email Preview
                </Button>
              </div>
            </div>
          )}
        </ModalDialog>

        {/* Reversal Confirmation Modal Dialog */}
        <ModalDialog
          open={Boolean(reversalTarget)}
          onClose={() => setReversalTarget(null)}
          title="Issue Formal Payment Reversal Entry"
          description="Receipts cannot be deleted. Issuing a reversal creates an offsetting negative ledger entry, restores the student balance, and writes to audit logs."
        >
          {reversalTarget && (
            <div className="space-y-4">
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-3 font-mono text-xs space-y-1">
                <div>Reversing Receipt: <strong className="text-accent">{reversalTarget.receipt_no}</strong></div>
                <div>Amount: <strong className="text-danger">{formatPaiseToINR(reversalTarget.amount_paise)}</strong></div>
                <div>Student: <strong className="text-ink">{reversalTarget.student_name}</strong> ({reversalTarget.enrolment_no})</div>
              </div>
              <Input
                label="Mandatory Reason for Audit Trail"
                placeholder="e.g., Duplicate UPI entry, wrong fee head, or bank dispute"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <Button variant="secondary" size="sm" onClick={() => setReversalTarget(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (onReversePayment) {
                      onReversePayment(
                        reversalTarget.id,
                        reversalReason || 'Administrative reversal entry'
                      );
                    }
                    setReversalTarget(null);
                    setReversalReason('');
                    onToast(`Reversal issued for ${reversalTarget.receipt_no}. Ledger updated.`);
                  }}
                >
                  Confirm Reversal Entry
                </Button>
              </div>
            </div>
          )}
        </ModalDialog>
      </div>
    );
  }

  // ===========================================================================
  // 5. LEAVE APPLICATIONS & PERMIT PDF GENERATOR (Admin / Organizer View)
  // ===========================================================================
  if (activeNav === 'leaves' || activeNav === 'leave') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="LEAVE WORKFLOW & OFFICIAL PERMITS"
          title="Student Leave Applications & Leave Permit Issuance"
          subtitle="When students submit a leave application, review and approve it here to issue an official downloadable Leave Permit PDF."
        />

        {(!Array.isArray(leaveRequests) || leaveRequests.length === 0) ? (
          <EmptyState
            title="No Leave Applications Submitted Yet"
            description="When students apply for medical, academic duty, or personal leave, their requests appear here in real time."
          />
        ) : (
          <div className="space-y-4">
            {(Array.isArray(leaveRequests) ? leaveRequests : []).map((lv) => (
              <LeaveRequestCard
                key={lv.id}
                lv={lv}
                collegeName={primaryActiveCode.collegeName}
                collegeCode={primaryActiveCode.code}
                comment={leaveComments[lv.id] || ''}
                onCommentChange={handleLeaveCommentChange}
                onDecide={handleDecideLeave}
                onToast={onToast}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // 6. GRIEVANCE, ACADEMIC DOUBTS & HELPDESK DESK (Admin / Organizer View)
  // ===========================================================================
  if (activeNav === 'tickets') {
    const filteredTickets = tickets.filter(
      (t) => ticketStatusFilter === 'all' || t.status === ticketStatusFilter
    );

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="HELPDESK & STUDENT DOUBT RESOLUTION"
          title="Student & Staff Helpdesk, Doubts & Grievance Desk"
          subtitle="Respond to student academic doubts, fee receipt inquiries, attendance corrections, and technical support requests."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 items-stretch">
          <StatTile
            label="Total Helpdesk Tickets"
            value={tickets.length}
            icon={Activity}
            tone="accent"
            footerText="All student & staff inquiries"
          />
          <StatTile
            label="Open / Pending"
            value={tickets.filter((t) => t.status !== 'resolved').length}
            icon={Bell}
            tone={tickets.some((t) => t.status !== 'resolved') ? 'warning' : 'success'}
            footerText="Awaiting resolution reply"
          />
          <StatTile
            label="Resolved"
            value={tickets.filter((t) => t.status === 'resolved').length}
            icon={CheckCircle2}
            tone="success"
            footerText="Closed with resolution note"
          />
        </div>

        <GlassCard padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-[var(--text)]">
              Helpdesk &amp; Academic Doubt Queue ({filteredTickets.length})
            </h3>
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'All Tickets' },
                { id: 'open', label: 'Open' },
                { id: 'resolved', label: 'Resolved' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setTicketStatusFilter(st.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    ticketStatusFilter === st.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-muted)]">
              No matching helpdesk tickets or academic doubts found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((t) => (
                <TicketCard
                  key={t.id}
                  t={t}
                  reply={ticketReplies[t.id] || ''}
                  onReplyChange={handleTicketReplyChange}
                  onResolve={handleResolveTicket}
                />
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  // ===========================================================================
  // 7. OFFICIAL COLLEGE ANNOUNCEMENTS & CIRCULARS (Dedicated Page)
  // ===========================================================================
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`OFFICIAL CIRCULARS · ${primaryActiveCode.code}`}
        title="Official College Announcements & Circulars"
        subtitle="Publish institutional circulars and inspect read-receipt counts across your college."
        actions={
          <Button variant="primary" size="sm" onClick={() => setNoticeModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Publish Announcement
          </Button>
        }
      />

      <GlassCard padding="lg" className="space-y-4">
        {notices.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-muted)]">
            No notices published yet. Click &ldquo;Publish Announcement&rdquo; above to post one for your students.
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((n) => (
              <NoticeSummaryCard
                key={n.id}
                n={n}
                onClick={setSelectedNoticeDetail}
              />
            ))}
          </div>
        )}
      </GlassCard>

      {/* Publish Notice Modal */}
      <ModalDialog
        open={noticeModalOpen}
        onClose={() => setNoticeModalOpen(false)}
        title="Publish Official College Announcement"
        description={`Visible to all approved students and staff in ${primaryActiveCode.collegeName} (${primaryActiveCode.code}).`}
      >
        <div className="space-y-4">
          <Input
            label="Announcement Title *"
            placeholder="e.g., Semester Examination Schedule & Guidelines"
            value={noticeTitle}
            onChange={(e) => setNoticeTitle(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Category"
              value={noticeCat}
              onChange={(e) => setNoticeCat(e.target.value as NoticeItem['category'])}
              options={[
                { value: 'Academic', label: 'Academic' },
                { value: 'Exam', label: 'Examination' },
                { value: 'Fees', label: 'Fees & Finance' },
                { value: 'Event', label: 'Campus Event' },
                { value: 'Urgent', label: 'Urgent Alert' },
              ]}
            />
            <Select
              label="Audience Scope"
              value={noticeScope}
              onChange={(e) => {
                const val = e.target.value as NoticeItem['audience_scope'];
                setNoticeScope(val);
                if (val === 'college') setNoticeTarget('All College Members');
                else if (val === 'all_students') setNoticeTarget('All Registered Students');
                else if (val === 'all_teachers') setNoticeTarget('All Faculty & Teachers');
                else if (val === 'department') setNoticeTarget('Department of Computer Science & Engineering');
                else if (val === 'batch') setNoticeTarget('B.Tech 2026 Batch · Section A');
                else if (val === 'selected_students') setNoticeTarget('Selected Students');
                else if (val === 'selected_teachers') setNoticeTarget('Selected Faculty Members');
              }}
              options={[
                { value: 'college', label: 'All Relevant College Members' },
                { value: 'all_students', label: 'All Students in the College' },
                { value: 'all_teachers', label: 'All Teachers in the College' },
                { value: 'department', label: 'Specific Department' },
                { value: 'batch', label: 'Class / Course / Section' },
                { value: 'selected_students', label: 'Selected Students' },
                { value: 'selected_teachers', label: 'Selected Teachers' },
              ]}
            />
          </div>
          <Input
            label="Selected Recipient / Target Group Label *"
            value={noticeTarget}
            onChange={(e) => setNoticeTarget(e.target.value)}
            placeholder="e.g. All Registered Students"
          />
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[var(--text)]">
              Full Announcement Details *
            </label>
            <textarea
              rows={4}
              value={noticeBody}
              onChange={(e) => setNoticeBody(e.target.value)}
              placeholder="Write complete announcement details..."
              className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[14px] text-[var(--text)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setNoticeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!noticeTitle.trim()) return;
                onCreateNotice(
                  noticeTitle.trim(),
                  noticeBody.trim() || 'Official campus circular.',
                  noticeCat,
                  noticeScope,
                  noticeTarget.trim() || 'All Campus Roles'
                );
                setNoticeTitle('');
                setNoticeBody('');
                setNoticeModalOpen(false);
                onToast('Published institutional announcement.');
              }}
            >
              Publish Announcement
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* Full-Detail Announcement Modal */}
      <NoticeDetailModal
        notice={selectedNoticeDetail}
        onClose={() => setSelectedNoticeDetail(null)}
        onAcknowledge={
          onMarkNoticeRead
            ? (id) => {
                onMarkNoticeRead(id);
                setSelectedNoticeDetail((prev) =>
                  prev && prev.id === id
                    ? { ...prev, is_read: true, read_count: prev.read_count + 1 }
                    : prev
                );
                onToast('Announcement marked as read.');
              }
            : undefined
        }
      />

      <FeeReceiptModal
        payment={selectedReceiptModal}
        onClose={() => setSelectedReceiptModal(null)}
        collegeName={primaryActiveCode.collegeName}
        collegeCode={primaryActiveCode.code}
        onReverse={setReversalTarget}
        onToast={onToast}
      />
    </div>
  );
});
