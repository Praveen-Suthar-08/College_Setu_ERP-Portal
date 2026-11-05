import React, { useState, useMemo, useCallback } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ArrowLeft,
  ChevronRight,
  Shield,
  FileText,
  FileSpreadsheet,
  Activity,
  Layers,
  HelpCircle,
  Settings,
  Filter,
} from 'lucide-react';
import {
  Profile,
  Student,
  AttendanceSession,
  TimetableSlot,
  Examination,
  StudentGradeCard,
  FeeAssignment,
  FeeStructure,
  PaymentRecord,
  NoticeItem,
  LeaveRequestItem,
  GrievanceTicket,
  PlatformAuditLog,
  SystemSettingsPayload,
} from '../../types/portal';
import { Badge, Button, GlassCard, Input, ModalDialog, Select } from '../ui/DesignSystem';

interface AdminPlatformWorkspaceProps {
  currentProfile: Profile;
  profiles: Profile[];
  students: Student[];
  validCollegeCodes: { code: string; collegeName: string; scope: string }[];
  attendanceSessions: AttendanceSession[];
  timetableSlots?: TimetableSlot[];
  timetable?: TimetableSlot[];
  examinations?: Examination[];
  gradeCards?: StudentGradeCard[];
  feeAssignments: FeeAssignment[];
  feeStructures?: FeeStructure[];
  paymentRecords?: PaymentRecord[];
  payments?: PaymentRecord[];
  notices?: NoticeItem[];
  leaveRequests: LeaveRequestItem[];
  tickets: GrievanceTicket[];
  auditLogs: PlatformAuditLog[];
  systemSettings?: SystemSettingsPayload;
  onApproveStudent?: (studentId: string) => Promise<void>;
  onRejectStudent?: (studentId: string, reason?: string) => Promise<void>;
  onVerifyPendingStudent?: (id: string, decision: 'active' | 'suspended') => void;
  onRefreshData?: () => void;
  onRefresh?: () => void;
  onToast?: (msg: string) => void;
}

export const AdminPlatformWorkspace: React.FC<AdminPlatformWorkspaceProps> = ({
  currentProfile,
  profiles,
  students,
  validCollegeCodes,
  attendanceSessions,
  timetableSlots: propTimetableSlots,
  timetable: propTimetable,
  examinations = [],
  gradeCards = [],
  feeAssignments,
  feeStructures = [],
  paymentRecords: propPaymentRecords,
  payments: propPayments,
  notices = [],
  leaveRequests,
  tickets,
  auditLogs,
  systemSettings,
  onApproveStudent,
  onRejectStudent,
  onVerifyPendingStudent,
  onToast,
  onRefresh,
}) => {
  const timetableSlots = propTimetable || propTimetableSlots || [];
  const paymentRecords = propPayments || propPaymentRecords || [];
  const [selectedCollegeCode, setSelectedCollegeCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collegeTab, setCollegeTab] = useState<
    'overview' | 'users' | 'academics' | 'finance' | 'operations' | 'audit'
  >('overview');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Dedicated Platform Audit Center State
  const [adminPlatformView, setAdminPlatformView] = useState<'colleges' | 'audit_center'>('colleges');
  const [auditCategory, setAuditCategory] = useState<'all' | 'auth' | 'users' | 'approvals' | 'academics' | 'finance' | 'system'>('all');
  const [auditQuery, setAuditQuery] = useState('');
  const [auditCollegeFilter, setAuditCollegeFilter] = useState('all');
  const [auditRoleFilter, setAuditRoleFilter] = useState('all');
  const [auditStatusFilter, setAuditStatusFilter] = useState('all');
  const [selectedAuditLog, setSelectedAuditLog] = useState<PlatformAuditLog | null>(null);
  const [auditPage, setAuditPage] = useState(1);

  // Helper: Classify audit log entry into institutional categories
  const getLogCategory = useCallback((log: PlatformAuditLog): 'auth' | 'users' | 'approvals' | 'academics' | 'finance' | 'system' => {
    const act = (log.action || '').toUpperCase();
    const ent = (log.entity || '').toUpperCase();

    // 1. Authentication Logs
    if (act.includes('AUTH') || act.includes('LOGIN') || act.includes('SIGNIN') || act.includes('SIGNOUT') || act.includes('SESSION') || ent.includes('AUTH')) {
      return 'auth';
    }
    // 3. Approval Logs
    if (act.includes('APPROV') || act.includes('REJECT') || act.includes('VERIF') || ent.includes('VERIFICATION')) {
      return 'approvals';
    }
    // 2. User & Account Activity
    if (act.includes('USER') || act.includes('STUDENT_REG') || act.includes('TEACHER') || act.includes('PROFILE') || act.includes('SUSPEND') || ent.includes('PROFILE') || ent.includes('USER')) {
      return 'users';
    }
    // 4. Academic Activity
    if (act.includes('TIMETABLE') || act.includes('EXAM') || act.includes('GRADE') || act.includes('MARKS') || act.includes('ATTENDANCE') || act.includes('MENTOR') || act.includes('SUBJECT') || ent.includes('TIMETABLE') || ent.includes('ATTENDANCE') || ent.includes('EXAM') || ent.includes('MENTOR')) {
      return 'academics';
    }
    // 5. Finance and Fee Activity
    if (act.includes('FEE') || act.includes('PAYMENT') || act.includes('RECEIPT') || act.includes('REVERSAL') || ent.includes('FEE') || ent.includes('PAYMENT')) {
      return 'finance';
    }
    // 6. System and Error Logs
    return 'system';
  }, []);

  // Helper: Derive status badge for audit log
  const getLogStatus = useCallback((log: PlatformAuditLog): { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string } => {
    const act = (log.action || '').toUpperCase();
    if (act.includes('FAIL') || act.includes('ERROR') || act.includes('LOCKOUT') || act.includes('REJECT')) {
      return { tone: 'danger', label: 'Failed / Rejected' };
    }
    if (act.includes('PENDING') || act.includes('WARNING') || act.includes('REVERSAL')) {
      return { tone: 'warning', label: 'Action / Reversal' };
    }
    return { tone: 'success', label: 'Success' };
  }, []);

  // Compile full list of colleges from validCollegeCodes and organizer profiles
  const collegesList = useMemo(() => {
    const map = new Map<string, { code: string; name: string; organizer?: Profile }>();

    validCollegeCodes.forEach((c) => {
      if (c.code) {
        map.set(c.code.toUpperCase(), {
          code: c.code.toUpperCase(),
          name: c.collegeName || `College (${c.code})`,
        });
      }
    });

    profiles.forEach((p) => {
      if (p.role === 'super_admin' && p.college_code) {
        const code = p.college_code.toUpperCase();
        const existing = map.get(code);
        map.set(code, {
          code,
          name: p.college_name || existing?.name || `College (${code})`,
          organizer: p,
        });
      }
    });

    return Array.from(map.values());
  }, [validCollegeCodes, profiles]);

  // Filtered colleges for directory search
  const filteredColleges = useMemo(() => {
    if (!searchQuery.trim()) return collegesList;
    const q = searchQuery.toLowerCase();
    return collegesList.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [collegesList, searchQuery]);

  // Overall platform statistics calculated from real DB records
  const platformStats = useMemo(() => {
    const totalStudents = students.length;
    const pendingStudents = students.filter((s) => s.verification_status === 'pending').length;
    const totalTeachers = profiles.filter((p) => p.role === 'faculty' || p.role === 'hod').length;
    const totalPaymentsSum = paymentRecords
      .filter((p) => p.status === 'verified' || p.status === 'success')
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalAttendanceSessions = attendanceSessions.length;
    const totalTimetableSlots = timetableSlots.length;
    const totalExaminations = examinations.length;

    return {
      totalColleges: collegesList.length,
      totalStudents,
      pendingStudents,
      totalTeachers,
      totalPaymentsSum,
      totalAttendanceSessions,
      totalTimetableSlots,
      totalExaminations,
    };
  }, [
    collegesList,
    students,
    profiles,
    paymentRecords,
    attendanceSessions,
    timetableSlots,
    examinations,
  ]);

  // Selected college object and STRICTLY ISOLATED data
  const selectedCollege = useMemo(() => {
    if (!selectedCollegeCode) return null;
    return collegesList.find((c) => c.code === selectedCollegeCode) || {
      code: selectedCollegeCode,
      name: `College (${selectedCollegeCode})`,
    };
  }, [selectedCollegeCode, collegesList]);

  const collegeData = useMemo(() => {
    if (!selectedCollegeCode) return null;
    const code = selectedCollegeCode.toUpperCase();

    const collegeStudents = students.filter(
      (s) => (s.college_code || '').toUpperCase() === code
    );
    const collegeProfiles = profiles.filter(
      (p) => (p.college_code || '').toUpperCase() === code
    );
    const collegeTeachers = collegeProfiles.filter(
      (p) => p.role === 'faculty' || p.role === 'hod'
    );
    const collegeOrganizer = collegeProfiles.find((p) => p.role === 'super_admin');
    const pendingApprovals = collegeStudents.filter(
      (s) => s.verification_status === 'pending'
    );

    const collegeAttendance = attendanceSessions.filter(
      (a) => (a.college_code || '').toUpperCase() === code
    );
    const collegeTimetable = timetableSlots.filter(
      (t) => (t.college_code || '').toUpperCase() === code
    );
    const collegeExams = examinations.filter(
      (e) => (e.college_code || '').toUpperCase() === code
    );
    const collegeGradeCards = gradeCards.filter(
      (g) => (g.college_code || '').toUpperCase() === code
    );

    const collegeFees = feeAssignments.filter(
      (f) => (f.college_code || '').toUpperCase() === code
    );
    const collegeFeeStructures = feeStructures.filter(
      (fs) => (fs.college_code || '').toUpperCase() === code
    );
    const collegePayments = paymentRecords.filter(
      (p) => (p.college_code || '').toUpperCase() === code
    );

    const collegeNotices = notices.filter(
      (n) => (n.college_code || '').toUpperCase() === code
    );
    const collegeLeaves = leaveRequests.filter(
      (l) => (l.college_code || '').toUpperCase() === code
    );
    const collegeTickets = tickets.filter(
      (tk) => (tk.college_code || '').toUpperCase() === code
    );
    const collegeLogs = auditLogs.filter(
      (log) => (log.college_code || '').toUpperCase() === code
    );

    const totalCollected = collegePayments
      .filter((p) => p.status === 'verified' || p.status === 'success')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      students: collegeStudents,
      teachers: collegeTeachers,
      organizer: collegeOrganizer,
      pendingApprovals,
      attendance: collegeAttendance,
      timetable: collegeTimetable,
      examinations: collegeExams,
      gradeCards: collegeGradeCards,
      feeAssignments: collegeFees,
      feeStructures: collegeFeeStructures,
      payments: collegePayments,
      totalCollected,
      notices: collegeNotices,
      leaves: collegeLeaves,
      tickets: collegeTickets,
      logs: collegeLogs,
    };
  }, [
    selectedCollegeCode,
    students,
    profiles,
    attendanceSessions,
    timetableSlots,
    examinations,
    gradeCards,
    feeAssignments,
    feeStructures,
    paymentRecords,
    notices,
    leaveRequests,
    tickets,
    auditLogs,
  ]);

  const handleApprove = async (studentId: string) => {
    if (!onApproveStudent) return;
    try {
      setActionLoadingId(studentId);
      await onApproveStudent(studentId);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (studentId: string) => {
    if (!onRejectStudent) return;
    const reason = window.prompt('Enter rejection remarks / reason:') || 'Registration unverified';
    try {
      setActionLoadingId(studentId);
      await onRejectStudent(studentId, reason);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Complete Admin Audit & Logging Dashboard Renderer
  const renderAuditDashboard = (logsToDisplay: PlatformAuditLog[], isCollegeSpecific: boolean) => {
    // 1. Categorize all input logs
    const categorized = {
      all: logsToDisplay,
      auth: logsToDisplay.filter((l) => getLogCategory(l) === 'auth'),
      users: logsToDisplay.filter((l) => getLogCategory(l) === 'users'),
      approvals: logsToDisplay.filter((l) => getLogCategory(l) === 'approvals'),
      academics: logsToDisplay.filter((l) => getLogCategory(l) === 'academics'),
      finance: logsToDisplay.filter((l) => getLogCategory(l) === 'finance'),
      system: logsToDisplay.filter((l) => getLogCategory(l) === 'system'),
    };

    // 2. Filter by category, search query, institution, role, status
    const currentBaseLogs = auditCategory === 'all' ? logsToDisplay : categorized[auditCategory];

    const filtered = currentBaseLogs.filter((log) => {
      // Search
      if (auditQuery.trim()) {
        const q = auditQuery.toLowerCase().trim();
        const matchesQuery =
          (log.actor_name || '').toLowerCase().includes(q) ||
          (log.actor_email || '').toLowerCase().includes(q) ||
          (log.action || '').toLowerCase().includes(q) ||
          (log.entity || '').toLowerCase().includes(q) ||
          (log.entity_id || '').toLowerCase().includes(q) ||
          (log.college_code || '').toLowerCase().includes(q) ||
          JSON.stringify(log.metadata || {}).toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // College filter
      if (!isCollegeSpecific && auditCollegeFilter !== 'all') {
        if ((log.college_code || '').toUpperCase() !== auditCollegeFilter.toUpperCase()) return false;
      }

      // Role filter
      if (auditRoleFilter !== 'all') {
        if ((log.actor_role || '').toLowerCase() !== auditRoleFilter.toLowerCase()) return false;
      }

      // Status filter
      if (auditStatusFilter !== 'all') {
        const stat = getLogStatus(log).tone;
        if (auditStatusFilter === 'success' && stat !== 'success') return false;
        if (auditStatusFilter === 'warning' && stat !== 'warning') return false;
        if (auditStatusFilter === 'danger' && stat !== 'danger') return false;
      }

      return true;
    });

    // Pagination
    const pageSize = 15;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginatedLogs = filtered.slice((auditPage - 1) * pageSize, auditPage * pageSize);

    // Export CSV
    const exportAuditCSV = () => {
      const header = 'Timestamp,Actor_Name,Actor_Email,Role,College_Code,Action,Entity,Entity_ID,Status,Metadata\n';
      const rows = filtered
        .map((l) =>
          `"${l.created_at}","${l.actor_name || ''}","${l.actor_email || ''}","${l.actor_role || ''}","${l.college_code || ''}","${l.action || ''}","${l.entity || ''}","${l.entity_id || ''}","${getLogStatus(l).label}","${JSON.stringify(l.metadata || {}).replace(/"/g, '""')}"`
        )
        .join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Audit_Logs_${isCollegeSpecific ? selectedCollegeCode : 'Platform'}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      if (onToast) onToast(`Exported ${filtered.length} audit logs to CSV.`);
    };

    return (
      <div className="space-y-6">
        {/* Top Summary Stat Tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <GlassCard padding="md" className="space-y-1">
            <div className="text-[10px] font-semibold text-muted uppercase">Total Events</div>
            <div className="text-xl font-bold font-mono text-ink">{logsToDisplay.length}</div>
            <div className="text-[10px] text-accent">Persisted entries</div>
          </GlassCard>
          <GlassCard padding="md" className="space-y-1">
            <div className="text-[10px] font-semibold text-muted uppercase">Authentication</div>
            <div className="text-xl font-bold font-mono text-indigo-400">{categorized.auth.length}</div>
            <div className="text-[10px] text-muted">Logins &amp; sessions</div>
          </GlassCard>
          <GlassCard padding="md" className="space-y-1">
            <div className="text-[10px] font-semibold text-muted uppercase">User Lifecycle</div>
            <div className="text-xl font-bold font-mono text-sky-400">{categorized.users.length}</div>
            <div className="text-[10px] text-muted">Profiles &amp; rosters</div>
          </GlassCard>
          <GlassCard padding="md" className="space-y-1">
            <div className="text-[10px] font-semibold text-muted uppercase">Approvals</div>
            <div className="text-xl font-bold font-mono text-emerald-400">{categorized.approvals.length}</div>
            <div className="text-[10px] text-muted">Student &amp; code verifs</div>
          </GlassCard>
          <GlassCard padding="md" className="space-y-1">
            <div className="text-[10px] font-semibold text-muted uppercase">Academic Ops</div>
            <div className="text-xl font-bold font-mono text-purple-400">{categorized.academics.length}</div>
            <div className="text-[10px] text-muted">Attendance, exams, TT</div>
          </GlassCard>
          <GlassCard padding="md" className="space-y-1">
            <div className="text-[10px] font-semibold text-muted uppercase">Finance &amp; Fees</div>
            <div className="text-xl font-bold font-mono text-amber-400">{categorized.finance.length}</div>
            <div className="text-[10px] text-muted">Receipts &amp; ledger</div>
          </GlassCard>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
          {[
            { id: 'all', label: 'All Logs', count: logsToDisplay.length },
            { id: 'auth', label: 'Authentication Logs', count: categorized.auth.length },
            { id: 'users', label: 'User & Account Activity', count: categorized.users.length },
            { id: 'approvals', label: 'Approval Logs', count: categorized.approvals.length },
            { id: 'academics', label: 'Academic Activity', count: categorized.academics.length },
            { id: 'finance', label: 'Finance & Fee Activity', count: categorized.finance.length },
            { id: 'system', label: 'System & Error Logs', count: categorized.system.length },
          ].map((cat) => {
            const isActive = auditCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setAuditCategory(cat.id as any);
                  setAuditPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-accent text-white shadow-sm ring-1 ring-accent'
                    : 'glass text-muted hover:text-ink'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-surface text-muted border border-line'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls & Live Connection Badge */}
        <GlassCard padding="md" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-ink">
                Live Audit Stream Connected
              </span>
              <span className="text-[11px] text-muted">
                (Real-time SSE &amp; Database Sync Active)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={exportAuditCSV}>
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                <span>Export Filtered CSV</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-line/40">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                placeholder="Search actor, action, entity..."
                value={auditQuery}
                onChange={(e) => {
                  setAuditQuery(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full rounded-[8px] border border-line bg-surface py-2 pl-8 pr-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>

            {!isCollegeSpecific ? (
              <Select
                value={auditCollegeFilter}
                onChange={(e) => {
                  setAuditCollegeFilter(e.target.value);
                  setAuditPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Institutions & Platform' },
                  ...validCollegeCodes.map((c) => ({
                    value: c.code,
                    label: `${c.code} · ${c.collegeName}`,
                  })),
                ]}
              />
            ) : (
              <div className="rounded-[8px] border border-line bg-surface/50 px-3 py-2 text-xs flex items-center justify-between">
                <span className="text-muted">Institution:</span>
                <span className="font-mono font-bold text-ink">{selectedCollegeCode}</span>
              </div>
            )}

            <Select
              value={auditRoleFilter}
              onChange={(e) => {
                setAuditRoleFilter(e.target.value);
                setAuditPage(1);
              }}
              options={[
                { value: 'all', label: 'All Actor Roles' },
                { value: 'admin', label: 'Platform Administrator' },
                { value: 'super_admin', label: 'College Organizer' },
                { value: 'faculty', label: 'Faculty / Teacher' },
                { value: 'hod', label: 'Head of Department' },
                { value: 'student', label: 'Student' },
                { value: 'unauthenticated', label: 'Unauthenticated / Anonymous' },
              ]}
            />

            <Select
              value={auditStatusFilter}
              onChange={(e) => {
                setAuditStatusFilter(e.target.value);
                setAuditPage(1);
              }}
              options={[
                { value: 'all', label: 'All Action Statuses' },
                { value: 'success', label: 'Success / Completed' },
                { value: 'warning', label: 'Action / Reversal / Warning' },
                { value: 'danger', label: 'Failed / Rejected / Lockout' },
              ]}
            />
          </div>
        </GlassCard>

        {/* Structured Audit Table */}
        <GlassCard padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              <h3 className="font-bold text-sm text-ink">
                Audit Trail Ledger ({filtered.length} entries matching criteria)
              </h3>
            </div>
            <span className="text-xs text-muted font-mono">
              Page {auditPage} of {totalPages}
            </span>
          </div>

          {paginatedLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted">
              No audit log entries match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-surface/60 text-muted font-semibold">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User / Actor</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Institution</th>
                    <th className="px-4 py-3">Action &amp; Category</th>
                    <th className="px-4 py-3">Affected Record</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {paginatedLogs.map((log) => {
                    const status = getLogStatus(log);
                    const category = getLogCategory(log);
                    return (
                      <tr key={log.id} className="hover:bg-surface/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono text-ink">
                            {new Date(log.created_at).toLocaleDateString([], {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                            })}
                          </div>
                          <div className="font-mono text-[10px] text-muted">
                            {new Date(log.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-ink truncate max-w-[140px]">
                            {log.actor_name || 'System / Anonymous'}
                          </div>
                          <div className="text-[10px] text-muted truncate max-w-[140px]">
                            {log.actor_email || log.actor_id}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <Badge tone="neutral" className="uppercase font-mono text-[10px]">
                            {log.actor_role}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 font-mono">
                          <span className="rounded bg-surface px-1.5 py-0.5 border border-line text-[10px] text-muted">
                            {log.college_code || 'PLATFORM'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-accent truncate max-w-[180px]">
                            {log.action}
                          </div>
                          <div className="text-[10px] text-muted capitalize">
                            Category: {category}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-muted text-[11px]">
                          <div>{log.entity}</div>
                          {log.entity_id && (
                            <div className="text-[10px] text-ink truncate max-w-[120px]">
                              ID: {log.entity_id}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <Badge tone={status.tone} dot>
                            {status.label}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedAuditLog(log)}
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-line flex items-center justify-between text-xs">
              <Button
                variant="secondary"
                size="sm"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </Button>
              <span className="text-muted font-mono">
                Showing {Math.min(filtered.length, (auditPage - 1) * pageSize + 1)}–
                {Math.min(filtered.length, auditPage * pageSize)} of {filtered.length} entries
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={auditPage >= totalPages}
                onClick={() => setAuditPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </Button>
            </div>
          )}
        </GlassCard>

        {/* Modal for Detailed Audit Record Inspection */}
        <ModalDialog
          open={Boolean(selectedAuditLog)}
          onClose={() => setSelectedAuditLog(null)}
          title={`Audit Log Details · ${selectedAuditLog?.action || 'Record Inspection'}`}
          description="Protected immutable administrative audit record."
        >
          {selectedAuditLog && (
            <div className="space-y-4">
              <div className="rounded-[10px] border border-line bg-surface/50 p-3 grid grid-cols-2 gap-2 text-xs">
                <div>Log ID: <strong className="font-mono text-ink">{selectedAuditLog.id}</strong></div>
                <div>Timestamp: <strong className="font-mono text-ink">{selectedAuditLog.created_at}</strong></div>
                <div>Actor: <strong className="text-ink">{selectedAuditLog.actor_name} ({selectedAuditLog.actor_email})</strong></div>
                <div>Role: <strong className="font-mono uppercase text-accent">{selectedAuditLog.actor_role}</strong></div>
                <div>Institution: <strong className="font-mono text-ink">{selectedAuditLog.college_code || 'PLATFORM'}</strong></div>
                <div>Entity: <strong className="font-mono text-ink">{selectedAuditLog.entity}:{selectedAuditLog.entity_id}</strong></div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1 block">
                  Captured Event Metadata Payload (Redacted of sensitive secrets)
                </label>
                <pre className="rounded-[10px] border border-line bg-surface-2 p-3 text-[11px] font-mono text-ink overflow-x-auto max-h-60 scrollbar-thin">
                  {JSON.stringify(
                    (() => {
                      const clean: any = { ...(selectedAuditLog.metadata || {}) };
                      delete clean.password;
                      delete clean.token;
                      delete clean.session_token;
                      return clean;
                    })(),
                    null,
                    2
                  )}
                </pre>
              </div>

              <div className="flex justify-end pt-2 border-t border-line">
                <Button variant="secondary" size="sm" onClick={() => setSelectedAuditLog(null)}>
                  Close Inspection
                </Button>
              </div>
            </div>
          )}
        </ModalDialog>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Platform Administrator Header Banner */}
      <div className="relative overflow-hidden rounded-[20px] border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-900/30 p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
              <Shield className="h-3.5 w-3.5" />
              Platform Administrator Workspace · Strict College Data Isolation
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-ink">
              {selectedCollege
                ? selectedCollege.name
                : adminPlatformView === 'audit_center'
                  ? 'Platform Audit & Security Event Stream'
                  : 'Platform Overview & Multi-College Directory'}
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              {selectedCollege
                ? `Dedicated College Workspace for Code [${selectedCollege.code}] · Isolated records & operational control`
                : adminPlatformView === 'audit_center'
                  ? 'Real-time multi-tenant immutable audit records across authentication, operations, academics, and finances.'
                  : 'Real-time multi-tenant monitoring across all registered educational institutions.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!selectedCollegeCode && (
              <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setAdminPlatformView('colleges')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    adminPlatformView === 'colleges'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-indigo-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Colleges Directory</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminPlatformView('audit_center')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    adminPlatformView === 'audit_center'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-indigo-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Audit &amp; System Logs</span>
                  <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
                    {auditLogs.length}
                  </span>
                </button>
              </div>
            )}
            {selectedCollegeCode && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setSelectedCollegeCode(null);
                  setCollegeTab('overview');
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                All Colleges Overview
              </Button>
            )}
            <Badge tone="accent">
              Admin: {currentProfile.full_name || currentProfile.email}
            </Badge>
          </div>
        </div>
      </div>

      {/* VIEW 1A: PLATFORM-WIDE DASHBOARD & DIRECTORY */}
      {!selectedCollegeCode && adminPlatformView === 'colleges' && (
        <div className="space-y-6">
          {/* Top Platform KPI Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            <GlassCard padding="md" className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Registered Colleges
                </span>
                <Building2 className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="font-editorial text-2xl font-bold text-ink">
                {platformStats.totalColleges}
              </div>
              <div className="text-[10px] text-muted">Active independent tenants</div>
            </GlassCard>

            <GlassCard padding="md" className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Total Students
                </span>
                <GraduationCap className="h-4 w-4 text-accent" />
              </div>
              <div className="font-editorial text-2xl font-bold text-ink">
                {platformStats.totalStudents}
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                {platformStats.pendingStudents > 0 ? (
                  <span className="font-semibold text-warning">
                    {platformStats.pendingStudents} Pending Approvals
                  </span>
                ) : (
                  <span className="text-success">All students verified</span>
                )}
              </div>
            </GlassCard>

            <GlassCard padding="md" className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Faculty &amp; Teachers
                </span>
                <BookOpen className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="font-editorial text-2xl font-bold text-ink">
                {platformStats.totalTeachers}
              </div>
              <div className="text-[10px] text-muted">Across all departments</div>
            </GlassCard>

            <GlassCard padding="md" className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Verified Fees Collected
                </span>
                <DollarSign className="h-4 w-4 text-amber-400" />
              </div>
              <div className="font-editorial text-2xl font-bold text-ink">
                ₹{platformStats.totalPaymentsSum.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-muted">Platform-wide receipts</div>
            </GlassCard>
          </div>

          {/* Searchable Colleges Directory */}
          <GlassCard padding="lg" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--glass-border-subtle)] pb-4">
              <div>
                <h2 className="font-editorial text-xl font-bold text-ink">
                  Registered Institutions Directory
                </h2>
                <p className="text-xs text-muted">
                  Select any college to inspect its dedicated workspace with complete data privacy
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                <input
                  type="text"
                  placeholder="Search by college name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface/50 py-2 pl-9 pr-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {filteredColleges.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                No colleges match &quot;{searchQuery}&quot;. Register a College Organizer to create a college.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredColleges.map((col) => {
                  const colStudents = students.filter(
                    (s) => (s.college_code || '').toUpperCase() === col.code
                  );
                  const colTeachers = profiles.filter(
                    (p) =>
                      (p.college_code || '').toUpperCase() === col.code &&
                      (p.role === 'faculty' || p.role === 'hod')
                  );
                  const colPending = colStudents.filter((s) => s.verification_status === 'pending');

                  return (
                    <div
                      key={col.code}
                      onClick={() => setSelectedCollegeCode(col.code)}
                      className="group flex flex-col justify-between rounded-[16px] border border-[var(--glass-border)] bg-[var(--surface)]/60 p-4 transition-all duration-200 hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:shadow-md cursor-pointer"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <span className="font-mono text-xs font-bold rounded-lg bg-surface border border-line px-2 py-0.5 text-accent">
                            {col.code}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-editorial text-base font-bold text-ink group-hover:text-indigo-400 transition-colors">
                            {col.name}
                          </h3>
                          {col.organizer && (
                            <p className="text-[11px] text-muted truncate">
                              Organizer: {col.organizer.full_name} ({col.organizer.email})
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 border-t border-[var(--glass-border-subtle)] pt-3">
                        <div className="grid grid-cols-3 gap-1 text-center">
                          <div className="rounded-lg bg-surface/50 p-1.5">
                            <div className="text-xs font-bold text-ink">{colStudents.length}</div>
                            <div className="text-[9px] text-muted">Students</div>
                          </div>
                          <div className="rounded-lg bg-surface/50 p-1.5">
                            <div className="text-xs font-bold text-ink">{colTeachers.length}</div>
                            <div className="text-[9px] text-muted">Teachers</div>
                          </div>
                          <div className="rounded-lg bg-surface/50 p-1.5">
                            <div
                              className={`text-xs font-bold ${
                                colPending.length > 0 ? 'text-warning' : 'text-success'
                              }`}
                            >
                              {colPending.length}
                            </div>
                            <div className="text-[9px] text-muted">Pending</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                          <span>Open College Workspace</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Recent Platform Audit Logs */}
          <GlassCard padding="lg" className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                <h3 className="font-editorial text-base font-bold text-ink">
                  Recent Platform Audit &amp; Event Stream
                </h3>
              </div>
              <Badge tone="neutral">{auditLogs.length} Events Logged</Badge>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted">No audit events logged yet.</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {auditLogs.slice(0, 15).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[var(--glass-border-subtle)] bg-surface/40 p-2.5 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-accent">{log.action}</span>
                        {log.college_code && (
                          <span className="rounded bg-surface px-1.5 py-0.2 text-[10px] font-mono text-muted border border-line">
                            {log.college_code}
                          </span>
                        )}
                        <span className="text-[10px] text-muted">by {log.actor_role}</span>
                      </div>
                      <div className="text-muted text-[11px] truncate max-w-xl">
                        {log.actor_email} · {JSON.stringify(log.metadata || {})}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* VIEW 1B: DEDICATED ADMIN AUDIT & LOGGING SYSTEM */}
      {!selectedCollegeCode && adminPlatformView === 'audit_center' && (
        <div className="space-y-6">
          {renderAuditDashboard(auditLogs, false)}
        </div>
      )}

      {/* VIEW 2: DEDICATED COLLEGE WORKSPACE (STRICTLY ISOLATED) */}
      {selectedCollegeCode && collegeData && (
        <div className="space-y-6">
          {/* College Sub-Navbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--glass-border)] pb-3">
            {[
              { id: 'overview', label: 'Overview & Info', icon: Building2 },
              {
                id: 'users',
                label: `Users & Approvals (${collegeData.pendingApprovals.length})`,
                icon: Users,
              },
              { id: 'academics', label: 'Academics & Exams', icon: BookOpen },
              { id: 'finance', label: 'Finance & Fees', icon: DollarSign },
              { id: 'operations', label: 'Operations & Leaves', icon: Layers },
              { id: 'audit', label: 'College Audit Logs', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = collegeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCollegeTab(tab.id as any)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-accent text-white shadow-sm'
                      : 'glass text-muted hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {collegeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <GlassCard padding="md">
                  <div className="text-xs text-muted">Registered Students</div>
                  <div className="mt-1 font-editorial text-2xl font-bold text-ink">
                    {collegeData.students.length}
                  </div>
                  <div className="text-[10px] text-muted">
                    {collegeData.pendingApprovals.length} pending
                  </div>
                </GlassCard>
                <GlassCard padding="md">
                  <div className="text-xs text-muted">Teachers / Faculty</div>
                  <div className="mt-1 font-editorial text-2xl font-bold text-ink">
                    {collegeData.teachers.length}
                  </div>
                  <div className="text-[10px] text-muted">Assigned to college</div>
                </GlassCard>
                <GlassCard padding="md">
                  <div className="text-xs text-muted">Attendance Sessions</div>
                  <div className="mt-1 font-editorial text-2xl font-bold text-ink">
                    {collegeData.attendance.length}
                  </div>
                  <div className="text-[10px] text-muted">Recorded sessions</div>
                </GlassCard>
                <GlassCard padding="md">
                  <div className="text-xs text-muted">Fee Collection</div>
                  <div className="mt-1 font-editorial text-2xl font-bold text-ink">
                    ₹{collegeData.totalCollected.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-success">Verified payments</div>
                </GlassCard>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <GlassCard padding="lg" className="space-y-3">
                  <h3 className="font-editorial text-lg font-bold text-ink">
                    College Information
                  </h3>
                  <div className="space-y-2 text-xs divide-y divide-[var(--glass-border-subtle)]">
                    <div className="flex justify-between py-2">
                      <span className="text-muted">College Name</span>
                      <span className="font-semibold text-ink">{selectedCollege?.name}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted">Unique College Code</span>
                      <span className="font-mono font-bold text-accent">
                        {selectedCollege?.code}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted">College Organizer</span>
                      <span className="font-semibold text-ink">
                        {collegeData.organizer?.full_name || 'Organizer Registered'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted">Organizer Email</span>
                      <span className="text-ink">{collegeData.organizer?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted">Account Status</span>
                      <Badge tone="success">Active Tenant</Badge>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard padding="lg" className="space-y-3">
                  <h3 className="font-editorial text-lg font-bold text-ink">
                    Academic &amp; Operational Health
                  </h3>
                  <div className="space-y-2 text-xs divide-y divide-[var(--glass-border-subtle)]">
                    <div className="flex justify-between py-2">
                      <span className="text-muted">Timetable Slots</span>
                      <span className="font-semibold text-ink">
                        {collegeData.timetable.length} active slots
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted">Scheduled Examinations</span>
                      <span className="font-semibold text-ink">
                        {collegeData.examinations.length} exams
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted">Circulars Issued</span>
                      <span className="font-semibold text-ink">
                        {collegeData.notices.length} notices
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted">Open Helpdesk Tickets</span>
                      <span className="font-semibold text-ink">
                        {collegeData.tickets.filter((t) => t.status === 'open').length} open
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted">Pending Student Leaves</span>
                      <span className="font-semibold text-ink">
                        {collegeData.leaves.filter((l) => (l.status as string).toLowerCase().includes('pending')).length} pending
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* TAB 2: USERS & REGISTRATIONS (STUDENTS & TEACHERS) */}
          {collegeTab === 'users' && (
            <div className="space-y-6">
              {/* Pending Approvals Section */}
              <GlassCard padding="lg" className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] pb-3">
                  <div>
                    <h3 className="font-editorial text-lg font-bold text-ink">
                      Pending Student Approvals ({collegeData.pendingApprovals.length})
                    </h3>
                    <p className="text-xs text-muted">
                      Students registered using code [{selectedCollegeCode}] awaiting verification
                    </p>
                  </div>
                  <Badge tone={collegeData.pendingApprovals.length > 0 ? 'warning' : 'success'}>
                    {collegeData.pendingApprovals.length > 0
                      ? 'Action Required'
                      : 'All Students Approved'}
                  </Badge>
                </div>

                {collegeData.pendingApprovals.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted">
                    No pending student approval requests for this college.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {collegeData.pendingApprovals.map((stu) => (
                      <div
                        key={stu.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-ink">{stu.full_name}</span>
                            <span className="font-mono text-xs rounded bg-surface px-2 py-0.5 text-accent border border-line">
                              {stu.enrolment_no}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted">
                            {stu.email} · Dept: {stu.department} · Year {stu.year}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={actionLoadingId === stu.id}
                            onClick={() => handleApprove(stu.id)}
                            className="bg-success hover:bg-success/90 text-white gap-1.5"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={actionLoadingId === stu.id}
                            onClick={() => handleReject(stu.id)}
                            className="text-danger hover:bg-danger/10 gap-1.5"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* All Registered Students */}
              <GlassCard padding="lg" className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] pb-3">
                  <h3 className="font-editorial text-lg font-bold text-ink">
                    All Registered Students ({collegeData.students.length})
                  </h3>
                  <Badge tone="neutral">Code: {selectedCollegeCode}</Badge>
                </div>

                {collegeData.students.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted">
                    No students registered yet for this college.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-line text-muted">
                          <th className="py-2.5">Name</th>
                          <th className="py-2.5">Enrolment No</th>
                          <th className="py-2.5">Department</th>
                          <th className="py-2.5">Year / Sem</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5">Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--glass-border-subtle)]">
                        {collegeData.students.map((stu) => (
                          <tr key={stu.id} className="hover:bg-surface/30">
                            <td className="py-2.5 font-medium text-ink">
                              <div>{stu.full_name}</div>
                              <div className="text-[10px] text-muted">{stu.email}</div>
                            </td>
                            <td className="py-2.5 font-mono text-muted">{stu.enrolment_no}</td>
                            <td className="py-2.5">{stu.department}</td>
                            <td className="py-2.5">Year {stu.year}</td>
                            <td className="py-2.5">
                              <Badge
                                tone={stu.verification_status === 'approved' ? 'success' : 'warning'}
                              >
                                {stu.verification_status}
                              </Badge>
                            </td>
                            <td className="py-2.5 font-mono font-bold text-ink">
                              {stu.attendance_pct || 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>

              {/* Registered Teachers */}
              <GlassCard padding="lg" className="space-y-4">
                <h3 className="font-editorial text-lg font-bold text-ink">
                  Registered Teachers &amp; Faculty ({collegeData.teachers.length})
                </h3>
                {collegeData.teachers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted">
                    No faculty accounts registered yet with this college code.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {collegeData.teachers.map((tch) => (
                      <div
                        key={tch.id}
                        className="rounded-xl border border-[var(--glass-border)] bg-surface/40 p-3.5 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{tch.full_name}</span>
                          <Badge tone="accent">{tch.role.toUpperCase()}</Badge>
                        </div>
                        <div className="text-muted">{tch.email}</div>
                        <div className="text-[11px] text-muted">
                          ID: {tch.identifier_no || 'N/A'} · Dept:{' '}
                          {tch.department || 'Academic Registry'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* TAB 3: ACADEMICS & EXAMS */}
          {collegeTab === 'academics' && (
            <div className="space-y-6">
              {/* Examinations List */}
              <GlassCard padding="lg" className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] pb-3">
                  <h3 className="font-editorial text-lg font-bold text-ink">
                    Examinations &amp; Results ({collegeData.examinations.length})
                  </h3>
                  <Badge tone="neutral">Associated with {selectedCollegeCode}</Badge>
                </div>

                {collegeData.examinations.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted">
                    No examinations scheduled yet for this college.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {collegeData.examinations.map((exam) => (
                      <div
                        key={exam.id}
                        className="rounded-xl border border-[var(--glass-border)] bg-surface/40 p-4 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-ink">{exam.name}</span>
                          <Badge tone={exam.is_published ? 'success' : 'warning'}>
                            {exam.is_published ? 'Published to Students' : 'Draft / Unpublished'}
                          </Badge>
                        </div>
                        <div className="text-muted">
                          Subject: {exam.subject_name || exam.subject_code} · Date: {exam.exam_date} · Max Marks: {exam.max_marks} (Pass: {exam.passing_marks})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Timetable Overview */}
              <GlassCard padding="lg" className="space-y-4">
                <h3 className="font-editorial text-lg font-bold text-ink">
                  Academic Timetable Slots ({collegeData.timetable.length})
                </h3>
                {collegeData.timetable.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted">
                    No timetable slots saved for this college.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {collegeData.timetable.map((slot) => (
                      <div
                        key={slot.id}
                        className="rounded-xl border border-[var(--glass-border)] bg-surface/40 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{slot.subject_code}</span>
                          <span className="font-mono text-[10px] text-accent">{slot.weekday}</span>
                        </div>
                        <div className="text-muted">
                          Period {slot.period} ({slot.start_time || '09:00'} - {slot.end_time || '10:00'}) · Room: {slot.room || 'Standard Room'}
                        </div>
                        <div className="text-[11px] text-muted">
                          Faculty: {slot.faculty_name || slot.faculty_id}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Attendance Sessions */}
              <GlassCard padding="lg" className="space-y-4">
                <h3 className="font-editorial text-lg font-bold text-ink">
                  Recorded Attendance Sessions ({collegeData.attendance.length})
                </h3>
                {collegeData.attendance.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted">
                    No attendance sessions recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {collegeData.attendance.map((att) => {
                      const recordsList = Object.values(att.records || {});
                      const presentCount = recordsList.filter((r) => r === 'Present' || r === 'On Duty').length;
                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between rounded-xl border border-line bg-surface/30 p-2.5 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-ink">{att.subject_code}</span>
                            <span className="text-muted ml-2">
                              {att.date}
                            </span>
                          </div>
                          <Badge tone="success">
                            {presentCount} Present / {recordsList.length} Total
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* TAB 4: FINANCE */}
          {collegeTab === 'finance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <GlassCard padding="md">
                  <div className="text-xs text-muted">Total Collections</div>
                  <div className="mt-1 font-editorial text-2xl font-bold text-ink">
                    ₹{collegeData.totalCollected.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-success">Verified payments</div>
                </GlassCard>
                <GlassCard padding="md">
                  <div className="text-xs text-muted">Active Fee Structures</div>
                  <div className="mt-1 font-editorial text-2xl font-bold text-ink">
                    {collegeData.feeStructures.length}
                  </div>
                  <div className="text-[10px] text-muted">Configured plans</div>
                </GlassCard>
                <GlassCard padding="md">
                  <div className="text-xs text-muted">Fee Assignments</div>
                  <div className="mt-1 font-editorial text-2xl font-bold text-ink">
                    {collegeData.feeAssignments.length}
                  </div>
                  <div className="text-[10px] text-muted">Assigned to students</div>
                </GlassCard>
              </div>

              {/* Payment Records */}
              <GlassCard padding="lg" className="space-y-4">
                <h3 className="font-editorial text-lg font-bold text-ink">
                  Payment Transactions ({collegeData.payments.length})
                </h3>
                {collegeData.payments.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted">
                    No payment transactions recorded for this college.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-line text-muted">
                          <th className="py-2.5">Date</th>
                          <th className="py-2.5">Amount</th>
                          <th className="py-2.5">Method</th>
                          <th className="py-2.5">Transaction ID</th>
                          <th className="py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--glass-border-subtle)]">
                        {collegeData.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2.5 text-muted">{p.created_at?.slice(0, 10)}</td>
                            <td className="py-2.5 font-bold text-ink">₹{((p.amount_paise || 0) / 100).toLocaleString('en-IN')}</td>
                            <td className="py-2.5 capitalize">{p.mode}</td>
                            <td className="py-2.5 font-mono text-muted">{p.reference || p.receipt_no}</td>
                            <td className="py-2.5">
                              <Badge tone="success">
                                Credited
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* TAB 5: OPERATIONS & LEAVES */}
          {collegeTab === 'operations' && (
            <div className="space-y-6">
              {/* Leave Requests */}
              <GlassCard padding="lg" className="space-y-4">
                <h3 className="font-editorial text-lg font-bold text-ink">
                  Student Leave Applications ({collegeData.leaves.length})
                </h3>
                {collegeData.leaves.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted">
                    No leave applications submitted in this college.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {collegeData.leaves.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-xl border border-[var(--glass-border)] bg-surface/30 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{l.applicant_name}</span>
                          <Badge
                            tone={
                              l.status === 'Approved'
                                ? 'success'
                                : l.status === 'Rejected'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {l.status}
                          </Badge>
                        </div>
                        <div className="text-muted">
                          Dates: {l.dates_label || `${l.from_date} to ${l.to_date}`} ({l.days_count} days) · Reason: {l.reason}
                        </div>
                        {(l.rejection_reason || l.reviewer_remarks) && (
                          <div className="text-[11px] text-danger">Remarks: {l.rejection_reason || l.reviewer_remarks}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Helpdesk Tickets */}
              <GlassCard padding="lg" className="space-y-4">
                <h3 className="font-editorial text-lg font-bold text-ink">
                  Helpdesk / Grievance Tickets ({collegeData.tickets.length})
                </h3>
                {collegeData.tickets.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted">
                    No tickets filed in this college.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {collegeData.tickets.map((tk) => (
                      <div
                        key={tk.id}
                        className="rounded-xl border border-[var(--glass-border)] bg-surface/30 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">
                            [{tk.id}] {tk.subject}
                          </span>
                          <Badge tone={tk.status === 'resolved' ? 'success' : 'warning'}>
                            {tk.status}
                          </Badge>
                        </div>
                        <div className="text-muted">
                          Creator: {tk.raised_by_name} · Role: {tk.raised_by_role} · {tk.created_at?.slice(0, 10)}
                        </div>
                        <div className="text-[11px] text-ink/80">{tk.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* TAB 6: AUDIT */}
          {collegeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-editorial text-xl font-bold text-ink">
                    Institutional Audit Trail &amp; Activity Log · [{selectedCollegeCode}]
                  </h3>
                  <p className="text-xs text-muted">
                    Isolated audit trail capturing academic, financial, attendance, and administrative actions for this college.
                  </p>
                </div>
                <Badge tone="accent">{collegeData.logs.length} Scoped Logs</Badge>
              </div>
              {renderAuditDashboard(collegeData.logs, true)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
