import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  KeyRound,
  Lock,
  Mail,
  Plus,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { validateUploadFile } from '../../lib/supabase';
import {
  AssignmentItem,
  AttendanceSession,
  FeeAssignment,
  GrievanceTicket,
  LeaveRequestItem,
  MentorMeeting,
  MentorRequest,
  NoticeItem,
  PaymentRecord,
  Profile,
  StudentRecord,
  Subject,
  SystemSettings,
  TimetableSlot,
} from '../../types/portal';
import { DEMO_TEACHERS, SEED_FACULTY } from '../../data/seedData';
import { FeeNotificationLog } from '../../utils/feeNotificationEngine';
import {
  calculateAssignmentBalancePaise,
  calculateAttendanceAllowance,
  calculateCreditWeightedSGPA,
  formatPaiseToINR,
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
} from '../ui/DesignSystem';
import { DemoPaymentGatewayModal } from './accounts/DemoPaymentGatewayModal';

interface StudentAndParentModuleProps {
  role: 'student' | 'parent';
  activeNav: string;
  onNavigate: (navId: string) => void;
  profile: Profile;
  onUpdateProfile: (patch: Partial<Profile>) => void;
  students: StudentRecord[];
  subjects: Subject[];
  timetable: TimetableSlot[];
  feeAssignments: FeeAssignment[];
  payments: PaymentRecord[];
  notices: NoticeItem[];
  onMarkNoticeRead: (noticeId: string) => void;
  mentorMeetings: MentorMeeting[];
  onBookMentorSlot: (date: string, concern: string) => void;
  leaveRequests: LeaveRequestItem[];
  onSubmitLeave: (leave: Omit<LeaveRequestItem, 'id' | 'created_at' | 'approvals' | 'status'>) => void;
  onCancelLeave: (leaveId: string) => void;
  tickets: GrievanceTicket[];
  onCreateTicket: (category: GrievanceTicket['category'], subject: string, body: string) => void;
  assignments: AssignmentItem[];
  onSubmitAssignment: (assignmentId: string, fileName: string) => void;
  settings: SystemSettings;
  validCollegeCodes?: { code: string; collegeName: string; scope: string }[];
  feeNotificationLogs?: FeeNotificationLog[];
  attendanceSessions?: AttendanceSession[];
  mentorRequests?: MentorRequest[];
  onRequestMentor?: (mentorId: string, mentorName: string, notes?: string) => void;
  onToast: (msg: string) => void;
  onRefresh?: () => Promise<any>;
  onRecordPayment?: (assignmentId: string, amountPaise: number, mode: PaymentRecord['mode'], reference: string) => void;
}

export const StudentAndParentModule: React.FC<StudentAndParentModuleProps> = React.memo(({
  role,
  activeNav,
  onNavigate,
  profile,
  onUpdateProfile,
  students = [],
  subjects = [],
  timetable = [],
  feeAssignments = [],
  payments = [],
  notices = [],
  onMarkNoticeRead,
  mentorMeetings = [],
  onBookMentorSlot,
  leaveRequests = [],
  onSubmitLeave,
  onCancelLeave,
  tickets = [],
  onCreateTicket,
  assignments = [],
  onSubmitAssignment,
  settings,
  validCollegeCodes = [],
  feeNotificationLogs = [],
  attendanceSessions = [],
  mentorRequests = [],
  onRequestMentor,
  onToast,
  onRefresh,
  onRecordPayment,
}) => {
  const linkedStudents = students.slice(0, 2);
  const [selectedChildId, setSelectedChildId] = useState<string>(linkedStudents[0]?.id || '');
  const matchedStudent =
    role === 'parent'
      ? linkedStudents.find((s) => s.id === selectedChildId) || students[0]
      : students.find(
          (s) =>
            s.profile_id === profile.id ||
            s.id === profile.id ||
            (s.email && s.email.trim().toLowerCase() === profile.email.trim().toLowerCase())
        );

  const activeStudent: StudentRecord = matchedStudent || {
    id: profile.id,
    profile_id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    enrolment_no: profile.identifier_no || '26STU' + profile.id.slice(0, 4).toUpperCase(),
    batch_id: '',
    batch_label: 'Class 2026',
    department_id: '',
    department_code: profile.department || 'CSE',
    current_semester: 1,
    guardian_name: profile.emergency_contact || '',
    mentor_id: '',
    attendance_pct: 0,
    cgpa: 0,
    sgpa: 0,
    fee_status: 'paid',
  };

  const isReadOnlyParent = role === 'parent';

  // Real-time automatic polling when student account is pending approval
  useEffect(() => {
    if (profile.status !== 'active' && onRefresh) {
      const interval = setInterval(() => {
        void onRefresh();
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [profile.status, onRefresh]);

  // Selected Notice for Full-Detail Clickable Modal
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  // Student Join / Switch Unique College Code state
  const [joinCodeModalOpen, setJoinCodeModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState(profile.college_code || '');
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);

  // Attendance Filter
  const [selectedMonth, setSelectedMonth] = useState('2026-10');

  // Mentor Booking Modal State
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingConcern, setBookingConcern] = useState('');

  // Parent Link Code Modal State
  const [linkCodeModalOpen, setLinkCodeModalOpen] = useState(false);
  const [parentLinkCodeInput, setParentLinkCodeInput] = useState('');

  // Payment Modal State
  const [demoPaymentModalOpen, setDemoPaymentModalOpen] = useState(false);
  const [selectedPaymentAssignmentId, setSelectedPaymentAssignmentId] = useState<string | undefined>(undefined);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedFeeAssignment, setSelectedFeeAssignment] = useState<FeeAssignment | null>(null);
  const [studentEmailPreview, setStudentEmailPreview] = useState<FeeNotificationLog | null>(null);

  // Leave Form State (No attachments per institutional policy)
  const [leaveType, setLeaveType] = useState<LeaveRequestItem['type']>('Medical');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveExamDay, setLeaveExamDay] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Faculty Mentoring Selection State
  const [mentorModalOpen, setMentorModalOpen] = useState(false);
  const [selectedFacultyForRequest, setSelectedFacultyForRequest] = useState<any>(null);
  const [mentorRequestNotes, setMentorRequestNotes] = useState('');

  // Timetable Day Filter State (Default to current weekday if Mon-Sat, else all)
  const currentWeekday = new Date().getDay();
  const initialTimetableDay = currentWeekday >= 1 && currentWeekday <= 6 ? String(currentWeekday) : 'all';
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<string>(initialTimetableDay);

  // Profile Edit State
  const [phoneInput, setPhoneInput] = useState(profile.phone);
  const [emergencyInput, setEmergencyInput] = useState(profile.emergency_contact || '');

  // Ticket Modal State
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedDetailTicket, setSelectedDetailTicket] = useState<GrievanceTicket | null>(null);
  const [ticketCat, setTicketCat] = useState<GrievanceTicket['category']>('Attendance');
  const [ticketSubj, setTicketSubj] = useState('');
  const [ticketBody, setTicketBody] = useState('');

  // Scoped notices for the student's joined college platform
  const collegeScopedNotices = notices.filter(
    (n) =>
      !n.college_code ||
      !profile.college_code ||
      (n.college_code || '').trim().toUpperCase() === (profile.college_code || '').trim().toUpperCase()
  );

  // Filtered student records with robust identity matching
  const safeFeeAssignments = Array.isArray(feeAssignments) ? feeAssignments : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeLeaveRequests = Array.isArray(leaveRequests) ? leaveRequests : [];
  const safeMentorMeetings = Array.isArray(mentorMeetings) ? mentorMeetings : [];

  const isMatchForStudent = (id?: string, enr?: string, name?: string) => {
    if (!id && !enr && !name) return false;
    const matchesId = Boolean(
      id && (
        id === activeStudent.id ||
        id === activeStudent.profile_id ||
        id === profile.id
      )
    );
    const matchesEnr = Boolean(
      enr && (
        enr.trim().toLowerCase() === (activeStudent.enrolment_no || '').trim().toLowerCase() ||
        enr.trim().toLowerCase() === (profile.identifier_no || '').trim().toLowerCase()
      )
    );
    const matchesName = Boolean(
      name && (
        name.trim().toLowerCase() === (activeStudent.full_name || '').trim().toLowerCase() ||
        name.trim().toLowerCase() === (profile.full_name || '').trim().toLowerCase()
      )
    );
    return matchesId || matchesEnr || matchesName;
  };

  const studentFees = Array.from(
    new Map(
      safeFeeAssignments
        .filter((f) => f && (isMatchForStudent(f.student_id) || (f.student_name && isMatchForStudent(undefined, undefined, f.student_name))))
        .map((f) => [f.id, f])
    ).values()
  );
  const studentPayments = safePayments.filter((p) => p && isMatchForStudent(p.student_id, p.enrolment_no, p.student_name));
  const studentLeaves = safeLeaveRequests.filter((l) => l && (isMatchForStudent(l.applicant_student_id, l.enrolment_no, l.applicant_name) || isMatchForStudent(l.applicant_profile_id)));
  const studentMentorMeetings = safeMentorMeetings.filter((m) => m && (isMatchForStudent(m.student_id) || isMatchForStudent(undefined, undefined, m.student_name)));

  const feeSummary = summarizeStudentLedgerPaise(studentFees, '2026-10-22', studentPayments);
  const sgpa = calculateCreditWeightedSGPA(subjects || []);

  // Dynamically blend real-time attendance sessions into subject stats
  const computedSubjects = useMemo(() => {
    const studentKeys = [
      activeStudent.id,
      profile.id,
      activeStudent.profile_id,
      activeStudent.enrolment_no,
      profile.identifier_no,
    ].filter(Boolean) as string[];

    return (subjects || []).map((sub) => {
      // Find all conducted sessions for this subject (ignore drafts/cancelled)
      const validSessions = (attendanceSessions || []).filter(
        (ses) =>
          ses &&
          ses.records &&
          (ses as any).status !== 'draft' &&
          (ses as any).status !== 'cancelled' &&
          (ses.subject_code === sub.code || ses.subject_name === sub.name)
      );

      // Deduplicate sessions by id
      const uniqueSessions = Array.from(new Map(validSessions.map((s) => [s.id, s])).values());

      if (uniqueSessions.length === 0) {
        // If no official sessions recorded, use static sub values safely or 0
        const staticHeld = Math.max(0, Number(sub.classes_held) || 0);
        const staticAttended = Math.min(staticHeld, Math.max(0, Number(sub.classes_attended) || 0));
        return {
          ...sub,
          classes_held: staticHeld,
          classes_attended: staticAttended,
        };
      }

      let dynamicHeld = 0;
      let dynamicAttended = 0;

      uniqueSessions.forEach((ses) => {
        let st: string | undefined;
        for (const k of studentKeys) {
          if (ses.records[k]) {
            st = ses.records[k];
            break;
          }
        }

        if (!st) {
          const lowerKeys = studentKeys.map((k) => k.toLowerCase());
          for (const [recKey, val] of Object.entries(ses.records)) {
            if (lowerKeys.includes(recKey.toLowerCase())) {
              st = val as string;
              break;
            }
          }
        }

        // Each official conducted session counts as 1 held class
        dynamicHeld += 1;

        // When student is marked Present, On Duty, Approved Leave, or Late, increment attended
        if (st === 'Present' || st === 'On Duty' || st === 'Approved Leave' || st === 'Late') {
          dynamicAttended += 1;
        }
      });

      return {
        ...sub,
        classes_held: dynamicHeld,
        classes_attended: dynamicAttended,
      };
    });
  }, [subjects, attendanceSessions, activeStudent.id, profile.id, activeStudent.profile_id, activeStudent.enrolment_no, profile.identifier_no]);

  const totalClassesHeld = computedSubjects.reduce((a, b) => a + b.classes_held, 0);
  const totalClassesAttended = computedSubjects.reduce((a, b) => a + b.classes_attended, 0);
  const overallAttendance = calculateAttendanceAllowance(
    totalClassesAttended,
    totalClassesHeld,
    settings.minimum_attendance_pct
  );

  const studentSessionsList = useMemo(() => {
    return (attendanceSessions || [])
      .map((ses) => {
        const status =
          ses.records?.[activeStudent.id] ||
          ses.records?.[profile.id] ||
          (activeStudent.profile_id && ses.records?.[activeStudent.profile_id]) ||
          (activeStudent.enrolment_no && ses.records?.[activeStudent.enrolment_no]);
        return { ...ses, studentStatus: status };
      })
      .filter((s) => Boolean(s.studentStatus));
  }, [attendanceSessions, activeStudent.id, profile.id, activeStudent.profile_id, activeStudent.enrolment_no]);

  const hallTicketBlockedByFees =
    settings.block_hall_ticket_on_overdue_fees && feeSummary.totalOverduePaise > 0;

  const handleJoinCollegeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinCodeError(null);
    const normalized = joinCodeInput.trim().toUpperCase();
    if (!normalized) {
      setJoinCodeError('Please enter the Unique College Code shared by your College Organizer.');
      return;
    }
    const matched = validCollegeCodes.find((c) => (c.code || '').trim().toUpperCase() === normalized);
    if (!matched) {
      setJoinCodeError(
        `Invalid College Code "${normalized}". Please ask your College Organizer for their active Unique College Code.`
      );
      return;
    }

    onUpdateProfile({
      college_code: matched.code.toUpperCase(),
      college_name: matched.collegeName,
      status: 'pending',
    });
    setJoinCodeModalOpen(false);
    onToast(
      `Requested to join ${matched.collegeName} (${matched.code}). Waiting for College Organizer approval.`
    );
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyParent) return;
    setLeaveError(null);

    const start = new Date(leaveFrom).getTime();
    const end = new Date(leaveTo).getTime();
    if (end < start) {
      setLeaveError('End date must be on or after start date.');
      return;
    }
    if (leaveReason.trim().length < 10) {
      setLeaveError('Please provide a clear reason (at least 10 characters).');
      return;
    }
    const daysCount = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const requiresHod = daysCount > 3 || leaveExamDay;

    onSubmitLeave({
      applicant_profile_id: profile.id,
      applicant_student_id: activeStudent.id,
      applicant_name: activeStudent.full_name,
      applicant_role: 'student',
      enrolment_no: activeStudent.enrolment_no,
      type: leaveType,
      from_date: leaveFrom,
      to_date: leaveTo,
      days_count: daysCount,
      falls_on_exam_day: leaveExamDay,
      requires_hod: requiresHod,
      reason: leaveReason.trim(),
    });

    setLeaveReason('');
    setLeaveFrom('');
    setLeaveTo('');
    setLeaveExamDay(false);
    onToast(
      `Leave application submitted (${daysCount} day${daysCount > 1 ? 's' : ''}). Routed to Mentor${
        requiresHod ? ' & HOD (>3 days / exam rule)' : ''
      }.`
    );
  };

  const renderParentSwitcherBar = () => {
    if (role !== 'parent') return null;
    return (
      <GlassCard padding="sm" className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-muted">Linked Ward Switcher:</span>
          {linkedStudents.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => setSelectedChildId(child.id)}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeStudent.id === child.id
                  ? 'bg-accent text-white'
                  : 'glass-pill text-ink hover:border-accent'
              }`}
            >
              {child.full_name} · {child.enrolment_no} (Sem {child.current_semester})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="neutral">Read-Only Guardian Policy</Badge>
          <Button variant="secondary" size="sm" onClick={() => setLinkCodeModalOpen(true)}>
            Link Another Ward Code
          </Button>
        </div>
      </GlassCard>
    );
  };

  const renderNoticeModal = () => (
    <NoticeDetailModal
      notice={
        selectedNotice
          ? notices.find((item) => item.id === selectedNotice.id) || selectedNotice
          : null
      }
      onClose={() => setSelectedNotice(null)}
      onMarkRead={(noticeId) => {
        onMarkNoticeRead(noticeId);
        onToast('Announcement acknowledged and marked as read.');
      }}
    />
  );

  const renderPaymentModal = () => (
    <ModalDialog
      open={paymentModalOpen}
      onClose={() => setPaymentModalOpen(false)}
      title="Demo Payment Gateway"
      description="Pay fee installment using simulated payment methods (Demo Only)."
    >
      <div className="space-y-4">
        <p className="text-xs text-muted">
          This is a demonstration payment gateway. No real money will be processed.
        </p>
        <Button 
          variant="primary" 
          onClick={() => {
            onToast("Simulated payment successful!");
            setPaymentModalOpen(false);
          }}
        >
          Complete Demo Payment
        </Button>
      </div>
    </ModalDialog>
  );

  // =========================================================================
  // STUDENT APPROVAL GATE — Unapproved students can sign in & enter the portal
  // shell, but cannot access any portal page until the College Organizer approves
  // =========================================================================
  if (role === 'student' && profile.status !== 'active') {
    const isSuspended = profile.status === 'suspended';
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={
            profile.college_name
              ? `${profile.college_name} · ${profile.college_code || 'CAMPUS'}`
              : 'STUDENT ACCESS GATE'
          }
          title={`Welcome, ${profile.full_name}`}
          subtitle={
            isSuspended
              ? 'Your student account access has been suspended by the College Organizer.'
              : 'You have signed in successfully. Your account is awaiting approval from your College Organizer before portal pages unlock.'
          }
          actions={
            <Badge tone="warning" dot>
              Awaiting Organizer Approval
            </Badge>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <GlassCard equalHeight padding="lg" className="lg:col-span-7 justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-[var(--border)] ${
                      isSuspended
                        ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                        : 'bg-[var(--warning-soft)] text-[var(--warning)]'
                    }`}
                  >
                    <Lock className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <Badge tone={isSuspended ? 'danger' : 'warning'} dot>
                      {isSuspended
                        ? 'Account Suspended by Organizer'
                        : 'Pending College Organizer Approval'}
                    </Badge>
                    <h2 className="mt-1 text-lg font-bold text-[var(--text)]">
                      {isSuspended
                        ? 'Portal Pages Restricted'
                        : 'All Portal Pages Are Locked Until Organizer Approval'}
                    </h2>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                {isSuspended ? (
                  <>
                    Your student profile in{' '}
                    <strong className="text-[var(--text)]">
                      {profile.college_name || 'your institution'}
                    </strong>{' '}
                    is currently marked as suspended. Please contact your College Organizer or
                    Academic Office to restore access.
                  </>
                ) : (
                  <>
                    Your registration under{' '}
                    <strong className="text-[var(--text)]">
                      {profile.college_name || 'your institution'}
                    </strong>{' '}
                    {profile.college_code ? (
                      <>
                        with Unique College Code{' '}
                        <code className="font-mono font-bold text-[var(--accent-text)]">
                          {profile.college_code}
                        </code>{' '}
                      </>
                    ) : null}
                    has been recorded in the College Student Directory. As soon as your{' '}
                    <strong className="text-[var(--text)]">College Organizer</strong> clicks{' '}
                    <strong className="text-[var(--text)]">Approve Student</strong> on their
                    dashboard, all sidebar modules will unlock immediately.
                  </>
                )}
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs">
                <div>
                  <div className="text-[var(--text-muted)]">Registered Student Name</div>
                  <div className="mt-0.5 font-semibold text-[var(--text)]">{profile.full_name}</div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Enrolment / Roll Number</div>
                  <div className="mt-0.5 font-mono font-semibold text-[var(--accent-text)]">
                    {profile.identifier_no || activeStudent.enrolment_no}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Registered Email</div>
                  <div className="mt-0.5 font-mono text-[var(--text)]">{profile.email}</div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Connected College Code</div>
                  <div className="mt-0.5 font-mono font-bold text-[var(--accent-text)]">
                    {profile.college_code || 'NOT SET'} · {profile.college_name || 'No College'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <span className="text-xs text-[var(--text-muted)]">
                Tip: The College Organizer can approve you from their Dashboard or User &amp; Role Registry.
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  if (onRefresh) {
                    await onRefresh();
                  }
                  onToast(
                    profile.status === 'active'
                      ? 'Your account is now approved! Welcome to the portal.'
                      : 'Still awaiting College Organizer approval. Ask your College Organizer to approve your student account.'
                  );
                }}
              >
                <ShieldCheck className="h-4 w-4" strokeWidth={1.85} />
                <span>Check Approval Status</span>
              </Button>
            </div>
          </GlassCard>

          <GlassCard equalHeight padding="lg" className="lg:col-span-5 justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="text-base font-bold text-[var(--text)]">
                  Locked Campus Modules (9)
                </h3>
                <Badge tone="neutral">Unlocks on Approval</Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                The following student portal pages are currently locked and will become accessible
                once your College Organizer approves your registration:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  'Academic Dashboard & Attendance Alerts',
                  'Attendance Register & Subject Breakdown',
                  'Marks, SGPA / CGPA & Report Card PDF',
                  'Weekly Academic Timetable & Classrooms',
                  'Fee Ledger, Dues & Official PDF Receipts',
                  'Circulars & College Announcements',
                  'Faculty Mentoring & Counseling Slot Booking',
                  'Student Leave Applications & Approval Chain',
                  'Coursework & Lab PDF Submissions + Helpdesk',
                ].map((modLabel) => (
                  <div
                    key={modLabel}
                    className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-[var(--text-2)]">{modLabel}</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--text-muted)]">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Join / Switch College Code Modal */}
        <ModalDialog
          open={joinCodeModalOpen}
          onClose={() => setJoinCodeModalOpen(false)}
          title="Connect to Your College Organizer's Code"
          description="Enter the Unique College Code generated by your College Organizer so your account appears in their approval queue."
        >
          <form onSubmit={handleJoinCollegeSubmit} className="space-y-4">
            {joinCodeError && (
              <div className="rounded-[10px] border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger)]">
                {joinCodeError}
              </div>
            )}
            <Input
              label="Unique College Code *"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g., COLL-1234"
              required
            />
            {validCollegeCodes.length > 0 && (
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3 space-y-2">
                <div className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Active College Organizer Codes:
                </div>
                <div className="flex flex-wrap gap-2">
                  {validCollegeCodes.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setJoinCodeInput(c.code)}
                      className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--accent-text)] hover:border-[var(--accent)] cursor-pointer"
                    >
                      {c.code} ({c.collegeName})
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setJoinCodeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save College Code
              </Button>
            </div>
          </form>
        </ModalDialog>
      </div>
    );
  }

  // 1. DASHBOARD OR CHILD OVERVIEW
  if (activeNav === 'dashboard' || activeNav === 'child-overview') {
    const lowSubjects = subjects.filter(
      (s) =>
        s.classes_held > 0 &&
        (s.classes_attended / s.classes_held) * 100 < settings.warning_attendance_pct
    );

    const isPendingApproval = profile.status === 'pending';
    const isSuspended = profile.status === 'suspended';

    return (
      <div className="space-y-6">
        {renderParentSwitcherBar()}

        {/* Page Header */}
        <PageHeader
          eyebrow={
            profile.college_name
              ? `${profile.college_name} · ${profile.college_code || 'CAMPUS'}`
              : 'STUDENT ACADEMIC WORKSPACE'
          }
          title={`Welcome, ${profile.full_name}`}
          subtitle={
            profile.college_code
              ? `Connected to ${profile.college_name || 'your institution'} via Unique Code ${profile.college_code}.`
              : 'Enter the Unique College Code generated by your College Organizer to join your college platform.'
          }
          actions={
            <Button variant="primary" size="md" onClick={() => onNavigate('notices')}>
              <Bell className="h-4 w-4" strokeWidth={1.85} />
              <span>View Announcements ({collegeScopedNotices.length})</span>
            </Button>
          }
        />

        {/* Organizer Approval Status Banner for Student */}
        {isPendingApproval && (
          <GlassCard
            variant="strong"
            padding="md"
            className="border-amber-500/40 bg-amber-500/5"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3.5">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--warning-soft)] text-[var(--warning)]">
                  <Clock className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-ink">
                      Awaiting College Organizer Approval
                    </h2>
                    <Badge tone="warning" dot>
                      Pending Organizer Approval
                    </Badge>
                    {profile.college_code && (
                      <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-xs font-semibold text-accent">
                        {profile.college_code}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Your request to join{' '}
                    <strong className="text-ink">
                      {profile.college_name || 'this college platform'}
                    </strong>{' '}
                    with code{' '}
                    <code className="font-mono font-semibold text-ink">
                      {profile.college_code || 'N/A'}
                    </code>{' '}
                    has been sent to the College Organizer. Once the Organizer clicks{' '}
                    <strong>Approve &amp; Allow</strong> on their dashboard, your membership status
                    will automatically update to <strong>Active</strong> in real time.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {isSuspended && (
          <GlassCard variant="strong" padding="md" className="border-rose-500/40 bg-rose-500/5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <Badge tone="danger" dot>
                  Membership Request Declined / Suspended
                </Badge>
                <p className="mt-1 text-xs text-muted">
                  Your college access request was not approved by the Organizer. Please contact your College Organizer.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {!isPendingApproval && !isSuspended && profile.college_code && (
          <GlassCard padding="sm" className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--success-soft)] text-[var(--success)]">
                <ShieldCheck className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <span className="font-semibold text-ink">
                  Approved Member of {profile.college_name || 'Institutional Platform'}
                </span>
                <span className="mx-2 text-muted">·</span>
                <span className="font-mono text-xs font-semibold text-accent">
                  Code: {profile.college_code}
                </span>
              </div>
            </div>
            <Badge tone="success" dot>
              Organizer Approved &amp; Active
            </Badge>
          </GlassCard>
        )}

        {/* Row 1: 4 Equal StatTiles */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          <StatTile
            label="Aggregate Attendance"
            value={totalClassesHeld === 0 ? '0%' : `${overallAttendance.currentPct}%`}
            icon={UserCheck}
            tone={
              totalClassesHeld === 0
                ? 'info'
                : overallAttendance.status === 'critical'
                  ? 'danger'
                  : overallAttendance.status === 'warning'
                    ? 'warning'
                    : 'success'
            }
            delta={
              totalClassesHeld === 0
                ? '0/0 classes · No classes conducted yet'
                : `${totalClassesAttended}/${totalClassesHeld} classes · Margin ${overallAttendance.canStillMiss}`
            }
            onClick={() => onNavigate('attendance')}
          />
          <StatTile
            label="College Announcements"
            value={collegeScopedNotices.length}
            icon={Bell}
            tone="accent"
            delta={
              collegeScopedNotices.length > 0
                ? 'Click any circular to view full details'
                : 'Published by your Organizer'
            }
            onClick={() => onNavigate('notices')}
          />
          <StatTile
            label="Outstanding Fee Due"
            value={formatPaiseToINR(feeSummary.totalDuePaise)}
            icon={Receipt}
            tone={feeSummary.totalDuePaise > 0 ? 'warning' : 'success'}
            delta={`Paid: ${formatPaiseToINR(feeSummary.totalPaidPaise)}`}
            onClick={() => onNavigate('fees')}
          />
          <StatTile
            label="Credit-Weighted CGPA"
            value={activeStudent.cgpa.toFixed(2)}
            icon={BookOpen}
            tone="info"
            delta={`Current SGPA: ${sgpa.toFixed(2)}`}
            onClick={() => onNavigate('results')}
          />
        </div>

        {/* Shortage Warning Banner */}
        {lowSubjects.length > 0 && (
          <GlassCard padding="md" className="border-rose-500/40">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <Badge tone="danger" dot>
                  Statutory Attendance Alert (&lt;{settings.minimum_attendance_pct}%)
                </Badge>
                <p className="text-sm text-ink">
                  <strong>{activeStudent.full_name}</strong> is below the minimum{' '}
                  {settings.minimum_attendance_pct}% requirement in{' '}
                  <strong>
                    {lowSubjects
                      .map(
                        (s) =>
                          `${s.code} (${((s.classes_attended / s.classes_held) * 100).toFixed(1)}%)`
                      )
                      .join(', ')}
                  </strong>
                  .
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => onNavigate('attendance')}>
                Open Attendance Calculator
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Row 2: 12-Col Equal-Height Grid — Left: Clickable Organizer Announcements (7 cols) | Right: College Membership & Mentor (5 cols) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          {/* Left 7 Cols: Clickable Official Announcements from College Organizer */}
          <div className="lg:col-span-7 flex flex-col">
            <GlassCard equalHeight padding="lg" className="justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[17px] font-semibold text-ink">
                        College Organizer Announcements &amp; Circulars
                      </h2>
                      <Badge tone="accent">{collegeScopedNotices.length}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      Click any announcement below to read full details, publisher info, and download
                      the official circular.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onNavigate('notices')}>
                    View All →
                  </Button>
                </div>

                {collegeScopedNotices.length > 0 ? (
                  <div className="mt-4 max-h-[380px] overflow-y-auto pr-1.5 space-y-3 scrollbar-thin">
                    {collegeScopedNotices.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setSelectedNotice(n)}
                        className="group w-full rounded-[14px] border border-line bg-surface/50 p-4 text-left transition-all hover:border-accent hover:bg-surface cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
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
                            {n.college_code && (
                              <span className="font-mono text-[11px] font-semibold text-accent">
                                {n.college_code}
                              </span>
                            )}
                            <span className="font-mono text-[11px] text-muted tabular-nums">
                              {new Date(n.publish_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:translate-x-0.5 transition-transform">
                            <span>View Full Details</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-ink group-hover:text-accent transition-colors break-words">
                          {n.title}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted break-words">
                          {n.body}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
                          <span className="truncate max-w-[240px]">
                            Published by <strong className="text-ink">{n.created_by_name}</strong> (
                            {n.created_by_role})
                          </span>
                          {n.is_read ? (
                            <span className="text-[var(--success)] font-medium shrink-0">
                              Read ✓
                            </span>
                          ) : (
                            <span className="text-accent font-medium shrink-0">Click to open &amp; acknowledge</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[14px] border border-dashed border-line p-8 text-center">
                    <Bell className="mx-auto h-7 w-7 text-muted" strokeWidth={1.6} />
                    <div className="mt-2 text-sm font-semibold text-ink">
                      No Announcements Published Yet
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      When your College Organizer publishes circulars or announcements for{' '}
                      {profile.college_code || 'your college'}, they will appear here and can be
                      clicked for full details.
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Right 5 Cols: College Code Connection + Faculty Mentor */}
          <div className="lg:col-span-5 flex flex-col">
            <GlassCard equalHeight padding="lg" className="justify-between gap-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div>
                    <h2 className="text-[17px] font-semibold text-ink">
                      College Platform &amp; Mentor
                    </h2>
                    <p className="mt-0.5 text-xs text-muted">
                      Verified institution code &amp; academic advising
                    </p>
                  </div>
                  <Building2 className="h-5 w-5 text-accent" strokeWidth={1.75} />
                </div>

                <div className="rounded-[14px] border border-line bg-surface/50 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">Joined Institution</span>
                    <Badge
                      tone={
                        profile.status === 'active'
                          ? 'success'
                          : profile.status === 'pending'
                            ? 'warning'
                            : 'danger'
                      }
                      dot
                    >
                      {profile.status === 'active'
                        ? 'Approved'
                        : profile.status === 'pending'
                          ? 'Pending Approval'
                          : 'Suspended'}
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-ink">
                    {profile.college_name || 'No College Platform Joined'}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-xs font-semibold text-accent">
                      Code: {profile.college_code || 'NONE'}
                    </span>
                  </div>
                </div>

                <div className="rounded-[14px] border border-line bg-surface/50 p-4 space-y-2">
                  <div className="text-xs font-medium text-muted">Assigned Faculty Mentor</div>
                  <div className="text-sm font-bold text-ink">
                    {activeStudent.mentor_id
                      ? `Mentor ID: ${activeStudent.mentor_id}`
                      : 'No Faculty Mentor Assigned Yet'}
                  </div>
                  <p className="text-xs text-muted">
                    {activeStudent.mentor_id
                      ? 'Assigned Departmental Faculty Advisor'
                      : 'Your department HOD or Organizer will assign a faculty advisor to your batch.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {!isReadOnlyParent && (
                  <Button variant="primary" size="sm" onClick={() => setBookingOpen(true)}>
                    Book Mentoring Slot
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => onNavigate('mentor')}>
                  View Shared Notes
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Row 3: Equal-Height Subject Attendance Chart (7 cols) + Today's Schedule (5 cols) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col">
            <GlassCard equalHeight padding="lg" className="justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div>
                    <h2 className="text-[17px] font-semibold text-ink">
                      Subject-Wise Attendance &amp; Benchmark
                    </h2>
                    <p className="text-xs text-muted">
                      Minimum statutory requirement: {settings.minimum_attendance_pct}% per subject
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onNavigate('attendance')}>
                    Full Register →
                  </Button>
                </div>

                {computedSubjects.length > 0 ? (
                  <div className="mt-5 h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={computedSubjects.map((s) => ({
                          code: s.code,
                          attendance:
                            s.classes_held > 0
                              ? Number(((s.classes_attended / s.classes_held) * 100).toFixed(1))
                              : 0,
                          classAvg: s.class_average_pct,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                        <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <RechartsTooltip />
                        <Bar
                          dataKey="attendance"
                          name="Your Attendance %"
                          fill="#4F46E5"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="classAvg"
                          name="Class Average %"
                          fill="#06B6D4"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[14px] border border-dashed border-line p-6 text-center text-xs text-muted">
                    No enrolled subjects or attendance sessions recorded yet.
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <GlassCard equalHeight padding="lg" className="justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div>
                    <h2 className="text-[17px] font-semibold text-ink">
                      Today’s Lecture Schedule
                    </h2>
                    <p className="text-xs text-muted">{activeStudent.batch_label}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onNavigate('timetable')}>
                    Weekly Grid →
                  </Button>
                </div>

                {timetable.length > 0 ? (
                  <div className="mt-4 divide-y divide-line">
                    {timetable.slice(0, 4).map((slot) => (
                      <div
                        key={slot.id}
                        className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="font-mono text-xs font-semibold tabular-nums text-accent">
                            {slot.start_time} – {slot.end_time}
                          </div>
                          <div className="text-sm font-medium text-ink">
                            {slot.subject_code} · {slot.subject_name}
                          </div>
                          <div className="text-xs text-muted">
                            {slot.faculty_name} · Room {slot.room}
                          </div>
                        </div>
                        <Badge tone="neutral">P{slot.period}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[14px] border border-dashed border-line p-6 text-center text-xs text-muted">
                    No lecture or laboratory schedule assigned yet.
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Join / Switch College Code Modal */}
        <ModalDialog
          open={joinCodeModalOpen}
          onClose={() => setJoinCodeModalOpen(false)}
          title="Join College Platform via Organizer Unique Code"
          description="Enter the Unique College Code generated by your College Organizer. Your membership request will be sent to the Organizer for approval."
        >
          <form onSubmit={handleJoinCollegeSubmit} className="space-y-4">
            {joinCodeError && (
              <div className="rounded-[12px] border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-xs font-medium text-[var(--danger)]">
                {joinCodeError}
              </div>
            )}
            <Input
              label="Unique College Code *"
              placeholder="e.g., COLL-1234"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              className="font-mono uppercase"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setJoinCodeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Submit &amp; Request Organizer Approval
              </Button>
            </div>
          </form>
        </ModalDialog>

        {/* Mentor Slot Modal */}
        <ModalDialog
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          title="Book Faculty Mentoring Slot"
          description="Schedule a 20-minute academic advising session with your assigned faculty mentor."
        >
          <div className="space-y-4">
            <Input
              label="Preferred Office Hours Date"
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />
            <Input
              label="Agenda / Discussion Topic"
              placeholder="e.g., Academic progress review and course planning"
              value={bookingConcern}
              onChange={(e) => setBookingConcern(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setBookingOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onBookMentorSlot(
                    bookingDate || new Date().toISOString().slice(0, 10),
                    bookingConcern || 'Academic progress & attendance review'
                  );
                  setBookingOpen(false);
                  setBookingConcern('');
                  onToast('Mentoring slot request submitted.');
                }}
              >
                Confirm Slot Booking
              </Button>
            </div>
          </div>
        </ModalDialog>

        {/* Parent Single-Use Link Code Modal */}
        <ModalDialog
          open={linkCodeModalOpen}
          onClose={() => setLinkCodeModalOpen(false)}
          title="Link Additional Student via Single-Use Code"
          description="Enter the single-use link code generated from your child's Student Profile."
        >
          <div className="space-y-4">
            <Input
              label="Single-Use Student Link Code"
              placeholder="e.g., LNK-24CSE009-82C"
              value={parentLinkCodeInput}
              onChange={(e) => setParentLinkCodeInput(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setLinkCodeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setLinkCodeModalOpen(false);
                  setParentLinkCodeInput('');
                  onToast('Parent link request submitted to Academic Office verification queue.');
                }}
              >
                Submit for Office Approval
              </Button>
            </div>
          </div>
        </ModalDialog>

        {renderNoticeModal()}
      </div>
    );
  }

  // 2. ATTENDANCE PAGE
  if (activeNav === 'attendance') {
    return (
      <div className="space-y-6">
        {renderParentSwitcherBar()}

        <PageHeader
          eyebrow="ATTENDANCE REGISTER"
          title="Subject-Wise Attendance & Margin Calculator"
          subtitle={`Calculates exact classes you can still miss while staying above ${settings.minimum_attendance_pct}%.`}
          actions={
            <Select
              options={[
                { value: '2026-10', label: 'Current Month' },
                { value: '2026-09', label: 'Previous Month' },
              ]}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          }
        />

        {computedSubjects.length === 0 ? (
          <EmptyState
            title="No Attendance Records Yet"
            description="Subject-wise attendance percentages and margin calculations will appear here once your teachers start recording attendance sessions."
          />
        ) : (
          <div className="space-y-6">
            {/* Top Stat Tiles Overview */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
              <StatTile
                label="Classes Held"
                value={totalClassesHeld}
                icon={BookOpen}
                tone="accent"
                footerText="Officially conducted sessions"
              />
              <StatTile
                label="Classes Attended"
                value={totalClassesAttended}
                icon={CheckCircle2}
                tone="success"
                footerText="Present, OD & Approved Leaves"
              />
              <StatTile
                label="Classes Missed"
                value={Math.max(0, totalClassesHeld - totalClassesAttended)}
                icon={Clock}
                tone={totalClassesHeld - totalClassesAttended > 0 ? 'warning' : 'info'}
                footerText="Recorded absences"
              />
              <StatTile
                label="Overall Attendance"
                value={overallAttendance.noClassesHeld ? '0%' : `${overallAttendance.currentPct}%`}
                icon={overallAttendance.currentPct >= settings.minimum_attendance_pct ? CheckCircle2 : AlertCircle}
                tone={
                  overallAttendance.noClassesHeld
                    ? 'info'
                    : overallAttendance.currentPct >= settings.minimum_attendance_pct
                      ? 'success'
                      : 'danger'
                }
                delta={
                  overallAttendance.noClassesHeld
                    ? 'No classes yet'
                    : overallAttendance.currentPct >= settings.minimum_attendance_pct
                      ? `Eligible (Threshold: ${settings.minimum_attendance_pct}%)`
                      : `Must attend ${overallAttendance.mustAttendToRecover} more classes`
                }
              />
            </div>

            {/* Redesigned Subject-Wise Calculator Table */}
            <GlassCard padding="none" className="overflow-hidden">
              <div className="p-4 border-b border-line flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    Subject-Wise Attendance &amp; Margin Calculator
                  </h3>
                  <p className="text-xs text-muted">
                    Institutional Requirement: Minimum {settings.minimum_attendance_pct}% attendance required for examination hall ticket eligibility.
                  </p>
                </div>
                <Badge tone="accent">{computedSubjects.length} Registered Subjects</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface/50 text-xs text-muted">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold min-w-[200px]">Subject Name</th>
                      <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Classes Held</th>
                      <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Classes Attended</th>
                      <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Classes Missed</th>
                      <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap min-w-[140px]">Attendance %</th>
                      <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Required %</th>
                      <th className="px-5 py-3.5 font-semibold min-w-[240px]">Attendance Margin &amp; Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {computedSubjects.map((sub) => {
                      const held = Math.max(0, Number(sub.classes_held) || 0);
                      const attended = Math.min(held, Math.max(0, Number(sub.classes_attended) || 0));
                      const missed = Math.max(0, held - attended);
                      const minPct = settings.minimum_attendance_pct || 75;
                      const calc = calculateAttendanceAllowance(attended, held, minPct);
                      const noClasses = held === 0 || calc.noClassesHeld;

                      return (
                        <tr key={sub.id} className="hover:bg-surface/40 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-ink">
                              {sub.name}
                            </div>
                            <div className="text-xs text-muted font-mono mt-0.5">
                              {sub.code} · {sub.faculty_name || 'Faculty Instructor'}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-mono text-sm font-semibold tabular-nums text-ink">
                            {held}
                          </td>
                          <td className="px-4 py-4 text-center font-mono text-sm font-semibold tabular-nums text-success">
                            {attended}
                          </td>
                          <td className="px-4 py-4 text-center font-mono text-sm font-semibold tabular-nums text-muted">
                            {missed}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="font-mono text-sm font-bold tabular-nums text-ink">
                              {noClasses ? '0%' : `${calc.currentPct}%`}
                            </div>
                            <div className="mt-1 h-1.5 w-full rounded-full bg-line overflow-hidden mx-auto max-w-[100px]">
                              <div
                                className={`h-full ${
                                  noClasses
                                    ? 'bg-muted/40'
                                    : calc.status === 'critical'
                                      ? 'bg-danger'
                                      : calc.status === 'warning'
                                        ? 'bg-warning'
                                        : 'bg-success'
                                }`}
                                style={{ width: noClasses ? '0%' : `${Math.min(100, calc.currentPct)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-mono text-xs tabular-nums text-muted">
                            {minPct}%
                          </td>
                          <td className="px-5 py-4">
                            {noClasses ? (
                              <Badge tone="neutral">No classes conducted yet</Badge>
                            ) : calc.status === 'critical' ? (
                              <div className="space-y-1">
                                <Badge tone="danger" dot>
                                  Below Required ({minPct}%)
                                </Badge>
                                <div className="text-[11px] font-medium text-danger">
                                  Must attend next {calc.mustAttendToRecover} consecutive {calc.mustAttendToRecover === 1 ? 'class' : 'classes'} to reach {minPct}%
                                </div>
                              </div>
                            ) : calc.status === 'warning' ? (
                              <div className="space-y-1">
                                <Badge tone="warning" dot>
                                  Near Threshold ({minPct}%)
                                </Badge>
                                <div className="text-[11px] text-muted">
                                  {calc.canStillMiss === 0
                                    ? 'On border · Cannot miss any classes'
                                    : `Safe · Can miss ${calc.canStillMiss} more ${calc.canStillMiss === 1 ? 'class' : 'classes'}`}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Badge tone="success" dot>
                                  Eligible · Safe
                                </Badge>
                                <div className="text-[11px] text-muted">
                                  Margin: Can miss {calc.canStillMiss} more {calc.canStillMiss === 1 ? 'class' : 'classes'}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Real-Time Session Log */}
            <GlassCard padding="lg">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    Recorded Lecture Attendance Sessions ({studentSessionsList.length})
                  </h3>
                  <p className="text-xs text-muted">
                    Individual period registers marked by teachers and synchronized in real time.
                  </p>
                </div>
                <Badge tone="success" dot>
                  Live Synchronized
                </Badge>
              </div>

              {studentSessionsList.length === 0 ? (
                <div className="mt-4 rounded-[14px] border border-dashed border-line p-6 text-center text-xs text-muted">
                  No individual attendance sessions recorded yet for your account.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-line">
                  {studentSessionsList.map((ses) => (
                    <div key={ses.id} className="flex flex-wrap items-center justify-between py-3 gap-3">
                      <div>
                        <div className="font-semibold text-ink text-sm">
                          {ses.subject_name || ses.subject_code} (Period {ses.period})
                        </div>
                        <div className="text-xs text-muted font-mono">
                          Date: {ses.date} · Batch: {ses.batch_label}
                        </div>
                      </div>
                      <Badge
                        tone={
                          ses.studentStatus === 'Present' || ses.studentStatus === 'On Duty'
                            ? 'success'
                            : ses.studentStatus === 'Late'
                              ? 'warning'
                              : 'danger'
                        }
                        dot
                      >
                        {ses.studentStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        )}
      </div>
    );
  }

  // 3. RESULTS, MARKS & REPORT CARDS
  if (activeNav === 'results') {
    if (!settings.results_published) {
      return (
        <EmptyState
          title="Semester Results Not Yet Published"
          description={`Results are hidden until the Academic Office publishes them (Scheduled: ${settings.results_publish_date}).`}
        />
      );
    }

    return (
      <div className="space-y-6">
        {renderParentSwitcherBar()}

        <PageHeader
          eyebrow="EXAMINATION & GRADES"
          title={`Current SGPA: ${sgpa.toFixed(2)} · Cumulative CGPA: ${activeStudent.cgpa.toFixed(2)}`}
          subtitle="Credit-Weighted Formula: SGPA = Sum(Credits × Grade Points) / Sum(Credits)"
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={subjects.length === 0}
                onClick={() => {
                  generateReportCardPDF(activeStudent, subjects, activeStudent.current_semester);
                  onToast('Official Report Card PDF downloaded.');
                }}
              >
                <Download className="h-4 w-4" strokeWidth={1.75} />
                Download Report Card PDF
              </Button>

              {hallTicketBlockedByFees ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    onToast(
                      'Hall Ticket download blocked: Overdue examination fee must be cleared first.'
                    )
                  }
                >
                  <Lock className="h-4 w-4" strokeWidth={1.75} />
                  Hall Ticket Blocked (Overdue Fee)
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={subjects.length === 0}
                  onClick={() => {
                    generateHallTicketPDF(activeStudent, subjects);
                    onToast('Examination Hall Ticket PDF downloaded.');
                  }}
                >
                  <Download className="h-4 w-4" strokeWidth={1.75} />
                  Download Hall Ticket PDF
                </Button>
              )}
            </>
          }
        />

        {subjects.length === 0 ? (
          <EmptyState
            title="No Assessment Marks Recorded Yet"
            description="Internal assessment marks, lab grades, and credit-weighted SGPA will appear here once entered by faculty."
          />
        ) : (
          <GlassCard padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface/50 text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Subject</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Credits</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Internal 1</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Internal 2</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Assignment</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Lab</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Class Avg</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Grade (GP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono text-xs tabular-nums">
                  {subjects.map((s) => (
                    <tr key={s.id} className="hover:bg-surface/40">
                      <td className="px-5 py-4 font-sans">
                        <div className="font-semibold text-ink">
                          {s.code} · {s.name}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">{s.credits}</td>
                      <td className="px-5 py-4 text-right">
                        {s.internal_1_marks}/{s.internal_1_max}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {s.internal_2_marks}/{s.internal_2_max}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {s.assignment_marks}/{s.assignment_max}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {s.lab_marks}/{s.lab_max}
                      </td>
                      <td className="px-5 py-4 text-right text-muted">{s.class_average_pct}%</td>
                      <td className="px-5 py-4 text-right font-semibold text-ink">
                        {s.grade} ({s.grade_points})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  // 4. FEES & RECEIPTS
  if (activeNav === 'fees') {
    return (
      <div className="space-y-6">
        {renderParentSwitcherBar()}

        <PageHeader
          eyebrow="STUDENT FINANCE LEDGER"
          title="Fee Installments & Official Receipts"
          subtitle="All balances and late fines are tracked accurately with downloadable receipts."
          actions={
            feeSummary.totalDuePaise > 0 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedPaymentAssignmentId(undefined);
                  setDemoPaymentModalOpen(true);
                }}
              >
                <CreditCard className="h-4 w-4" strokeWidth={1.85} />
                <span>Pay Outstanding Fees</span>
              </Button>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          <StatTile
            label="Gross Assigned Fees"
            value={formatPaiseToINR(feeSummary.totalGrossPaise)}
            icon={Receipt}
            tone="accent"
            delta={`Concession: -${formatPaiseToINR(feeSummary.totalConcessionPaise)}`}
          />
          <StatTile
            label="Total Paid"
            value={formatPaiseToINR(feeSummary.totalPaidPaise)}
            icon={CheckCircle2}
            tone="success"
            delta="Official receipts verified"
          />
          <StatTile
            label="Accrued Late Fine"
            value={formatPaiseToINR(feeSummary.totalFinePaise)}
            icon={Clock}
            tone="warning"
            delta="Auto-computed by due date"
          />
          <StatTile
            label="Net Outstanding Due"
            value={formatPaiseToINR(feeSummary.totalDuePaise)}
            icon={Receipt}
            tone={feeSummary.totalDuePaise > 0 ? 'danger' : 'success'}
            delta={`Overdue: ${formatPaiseToINR(feeSummary.totalOverduePaise)}`}
          />
        </div>

        {/* Installment Schedule */}
        <GlassCard padding="none" className="overflow-hidden">
          <div className="border-b border-line px-6 py-4">
            <h3 className="text-base font-semibold text-ink">
              Fee Installment Schedule &amp; Fine Breakdown
            </h3>
          </div>
          {studentFees.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No fee installments assigned to this account yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface/50 text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Fee Head</th>
                    <th className="px-5 py-3.5 font-semibold">Due Date</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Net Principal</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Late Fine</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Paid</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Balance</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {studentFees.map((f) => {
                    const c = calculateAssignmentBalancePaise(
                      f,
                      new Date().toISOString().slice(0, 10),
                      studentPayments
                    );
                    return (
                      <tr key={f.id} className="hover:bg-surface/40">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-ink">{f.title}</div>
                          {f.concession_reason && (
                            <div className="text-xs text-success">
                              Scholarship: {f.concession_reason} (-
                              {formatPaiseToINR(f.concession_paise)})
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs tabular-nums text-muted">
                          {f.due_date}
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-xs tabular-nums">
                          {formatPaiseToINR(c.netPrincipalPaise)}
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-xs tabular-nums text-warning">
                          {formatPaiseToINR(c.lateFinePaise)} ({c.lateDays}d)
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-xs tabular-nums text-success">
                          {formatPaiseToINR(c.paidPaise)}
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-xs font-semibold tabular-nums text-ink">
                          {formatPaiseToINR(c.outstandingPaise)}
                        </td>
                        <td className="px-5 py-4">
                          <Badge
                            tone={
                              c.status === 'paid'
                                ? 'success'
                                : c.status === 'partially_paid'
                                  ? 'warning'
                                  : c.status === 'overdue'
                                    ? 'danger'
                                    : 'neutral'
                            }
                            dot
                          >
                            {c.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {c.outstandingPaise > 0 ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedPaymentAssignmentId(f.id);
                                setDemoPaymentModalOpen(true);
                              }}
                            >
                              <CreditCard className="h-3.5 w-3.5 text-accent" />
                              <span>Pay Fee</span>
                            </Button>
                          ) : (
                            <Badge tone="success">Settled</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Payment Receipts History */}
        <GlassCard padding="none" className="overflow-hidden">
          <div className="border-b border-line px-6 py-4">
            <h3 className="text-base font-semibold text-ink">Official Numbered Receipts</h3>
          </div>
          {studentPayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No payment receipts recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface/50 text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Receipt No</th>
                    <th className="px-5 py-3.5 font-semibold">Fee Head</th>
                    <th className="px-5 py-3.5 font-semibold">Mode &amp; Reference</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Amount</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Receipt PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {studentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-surface/40">
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-ink">
                        {p.receipt_no}
                      </td>
                      <td className="px-5 py-4 text-ink">{p.fee_title}</td>
                      <td className="px-5 py-4 font-mono text-xs text-muted">
                        {p.mode.toUpperCase()} · {p.reference}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-xs font-semibold tabular-nums text-ink">
                        {formatPaiseToINR(p.amount_paise)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            generateFeeReceiptPDF(p, undefined, undefined, feeSummary.totalDuePaise);
                            onToast(`Downloaded ${p.receipt_no}.pdf`);
                          }}
                        >
                          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Receipt PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Automated Fee Email Notifications & Directives Received */}
        {(() => {
          const myFeeLogs = feeNotificationLogs.filter(
            (log) =>
              log.student_id === activeStudent.id ||
              log.student_email === profile.email ||
              log.enrolment_no === activeStudent.enrolment_no
          );

          return (
            <GlassCard padding="lg" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-ink">
                      Fee Email Directives &amp; Automated Notifications ({myFeeLogs.length})
                    </h3>
                    <Badge tone="accent">Delivered to {profile.email}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    Automated email dispatches sent to your inbox regarding fee deadlines, balance reminders, and partial payment receipts.
                  </p>
                </div>
              </div>

              {myFeeLogs.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-line p-6 text-center text-xs text-muted">
                  No fee alert emails dispatched to your account yet. When fee deadlines approach or partial payments are recorded, automated notifications will appear here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-line bg-surface/50 text-xs text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Email Subject</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold text-right">Outstanding Balance</th>
                        <th className="px-4 py-3 font-semibold text-right">Dispatched At</th>
                        <th className="px-4 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {myFeeLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-surface/40">
                          <td className="px-4 py-3 font-medium text-ink">
                            {log.email_subject}
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
                                ? 'Overdue Alert'
                                : log.notification_type === 'deadline_today'
                                ? 'Due Today'
                                : 'Deadline Reminder'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-danger">
                            {formatPaiseToINR(log.amount_due_paise)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-muted">
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
                              onClick={() => setStudentEmailPreview(log)}
                            >
                              <Mail className="h-3.5 w-3.5 text-accent" />
                              <span>View Email</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          );
        })()}

        {/* Student Email Preview Modal */}
        <ModalDialog
          open={!!studentEmailPreview}
          onClose={() => setStudentEmailPreview(null)}
          title={`Official Email Notice: ${studentEmailPreview?.email_subject || 'Fee Notice'}`}
          description={`Delivered to ${studentEmailPreview?.student_email}`}
        >
          {studentEmailPreview && (
            <div className="space-y-4">
              <div className="rounded-[10px] border border-line bg-white dark:bg-slate-900 p-2 max-h-[480px] overflow-y-auto">
                <iframe
                  title="Student Fee Email Preview"
                  srcDoc={studentEmailPreview.email_body_html}
                  className="w-full h-[420px] border-none rounded-md"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-line">
                <div className="text-xs text-muted">
                  Official Institutional Dispatch · Delivered to {studentEmailPreview.student_email}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setStudentEmailPreview(null)}>
                  Close Email
                </Button>
              </div>
            </div>
          )}
        </ModalDialog>

        {/* Demo Online Payment Gateway Modal */}
        <DemoPaymentGatewayModal
          open={demoPaymentModalOpen}
          onClose={() => setDemoPaymentModalOpen(false)}
          feeAssignments={studentFees}
          payments={studentPayments}
          initialAssignmentId={selectedPaymentAssignmentId}
          studentId={activeStudent.id}
          studentName={activeStudent.full_name}
          enrolmentNo={activeStudent.enrolment_no}
          collegeName={profile.college_name}
          collegeCode={profile.college_code}
          onRecordPayment={(assignmentId, amountPaise, mode, reference) => {
            if (onRecordPayment) {
              onRecordPayment(assignmentId, amountPaise, mode, reference);
            }
            if (onRefresh) {
              void onRefresh();
            }
          }}
          onToast={onToast}
        />
      </div>
    );
  }

  // 5. COURSES & SUBJECTS
  if (activeNav === 'subjects') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="CURRICULUM"
          title="Enrolled Courses, Syllabus & Faculty Directory"
          subtitle={activeStudent.batch_label}
        />

        {subjects.length === 0 ? (
          <EmptyState
            title="No Enrolled Courses Assigned Yet"
            description="Your enrolled subjects, credit weights, syllabus PDFs, and faculty contact details will appear here once assigned."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-stretch">
            {subjects.map((sub) => {
              const pct =
                sub.classes_held > 0
                  ? ((sub.classes_attended / sub.classes_held) * 100).toFixed(1)
                  : '0.0';
              return (
                <GlassCard key={sub.id} equalHeight padding="lg" className="justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="font-mono font-semibold text-accent">{sub.code}</span>
                      <Badge tone="neutral">
                        {sub.credits} Credits · Sem {sub.semester}
                      </Badge>
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-ink">{sub.name}</h3>
                    <div className="mt-3 space-y-1 text-xs text-muted">
                      <div>
                        Instructor: <strong className="text-ink">{sub.faculty_name}</strong> (
                        {sub.faculty_email})
                      </div>
                      <div>Cabin: {sub.faculty_cabin}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs">
                    <span className="font-mono tabular-nums text-ink">
                      Attendance: {pct}% ({sub.classes_attended}/{sub.classes_held})
                    </span>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 6. MENTOR PAGE
  if (activeNav === 'mentor') {
    const allFacultyList: any[] = [...SEED_FACULTY, ...DEMO_TEACHERS];
    const assignedMentor: any =
      allFacultyList.find(
        (f: any) =>
          f.id === activeStudent.mentor_id ||
          f.name === activeStudent.mentor_id ||
          f.full_name === activeStudent.mentor_id ||
          (activeStudent.mentor_name &&
            (f.full_name === activeStudent.mentor_name || f.name === activeStudent.mentor_name))
      ) ||
      (activeStudent.mentor_name
        ? { full_name: activeStudent.mentor_name, name: activeStudent.mentor_name, designation: 'Faculty Mentor' }
        : null);
    const pendingRequest = (mentorRequests || []).find(
      (r) =>
        (r.student_id === activeStudent.id ||
          r.student_id === profile.id ||
          r.enrolment_no === activeStudent.enrolment_no) &&
        r.status === 'pending'
    );

    // 5 Stages Calculation
    const currentStage = assignedMentor ? 4 : pendingRequest ? 3 : 1;

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="FACULTY MENTORING WORKFLOW"
          title={
            assignedMentor
              ? `Assigned Mentor · ${assignedMentor.name || assignedMentor.full_name}`
              : 'Faculty Mentoring & Advisor Assignment'
          }
          subtitle="One-on-one academic advising, guidance, and continuous faculty mentorship."
          actions={
            !isReadOnlyParent && assignedMentor ? (
              <Button variant="primary" onClick={() => setBookingOpen(true)}>
                Book Mentoring Slot
              </Button>
            ) : undefined
          }
        />

        {/* 5-Stage Stepper Banner */}
        <GlassCard padding="md">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Institutional Mentoring Assignment Workflow
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {[
              { num: 1, title: '1. Select Mentor', desc: 'Browse faculty profiles' },
              { num: 2, title: '2. Submit Request', desc: 'State academic goals' },
              { num: 3, title: '3. Await Confirmation', desc: 'Faculty / Office review' },
              { num: 4, title: '4. Confirmed Mentor', desc: 'Official assignment' },
              { num: 5, title: '5. Ongoing Advising', desc: 'Sessions & log summaries' },
            ].map((st) => {
              const isPast = currentStage > st.num;
              const isCurrent = currentStage === st.num;
              return (
                <div
                  key={st.num}
                  className={`rounded-[10px] p-3 border transition-colors ${
                    isCurrent
                      ? 'border-accent bg-accent/10 text-ink'
                      : isPast
                        ? 'border-success/40 bg-success/5 text-ink'
                        : 'border-line bg-surface/30 text-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{st.title}</span>
                    {isPast && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {isCurrent && <Badge tone="accent" dot>Active</Badge>}
                  </div>
                  <div className="mt-1 text-[11px] text-muted">{st.desc}</div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Active Assigned Mentor Card */}
        {assignedMentor && (
          <GlassCard padding="lg" className="border-accent/30 bg-accent/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="success" dot>
                    Confirmed Faculty Mentor
                  </Badge>
                  <span className="font-mono text-xs text-muted">ID: {assignedMentor.id}</span>
                </div>
                <h3 className="mt-2 text-xl font-bold text-ink">{assignedMentor.name || assignedMentor.full_name}</h3>
                <div className="mt-1 text-sm text-accent font-medium">{assignedMentor.designation} · {assignedMentor.department || assignedMentor.department_code}</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted">
                  <div>Email: <strong className="text-ink">{assignedMentor.email}</strong></div>
                  <div>Cabin: <strong className="text-ink">{assignedMentor.cabin}</strong></div>
                  <div>Office Hours: <strong className="text-ink">{assignedMentor.office_hours}</strong></div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" size="sm" onClick={() => setBookingOpen(true)}>
                  Schedule Office Slot
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedFacultyForRequest(SEED_FACULTY[0] || null);
                    setMentorModalOpen(true);
                  }}
                >
                  Request Change of Mentor
                </Button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Pending Request Alert */}
        {pendingRequest && (
          <GlassCard padding="md" className="border-warning/40 bg-warning/5">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-ink">
                    Mentorship Request Awaiting Confirmation
                  </span>
                  <Badge tone="warning" dot>Pending Review</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  You requested <strong>{pendingRequest.mentor_name}</strong> on {pendingRequest.created_at.slice(0, 10)}.
                  {pendingRequest.notes && <span> Note: &ldquo;{pendingRequest.notes}&rdquo;</span>}
                  The assignment will reflect here immediately once approved by the Faculty or College Organizer.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Available Faculty Mentors Grid */}
        <GlassCard padding="lg">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="text-base font-semibold text-ink">
                Available Faculty Mentors ({SEED_FACULTY.length})
              </h3>
              <p className="text-xs text-muted">
                Review eligible academic advisors and submit your mentorship selection.
              </p>
            </div>
            <Badge tone="neutral">Advising Cohort 2026</Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEED_FACULTY.map((fac: any) => {
              const isCurrentMentor = assignedMentor?.id === fac.id;
              const isRequested = pendingRequest?.mentor_id === fac.id;
              return (
                <div
                  key={fac.id}
                  className={`rounded-[12px] border p-4 flex flex-col justify-between transition-colors ${
                    isCurrentMentor
                      ? 'border-accent bg-accent/5'
                      : isRequested
                        ? 'border-warning bg-warning/5'
                        : 'border-line bg-surface/50 hover:border-line-hover'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted">{fac.id}</span>
                      {isCurrentMentor ? (
                        <Badge tone="success" dot>Assigned</Badge>
                      ) : isRequested ? (
                        <Badge tone="warning" dot>Requested</Badge>
                      ) : (
                        <Badge tone="neutral">Available</Badge>
                      )}
                    </div>
                    <div className="mt-2 font-bold text-ink text-sm">{fac.name || fac.full_name}</div>
                    <div className="text-xs text-accent font-medium">{fac.designation}</div>
                    <div className="text-xs text-muted mt-0.5">{fac.department || fac.department_code}</div>

                    <div className="mt-3 space-y-1 text-xs text-muted border-t border-line/50 pt-2">
                      <div>Cabin: <strong className="text-ink">{fac.cabin}</strong></div>
                      <div>Hours: <strong className="text-ink">{fac.office_hours}</strong></div>
                      <div className="truncate">Email: {fac.email}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line/40">
                    {isCurrentMentor ? (
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setBookingOpen(true)}>
                        Book Session Slot
                      </Button>
                    ) : isRequested ? (
                      <div className="text-center text-xs text-warning font-medium py-1">
                        Request Pending
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedFacultyForRequest(fac);
                          setMentorModalOpen(true);
                        }}
                      >
                        Select as Mentor
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Shared Session Summaries */}
        <GlassCard padding="lg">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="text-base font-semibold text-ink">
                Shared Mentoring Session Summaries
              </h3>
              <p className="text-xs text-muted">
                Action items and academic guidance shared by your faculty advisor.
              </p>
            </div>
            <Badge tone="success" dot>
              Verified Advisor Log
            </Badge>
          </div>

          {studentMentorMeetings.length > 0 ? (
            <div className="mt-4 divide-y divide-line">
              {studentMentorMeetings.map((m) => (
                <div key={m.id} className="py-4 space-y-2">
                  <div className="font-mono text-xs text-accent">Session Date: {m.date}</div>
                  <p className="text-sm text-ink">{m.shared_summary}</p>
                  <div className="text-xs text-muted">
                    <strong>Action Items:</strong> {m.action_items}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[14px] border border-dashed border-line p-6 text-center text-xs text-muted">
              No mentoring session summaries recorded yet.
            </div>
          )}
        </GlassCard>

        {/* Select Mentor Request Modal */}
        <ModalDialog
          open={mentorModalOpen}
          onClose={() => setMentorModalOpen(false)}
          title="Submit Faculty Mentorship Request"
          description={
            selectedFacultyForRequest
              ? `Request ${selectedFacultyForRequest.name || selectedFacultyForRequest.full_name} (${selectedFacultyForRequest.designation}) as your designated academic advisor.`
              : 'Select a faculty advisor.'
          }
        >
          <div className="space-y-4">
            {selectedFacultyForRequest && (
              <div className="rounded-[10px] border border-line bg-surface/50 p-3 text-xs space-y-1">
                <div>Faculty: <strong className="text-ink">{selectedFacultyForRequest.name || selectedFacultyForRequest.full_name}</strong></div>
                <div>Department: <strong className="text-ink">{selectedFacultyForRequest.department || selectedFacultyForRequest.department_code}</strong></div>
                <div>Office: <strong className="text-ink">{selectedFacultyForRequest.cabin} · {selectedFacultyForRequest.office_hours}</strong></div>
              </div>
            )}
            <Input
              label="Academic Goals / Discussion Topics (Optional)"
              placeholder="e.g., Guidance on research electives, career roadmap, semester progression..."
              value={mentorRequestNotes}
              onChange={(e) => setMentorRequestNotes(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMentorModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (selectedFacultyForRequest && onRequestMentor) {
                    onRequestMentor(
                      selectedFacultyForRequest.id,
                      selectedFacultyForRequest.name || selectedFacultyForRequest.full_name,
                      mentorRequestNotes.trim()
                    );
                  }
                  setMentorModalOpen(false);
                  setMentorRequestNotes('');
                  onToast(`Mentorship request submitted to ${selectedFacultyForRequest?.name || selectedFacultyForRequest?.full_name}.`);
                }}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </ModalDialog>

        {/* Mentor Slot Booking Modal */}
        <ModalDialog
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          title="Book Faculty Mentoring Slot"
          description="Schedule a 20-minute academic advising session with your assigned faculty mentor."
        >
          <div className="space-y-4">
            <Input
              label="Preferred Office Hours Date"
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />
            <Input
              label="Agenda / Discussion Topic"
              placeholder="e.g., Academic progress review and course planning"
              value={bookingConcern}
              onChange={(e) => setBookingConcern(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setBookingOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onBookMentorSlot(
                    bookingDate || new Date().toISOString().slice(0, 10),
                    bookingConcern || 'Academic progress & attendance review'
                  );
                  setBookingOpen(false);
                  setBookingConcern('');
                  onToast('Mentoring slot request submitted.');
                }}
              >
                Confirm Slot Booking
              </Button>
            </div>
          </div>
        </ModalDialog>
      </div>
    );
  }

  // 7. LEAVE MANAGEMENT
  if (activeNav === 'leave' || activeNav === 'leaves') {
    return (
      <div className="space-y-6">
        {renderParentSwitcherBar()}

        <PageHeader
          eyebrow="LEAVE WORKFLOW"
          title="Student Leave Applications & Approval Chain"
          subtitle="Workflow: Student → Mentor → HOD (HOD approval required when leave exceeds 3 days or overlaps an exam)."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          {!isReadOnlyParent ? (
            <div className="lg:col-span-5 flex flex-col">
              <GlassCard equalHeight padding="lg">
                <form onSubmit={handleLeaveSubmit} className="space-y-4">
                  <h2 className="text-base font-semibold text-ink">Apply for Student Leave</h2>

                  {leaveError && (
                    <div
                      role="alert"
                      className="rounded-[12px] border border-danger bg-danger/5 p-3 text-xs text-danger"
                    >
                      {leaveError}
                    </div>
                  )}

                  <Select
                    label="Leave Category"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveRequestItem['type'])}
                    options={[
                      { value: 'Medical', label: 'Medical Leave' },
                      { value: 'Personal', label: 'Personal Leave' },
                      { value: 'On Duty', label: 'Academic On-Duty (OD)' },
                      { value: 'Event', label: 'Institutional Event Representation' },
                    ]}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="From Date"
                      type="date"
                      value={leaveFrom}
                      onChange={(e) => setLeaveFrom(e.target.value)}
                      required
                    />
                    <Input
                      label="To Date"
                      type="date"
                      value={leaveTo}
                      onChange={(e) => setLeaveTo(e.target.value)}
                      required
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={leaveExamDay}
                      onChange={(e) => setLeaveExamDay(e.target.checked)}
                    />
                    <span>Dates overlap with an Examination (Escalates to HOD)</span>
                  </label>

                  <Input
                    label="Reason for Leave"
                    placeholder="State clear reason and missed class details..."
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    required
                  />

                  <Button type="submit" variant="primary" className="w-full">
                    Submit Leave Request
                  </Button>
                </form>
              </GlassCard>
            </div>
          ) : (
            <div className="lg:col-span-5 flex flex-col">
              <GlassCard equalHeight padding="lg">
                <Badge tone="neutral">Parent Read-Only Access</Badge>
                <h2 className="mt-2 text-lg font-semibold text-ink">
                  Ward Leave Status &amp; Approval Chain
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Parents and guardians have read-only visibility into leave requests and approval
                  timestamps.
                </p>
              </GlassCard>
            </div>
          )}

          <div className="lg:col-span-7 flex flex-col">
            <GlassCard equalHeight padding="lg" className="space-y-4">
              <h2 className="text-base font-semibold text-ink">
                Leave History &amp; Multi-Step Approval Timeline
              </h2>
              {studentLeaves.length === 0 && (
                <div className="rounded-[14px] border border-dashed border-line p-8 text-center text-xs text-muted">
                  No leave requests submitted yet.
                </div>
              )}
              {studentLeaves.map((lv) => (
                  <div
                    key={lv.id}
                    className="rounded-[14px] border border-line bg-surface/50 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-ink">{lv.type} Leave</span>
                        <span className="mx-2 text-muted">·</span>
                        <span className="font-mono text-xs tabular-nums text-muted">
                          {lv.from_date} to {lv.to_date} ({lv.days_count}d)
                        </span>
                      </div>
                      <Badge
                        tone={
                          lv.status === 'Approved'
                            ? 'success'
                            : lv.status === 'Rejected' || lv.status === 'Cancelled'
                              ? 'danger'
                              : 'warning'
                        }
                        dot
                      >
                        {lv.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-ink">{lv.reason}</p>

                    <div className="border-t border-line pt-3 text-xs space-y-1.5">
                      <div className="text-muted">
                        Workflow: Student → Mentor {lv.requires_hod ? '→ HOD (Required)' : '(Final)'}
                      </div>
                      {(lv.approvals || []).map((ap, i) => (
                      <div key={i} className="text-ink">
                        <strong>
                          {ap.step.toUpperCase()} ({ap.approver_name}):
                        </strong>{' '}
                        {ap.decision.toUpperCase()} — &ldquo;{ap.comment}&rdquo;
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {lv.status === 'Approved' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          generateLeavePermitPDF(
                            lv,
                            profile.college_name || 'Institution Workspace',
                            profile.college_code || ''
                          );
                          onToast('Downloaded Official Leave & Gate Permit PDF.');
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Leave Permit PDF
                      </Button>
                    )}
                    {!isReadOnlyParent &&
                      (lv.status === 'Pending Mentor' || lv.status === 'Pending HOD') && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            onCancelLeave(lv.id);
                            onToast('Pending leave request cancelled.');
                          }}
                        >
                          Cancel Pending Request
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  // 8. NOTICES (CLICKABLE FULL DETAILS FOR ALL ORGANIZER ANNOUNCEMENTS)
  if (activeNav === 'notices') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={
            profile.college_code
              ? `ANNOUNCEMENTS · ${profile.college_code}`
              : 'INSTITUTIONAL CIRCULARS'
          }
          title="College Organizer Announcements & Circulars"
          subtitle="Click any announcement card below to open the full circular, view publisher details, download, or mark as read."
        />

        {collegeScopedNotices.length === 0 ? (
          <EmptyState
            title="No Circulars or Notices Published Yet"
            description="Official institutional, departmental, and batch circulars published by your College Organizer will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {collegeScopedNotices.map((n) => (
              <GlassCard
                key={n.id}
                padding="lg"
                onClick={() => setSelectedNotice(n)}
                className="group transition-all hover:border-accent"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <div className="flex flex-wrap items-center gap-2">
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
                    {n.college_code && (
                      <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
                        {n.college_code}
                      </span>
                    )}
                    <span>Target: {n.audience_target}</span>
                    <span>·</span>
                    <span className="font-mono">
                      {new Date(n.publish_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.is_read ? (
                      <Badge tone="success" dot>
                        Read Receipt Logged
                      </Badge>
                    ) : (
                      <Badge tone="accent" dot>
                        Click to View Full Details
                      </Badge>
                    )}
                  </div>
                </div>
                <h3 className="mt-2.5 text-lg font-bold text-ink group-hover:text-accent transition-colors">
                  {n.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{n.body}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
                  <span>
                    Published by <strong className="text-ink">{n.created_by_name}</strong> (
                    {n.created_by_role})
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-accent">
                    <span>Open Full Circular</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {renderNoticeModal()}
      </div>
    );
  }

  // 9. TIMETABLE
  if (activeNav === 'timetable') {
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Scoped timetable for student's college
    const collegeScopedTimetable = (timetable || []).filter((slot) => {
      if (!slot) return false;
      if (slot.college_code && profile.college_code) {
        if (slot.college_code.trim().toUpperCase() !== profile.college_code.trim().toUpperCase()) {
          return false;
        }
      }
      return true;
    });

    // Deduplicate slots
    const seenSlots = new Set<string>();
    const deduplicatedTimetable = collegeScopedTimetable.filter((s) => {
      const key = `${s.weekday}-${s.period}-${s.subject_code}-${s.room}`;
      if (seenSlots.has(key)) return false;
      seenSlots.add(key);
      return true;
    });

    // Filter by day and sort chronologically
    const dayFilteredTimetable = (
      selectedTimetableDay === 'all'
        ? deduplicatedTimetable
        : deduplicatedTimetable.filter((s) => s.weekday === Number(selectedTimetableDay))
    ).sort((a, b) => {
      if (a.weekday !== b.weekday) return a.weekday - b.weekday;
      if (a.period !== b.period) return a.period - b.period;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    const dayName = selectedTimetableDay !== 'all' ? weekdays[Number(selectedTimetableDay) - 1] : 'All Working Days';

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="ACADEMIC SCHEDULE"
          title="Weekly Academic Timetable & Room Allocations"
          subtitle={`${activeStudent.batch_label} · ${profile.college_name || 'Campus Schedule'}`}
          actions={
            <div className="flex items-center gap-2">
              <label htmlFor="student-timetable-day-select" className="text-xs font-medium text-muted shrink-0">
                Filter Day:
              </label>
              <Select
                id="student-timetable-day-select"
                value={selectedTimetableDay}
                onChange={(e) => setSelectedTimetableDay(e.target.value)}
                options={[
                  { value: 'all', label: 'All Working Days (Mon – Sat)' },
                  { value: '1', label: 'Monday Schedule' },
                  { value: '2', label: 'Tuesday Schedule' },
                  { value: '3', label: 'Wednesday Schedule' },
                  { value: '4', label: 'Thursday Schedule' },
                  { value: '5', label: 'Friday Schedule' },
                  { value: '6', label: 'Saturday Schedule' },
                ]}
              />
            </div>
          }
        />

        {/* Day Selector Pills Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: 'all', label: 'All Days' },
            { value: '1', label: 'Monday' },
            { value: '2', label: 'Tuesday' },
            { value: '3', label: 'Wednesday' },
            { value: '4', label: 'Thursday' },
            { value: '5', label: 'Friday' },
            { value: '6', label: 'Saturday' },
          ].map((item) => {
            const isSelected = selectedTimetableDay === item.value;
            const count = item.value === 'all'
              ? deduplicatedTimetable.length
              : deduplicatedTimetable.filter((s) => s.weekday === Number(item.value)).length;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setSelectedTimetableDay(item.value)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-surface/60 border border-line text-muted hover:border-accent hover:text-ink'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-muted/10 text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {deduplicatedTimetable.length === 0 ? (
          <EmptyState
            title="No Timetable Slots Assigned Yet"
            description="Your weekly class schedule and room allocations will appear here once published by your department."
          />
        ) : dayFilteredTimetable.length === 0 ? (
          <GlassCard padding="lg" className="text-center py-12 space-y-2">
            <Calendar className="h-8 w-8 text-muted mx-auto stroke-1" />
            <h3 className="text-base font-semibold text-ink">No classes scheduled for this day</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              There are no lecture or laboratory sessions scheduled for {dayName}. Select another working day or choose &ldquo;All Working Days&rdquo;.
            </p>
            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedTimetableDay('all')}>
                View All Days Schedule
              </Button>
            </div>
          </GlassCard>
        ) : (
          <GlassCard padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-line flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-ink">
                  {dayName} Schedule ({dayFilteredTimetable.length} {dayFilteredTimetable.length === 1 ? 'Period' : 'Periods'})
                </h3>
              </div>
              <span className="text-xs text-muted font-mono">Sorted chronologically</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface/50 text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Day</th>
                    <th className="px-5 py-3.5 font-semibold">Period &amp; Time</th>
                    <th className="px-5 py-3.5 font-semibold">Subject</th>
                    <th className="px-5 py-3.5 font-semibold">Assigned Faculty</th>
                    <th className="px-5 py-3.5 font-semibold">Lecture Hall / Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {dayFilteredTimetable.map((slot) => (
                    <tr key={slot.id} className="hover:bg-surface/40 transition-colors">
                      <td className="px-5 py-4 font-semibold text-ink">
                        <Badge tone="neutral">
                          {weekdays[(slot.weekday - 1) % weekdays.length]}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs tabular-nums text-accent whitespace-nowrap">
                        <span className="font-bold">P{slot.period}</span> · {slot.start_time} – {slot.end_time}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink">{slot.subject_name}</div>
                        <div className="font-mono text-xs text-muted mt-0.5">{slot.subject_code}</div>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        <div className="font-medium text-ink">{slot.faculty_name || 'Faculty Instructor'}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-ink whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md bg-surface-2 border border-line">
                          {slot.room}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  // 10. COURSEWORK & LAB ASSIGNMENTS
  if (activeNav === 'assignments') {
    return (
      <div className="space-y-6">
        {renderParentSwitcherBar()}

        <PageHeader
          eyebrow="COURSEWORK & LABS"
          title="Coursework & Laboratory PDF Submissions"
          subtitle="Submit course lab records, assignments, and track evaluation marks awarded by faculty."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 items-stretch">
          <StatTile
            label="Total Assignments"
            value={assignments.length}
            icon={BookOpen}
            tone="accent"
            footerText="Active semester coursework"
          />
          <StatTile
            label="Submitted"
            value={assignments.filter((a) => a.submitted).length}
            icon={CheckCircle2}
            tone="success"
            footerText="Verified PDF uploads"
          />
          <StatTile
            label="Pending Submission"
            value={assignments.filter((a) => !a.submitted).length}
            icon={Clock}
            tone={assignments.some((a) => !a.submitted) ? 'warning' : 'success'}
            footerText="Upload before due date"
          />
        </div>

        <GlassCard padding="lg" className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text)]">
            Active Course &amp; Lab Assignments
          </h3>
          {assignments.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-muted)]">
              No active course assignments posted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {assignments.map((asg) => (
                <div
                  key={asg.id}
                  className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span className="font-mono font-semibold text-[var(--accent-text)]">
                        {asg.subject_code}
                      </span>
                      <span className="font-mono">
                        Due: {asg.due_date} · Max {asg.max_marks}M
                      </span>
                    </div>
                    <div className="font-semibold text-[var(--text)]">{asg.title}</div>
                  </div>
                  <div className="pt-2">
                    {asg.submitted ? (
                      <Badge tone="success" dot>
                        Submitted ({asg.file_name}) · Marks: {asg.marks_awarded ?? 'Pending'}/
                        {asg.max_marks}
                      </Badge>
                    ) : !isReadOnlyParent ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onSubmitAssignment(
                            asg.id,
                            `${activeStudent.enrolment_no}_${asg.subject_code}_Submission.pdf`
                          );
                          onToast('Assignment PDF uploaded successfully.');
                        }}
                      >
                        <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Upload PDF Submission
                      </Button>
                    ) : (
                      <Badge tone="warning" dot>
                        Pending Student Upload
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  // 10B. GRIEVANCE, ACADEMIC DOUBTS & HELPDESK TICKETS
  if (activeNav === 'tickets') {
    return (
      <div className="space-y-6">
        {renderParentSwitcherBar()}

        <PageHeader
          eyebrow="ACADEMIC DOUBTS, GRIEVANCE & HELPDESK"
          title="Student Helpdesk, Academic Doubts & Correction Desk"
          subtitle="Ask subject doubts to teachers, or raise inquiries for attendance corrections, fee receipts, exam marks, and profile updates."
          actions={
            !isReadOnlyParent ? (
              <Button variant="primary" size="sm" onClick={() => setTicketModalOpen(true)}>
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                Ask Doubt / Raise Ticket
              </Button>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 items-stretch">
          <StatTile
            label="Total Doubts & Tickets"
            value={tickets.length}
            icon={FileText}
            tone="accent"
            footerText="Routed to Faculty & Admin"
          />
          <StatTile
            label="Open / Awaiting Reply"
            value={tickets.filter((t) => t.status !== 'resolved').length}
            icon={Clock}
            tone={tickets.some((t) => t.status !== 'resolved') ? 'warning' : 'success'}
            footerText="Active resolution queue"
          />
          <StatTile
            label="Resolved & Answered"
            value={tickets.filter((t) => t.status === 'resolved').length}
            icon={CheckCircle2}
            tone="success"
            footerText="Verified answers & resolutions"
          />
        </div>

        <GlassCard padding="lg" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text)]">
              My Academic Doubts &amp; Helpdesk Tickets ({tickets.length})
            </h3>
            {!isReadOnlyParent && (
              <Button variant="secondary" size="sm" onClick={() => setTicketModalOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> New Query
              </Button>
            )}
          </div>
          {tickets.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-muted)]">
              No doubts or helpdesk tickets raised yet. Click &ldquo;Ask Doubt / Raise Ticket&rdquo; above to submit a question.
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedDetailTicket(t)}
                  className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-2 hover:border-[var(--accent)] transition-all cursor-pointer group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone="accent">{t.category}</Badge>
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        #{t.id} · By {t.raised_by_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={t.status === 'resolved' ? 'success' : 'warning'} dot>
                        {t.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-semibold text-accent group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                        <span>View Details</span> →
                      </span>
                    </div>
                  </div>
                  <div className="font-semibold text-[var(--text)] group-hover:text-accent transition-colors">
                    {t.subject}
                  </div>
                  <p className="text-xs text-[var(--text-2)] leading-relaxed line-clamp-2">{t.body}</p>
                  {t.resolution_note && (
                    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--success)]">
                      <strong>Faculty / Admin Resolution:</strong> {t.resolution_note}
                    </div>
                  )}
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Routed to: {t.assigned_to_name} · Logged on{' '}
                    {new Date(t.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Clickable Ticket Full-Detail & Conversation Thread Modal */}
        <ModalDialog
          open={!!selectedDetailTicket}
          onClose={() => setSelectedDetailTicket(null)}
          title={`[${selectedDetailTicket?.category}] ${selectedDetailTicket?.subject || 'Query Details'}`}
          description={`Ticket ID: #${selectedDetailTicket?.id} · Assigned to: ${selectedDetailTicket?.assigned_to_name || 'Faculty'}`}
        >
          {selectedDetailTicket && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="space-y-1">
                  <div className="text-[var(--text-muted)]">Category &amp; Raised By</div>
                  <div className="font-semibold text-[var(--text)]">
                    {selectedDetailTicket.category} · {selectedDetailTicket.raised_by_name}
                  </div>
                </div>
                <Badge tone={selectedDetailTicket.status === 'resolved' ? 'success' : 'warning'} dot>
                  {selectedDetailTicket.status.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="font-semibold text-[var(--text-muted)]">Original Question / Query Description:</div>
                <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3.5 text-sm text-[var(--text)] leading-relaxed">
                  {selectedDetailTicket.body}
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-semibold text-[var(--text-muted)]">Resolution &amp; Faculty Reply Thread:</div>
                {selectedDetailTicket.resolution_note ? (
                  <div className="rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    <strong className="block mb-1 text-xs text-emerald-600 dark:text-emerald-400">
                      ✓ Faculty / Admin Resolution Note:
                    </strong>
                    {selectedDetailTicket.resolution_note}
                  </div>
                ) : (
                  <div className="rounded-[10px] border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                    Awaiting resolution reply from {selectedDetailTicket.assigned_to_name}. Your teacher or administrator has been notified.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Created: {new Date(selectedDetailTicket.created_at).toLocaleString('en-IN')}
                </span>
                <Button variant="secondary" size="sm" onClick={() => setSelectedDetailTicket(null)}>
                  Close Details
                </Button>
              </div>
            </div>
          )}
        </ModalDialog>

        <ModalDialog
          open={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
          title="Ask an Academic Doubt or Raise a Helpdesk Ticket"
          description="Academic doubts are routed to your subject teachers; administrative tickets go to the Organizer & Academic Office."
        >
          <div className="space-y-4">
            <Select
              label="Category"
              value={ticketCat}
              onChange={(e) => setTicketCat(e.target.value as GrievanceTicket['category'])}
              options={[
                { value: 'Academic Doubt', label: 'Academic / Subject Doubt (Ask Teacher)' },
                { value: 'Attendance', label: 'Attendance Register Query' },
                { value: 'Marks', label: 'Internal Marks / Grade Card Query' },
                { value: 'Fees', label: 'Fee Receipt / Concession Query' },
                { value: 'Exam & Hall Ticket', label: 'Examination & Hall Ticket Clearance' },
                { value: 'Profile Correction', label: 'Profile Data Correction' },
                { value: 'Hostel', label: 'Hostel & Campus Facilities' },
                { value: 'IT Support', label: 'Portal & Technical Support' },
              ]}
            />
            <Input
              label="Subject / Topic *"
              value={ticketSubj}
              onChange={(e) => setTicketSubj(e.target.value)}
              placeholder="e.g., Doubt in CS601 B+ Tree Deletion or Attendance on Oct 20"
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text)]">
                Detailed Question or Description *
              </label>
              <textarea
                rows={4}
                value={ticketBody}
                onChange={(e) => setTicketBody(e.target.value)}
                placeholder="Describe your academic doubt, subject code, or administrative issue in detail..."
                className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text)]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setTicketModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!ticketSubj.trim()) return;
                  onCreateTicket(
                    ticketCat,
                    ticketSubj.trim(),
                    ticketBody.trim() || ticketSubj.trim()
                  );
                  setTicketModalOpen(false);
                  setTicketSubj('');
                  setTicketBody('');
                  onToast(`Submitted "${ticketCat}" ticket to faculty & administration.`);
                }}
              >
                Submit Doubt / Ticket
              </Button>
            </div>
          </div>
        </ModalDialog>
      </div>
    );
  }

  // 11. LIBRARY
  if (activeNav === 'library') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="LIBRARY CATALOGUE"
          title="Central Library Catalogue, Issued Books & Fines"
          subtitle="Track active book loans, due dates, and circulation records."
        />
        <EmptyState
          title="No Library Books Issued Yet"
          description="Your active book loans, due dates, and library circulation records will appear here once issued."
        />
      </div>
    );
  }

  // 12. FALLBACK PROFILE & SESSIONS
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 flex flex-col">
          <GlassCard equalHeight padding="lg" className="space-y-4">
            <h2 className="text-lg font-semibold text-ink">
              Profile Details &amp; Emergency Contact
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full Name (Verified)" value={activeStudent.full_name} disabled />
              <Input label="Enrolment Number" value={activeStudent.enrolment_no} disabled />
            </div>
            <Input
              label="Phone Number"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Enter phone number"
            />
            <Input
              label="Emergency Guardian Contact"
              value={emergencyInput}
              onChange={(e) => setEmergencyInput(e.target.value)}
              placeholder="Enter guardian name and phone number"
            />
            <div className="flex items-center justify-between border-t border-line pt-4">
              <div className="text-xs text-muted">
                Role: <code className="font-mono font-semibold text-ink">{role.toUpperCase()}</code>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onUpdateProfile({ phone: phoneInput, emergency_contact: emergencyInput });
                  onToast('Contact details updated.');
                }}
              >
                Save Contact Details
              </Button>
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <GlassCard equalHeight padding="lg" className="justify-between space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Active Device Sessions</h2>
              <div className="mt-3 divide-y divide-line text-xs">
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-ink">Current Browser Session</div>
                    <div className="font-mono text-muted">
                      {profile.email || profile.full_name}
                    </div>
                  </div>
                  <Badge tone="success" dot>
                    Active
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => onToast('Signed out of all other active devices.')}
            >
              Sign Out of All Other Devices
            </Button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
});
