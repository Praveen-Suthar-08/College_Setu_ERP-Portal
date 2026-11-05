import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  HelpCircle,
  MessageSquare,
  Plus,
  Save,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  AssignmentItem,
  AttendanceCorrectionRequest,
  AttendanceSession,
  AttendanceStatus,
  FacultyRecord,
  GrievanceTicket,
  LeaveRequestItem,
  MentorMeeting,
  MentorRequest,
  NoticeItem,
  Profile,
  StudentRecord,
  Subject,
  TimetableSlot,
} from '../../types/portal';
import { generateLeavePermitPDF } from '../../utils/pdfGenerator';
import {
  Badge,
  Button,
  EmptyState,
  GlassCard,
  Input,
  ModalDialog,
  PageHeader,
  Select,
  StatusLabel,
} from '../ui/DesignSystem';

interface FacultyAndHodModuleProps {
  role: 'faculty' | 'hod';
  profile?: Profile;
  activeNav: string;
  onNavigate: (navId: string) => void;
  students: StudentRecord[];
  onReassignMentor: (studentId: string, mentorId: string, mentorName?: string) => void;
  mentorRequests?: MentorRequest[];
  facultyList: FacultyRecord[];
  subjects: Subject[];
  attendanceSessions: AttendanceSession[];
  onSaveAttendanceSession: (session: AttendanceSession) => void;
  onCreateAttendanceSession?: (session: AttendanceSession) => void;
  onUpdateSubjectMarks?: (
    subjectCode: string,
    studentId: string,
    component: string,
    marks: number
  ) => void;
  onAddTimetableSlot?: (slot: Omit<TimetableSlot, 'id'>) => void;
  corrections: AttendanceCorrectionRequest[];
  onRequestCorrection: (req: Omit<AttendanceCorrectionRequest, 'id' | 'created_at' | 'status'>) => void;
  onReviewCorrection: (id: string, decision: 'approved' | 'rejected') => void;
  leaveRequests: LeaveRequestItem[];
  onDecideLeave: (
    leaveId: string,
    step: 'mentor' | 'hod',
    decision: 'approved' | 'rejected',
    comment: string
  ) => void;
  mentorMeetings: MentorMeeting[];
  onAddMentorMeeting: (meeting: Omit<MentorMeeting, 'id'>) => void;
  notices: NoticeItem[];
  onCreateNotice: (
    title: string,
    body: string,
    category: NoticeItem['category'],
    scope: NoticeItem['audience_scope'],
    target: string
  ) => void;
  timetable: TimetableSlot[];
  assignments?: AssignmentItem[];
  onCreateAssignment?: (asg: Omit<AssignmentItem, 'id' | 'submitted'>) => void;
  tickets?: GrievanceTicket[];
  onResolveTicket?: (ticketId: string, resolution: string) => void;
  onToast: (msg: string) => void;
}

const CYCLE_ORDER: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'On Duty'];

export const FacultyAndHodModule: React.FC<FacultyAndHodModuleProps> = React.memo(({
  role,
  profile,
  activeNav,
  onNavigate,
  students,
  onReassignMentor,
  mentorRequests = [],
  facultyList,
  subjects,
  attendanceSessions,
  onSaveAttendanceSession,
  onCreateAttendanceSession,
  onUpdateSubjectMarks,
  onAddTimetableSlot,
  corrections,
  onRequestCorrection,
  onReviewCorrection,
  leaveRequests,
  onDecideLeave,
  mentorMeetings,
  onAddMentorMeeting,
  notices,
  onCreateNotice,
  timetable,
  assignments = [],
  onCreateAssignment,
  tickets = [],
  onResolveTicket,
  onToast,
}) => {
  // Fast Student Attendance Grid State
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    attendanceSessions[0]?.id || ''
  );
  const currentSession =
    attendanceSessions.find((s) => s.id === selectedSessionId) || attendanceSessions[0];

  const [gridRecords, setGridRecords] = useState<Record<string, AttendanceStatus>>(
    currentSession?.records || {}
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Create New Attendance Session Modal State
  const [newSessionModalOpen, setNewSessionModalOpen] = useState(false);
  const [newSessionSubjectCode, setNewSessionSubjectCode] = useState(subjects[0]?.code || 'CS601');
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [newSessionPeriod, setNewSessionPeriod] = useState('1');
  const [newSessionBatchLabel, setNewSessionBatchLabel] = useState('CSE Sem-6 — Sec A');

  useEffect(() => {
    if (currentSession) {
      setGridRecords(currentSession.records);
      setElapsedSeconds(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId, currentSession?.id]);

  useEffect(() => {
    if (activeNav !== 'attendance') return;
    const timer = setInterval(() => {
      setElapsedSeconds((s) => (s < 59 ? s + 1 : s));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeNav, selectedSessionId]);

  const isSessionLocked = currentSession
    ? Date.now() >= new Date(currentSession.locked_at).getTime()
    : false;

  // Correction Request Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [corrStudentId, setCorrStudentId] = useState(students[0]?.id || '');
  const [corrProposedStatus, setCorrProposedStatus] = useState<AttendanceStatus>('On Duty');
  const [corrReason, setCorrReason] = useState('');

  // Marks Entry State
  const [selectedSubjectCode, setSelectedSubjectCode] = useState(subjects[0]?.code || 'CS601');
  const [selectedComponent, setSelectedComponent] = useState('Internal 1 (Max 25)');
  const [marksDraft, setMarksDraft] = useState<Record<string, number>>({});
  const [marksError, setMarksError] = useState<string | null>(null);

  // Mentor Meeting Modal State
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingStudentId, setMeetingStudentId] = useState(students[0]?.id || '');
  const [privateNotes, setPrivateNotes] = useState('');
  const [sharedSummary, setSharedSummary] = useState('');
  const [actionItems, setActionItems] = useState('');

  // Leave Review Comment State
  const [leaveComments, setLeaveComments] = useState<Record<string, string>>({});

  // Notice Composer State
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeCategory, setNoticeCategory] = useState<NoticeItem['category']>('Academic');

  // Coursework & Lab Assignment Composer State
  const [asgTitle, setAsgTitle] = useState('');
  const [asgSubjectCode, setAsgSubjectCode] = useState(subjects[0]?.code || 'CS601');
  const [asgDueDate, setAsgDueDate] = useState('2026-11-15');
  const [asgMaxMarks, setAsgMaxMarks] = useState('20');

  // Timetable Slot Composer State
  const [ttWeekday, setTtWeekday] = useState<string>('1');
  const [ttPeriod, setTtPeriod] = useState('1');
  const [ttStartTime, setTtStartTime] = useState('09:00');
  const [ttEndTime, setTtEndTime] = useState('09:50');
  const [ttSubjectCode, setTtSubjectCode] = useState(subjects[0]?.code || 'CS601');
  const [ttRoom, setTtRoom] = useState('LH-204');
  const [ttNote, setTtNote] = useState('');
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<number>(1);

  // Ticket / Doubt Reply State
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});

  const counts = Object.values(gridRecords).reduce(
    (acc, st) => {
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    { Present: 0, Absent: 0, Late: 0, 'On Duty': 0, 'Approved Leave': 0 } as Record<
      AttendanceStatus,
      number
    >
  );

  const toggleStudentAttendance = (studentId: string, hasApprovedLeave: boolean) => {
    if (isSessionLocked) {
      setCorrStudentId(studentId);
      setCorrectionModalOpen(true);
      return;
    }
    if (hasApprovedLeave && gridRecords[studentId] === 'Approved Leave') {
      // Allow cycling
    }
    const curr = gridRecords[studentId] || 'Present';
    const nextIdx =
      (CYCLE_ORDER.indexOf(curr === 'Approved Leave' ? 'Present' : curr) + 1) % CYCLE_ORDER.length;
    setGridRecords((prev) => ({
      ...prev,
      [studentId]: CYCLE_ORDER[nextIdx],
    }));
  };

  const handleMarkAllPresent = () => {
    if (isSessionLocked) return;
    const next = Object.fromEntries(students.map((s) => [s.id, 'Present'])) as Record<
      string,
      AttendanceStatus
    >;
    setGridRecords(next);
    onToast(`All ${students.length} enrolled students marked Present. Tap exceptions only.`);
  };

  const activeTeacherName =
    profile?.full_name ||
    facultyList[0]?.full_name ||
    (role === 'hod' ? 'Head of Department' : 'Faculty Member');
  const activeTeacherDept =
    profile?.department || facultyList[0]?.department_code || 'Computer Science & Engineering';

  // 1. DASHBOARD (Faculty or HOD)
  if (activeNav === 'dashboard' || activeNav === 'department' || activeNav === 'classes') {
    const lowAttendanceStudents = (Array.isArray(students) ? students : []).filter(
      (s) => s.attendance_pct > 0 && s.attendance_pct < 75
    );
    const pendingLeaves = (Array.isArray(leaveRequests) ? leaveRequests : []).filter(
      (l) => l.status === 'Pending Mentor' || l.status === 'Pending HOD'
    );
    const openDoubtsCount = (Array.isArray(tickets) ? tickets : []).filter((t) => t.status !== 'resolved').length;
    const avgCohortPct =
      students.length > 0
        ? (students.reduce((acc, s) => acc + s.attendance_pct, 0) / students.length).toFixed(1)
        : '0.0';

    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow={role === 'hod' ? 'DEPARTMENT HEAD WORKSPACE' : 'FACULTY ACADEMIC WORKSPACE'}
          title={`Welcome back, ${activeTeacherName}`}
          subtitle={`${activeTeacherDept} · ID: ${profile?.identifier_no || 'FAC-ACTIVE'} · Real-Time Academic & Attendance Operations`}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="secondary" size="sm" onClick={() => onNavigate('timetable')}>
                <Calendar className="h-3.5 w-3.5" />
                Schedule &amp; Timetable
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onNavigate('marks')}>
                <FileText className="h-3.5 w-3.5" />
                Enter Marks
              </Button>
              <Button variant="primary" size="sm" onClick={() => onNavigate('attendance')}>
                <UserCheck className="h-3.5 w-3.5" />
                Open Attendance Register
              </Button>
            </div>
          }
        />

        {/* Top Summary Strip */}
        <div className="rounded-[10px] border border-line bg-surface p-6">
          <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
            <div className="pb-4 sm:pb-0 sm:pr-6">
              <div className="text-xs text-muted">
                {role === 'hod' ? 'Department Cohort Average' : 'Assigned Lectures'}
              </div>
              <div className="mt-1 font-editorial text-3xl font-medium tabular-nums text-ink">
                {role === 'hod' ? `${avgCohortPct}%` : `${subjects.length} Subject(s)`}
              </div>
              <div className="mt-1 text-xs text-muted">
                {role === 'hod'
                  ? `${students.length} Enrolled Student(s)`
                  : subjects.length > 0
                    ? subjects.map((s) => s.code).join(', ')
                    : 'No subjects assigned yet'}
              </div>
            </div>

            <div className="py-4 sm:py-0 sm:px-6">
              <div className="text-xs text-muted">Pending Leave Approvals</div>
              <div className="mt-1 font-editorial text-3xl font-medium tabular-nums text-ink">
                {pendingLeaves.length}
              </div>
              <div className="mt-1">
                <StatusLabel
                  tone={pendingLeaves.length > 0 ? 'brass' : 'success'}
                  label={
                    role === 'hod' ? 'Department Leave Queue' : 'Mentee Leave Requests'
                  }
                />
              </div>
            </div>

            <div className="py-4 sm:py-0 sm:px-6">
              <div className="text-xs text-muted">Students Below 75% Threshold</div>
              <div className="mt-1 font-editorial text-3xl font-medium tabular-nums text-danger">
                {lowAttendanceStudents.length}
              </div>
              <div className="mt-1 text-xs text-muted">Flagged for mentoring intervention</div>
            </div>

            <div className="pt-4 sm:pt-0 sm:pl-6">
              <div className="text-xs text-muted">Student Doubts &amp; Helpdesk</div>
              <div className="mt-1 font-editorial text-3xl font-medium tabular-nums text-ink">
                {openDoubtsCount}
              </div>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('tickets')}
                  className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                >
                  Review &amp; Reply to Students →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Classes + Low Attendance Students */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="rounded-[10px] border border-line bg-surface p-6 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h2 className="font-editorial text-xl font-medium text-ink">
                  {role === 'hod'
                    ? 'Department Attendance Overview by Subject'
                    : 'Assigned Classes — Quick Attendance & Marks'}
                </h2>
                <p className="text-xs text-muted">
                  Attendance updates immediately reflect on student portals.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate(role === 'hod' ? 'attendance-reports' : 'attendance')}
              >
                {role === 'hod' ? 'Full Reports' : 'Mark Attendance'}
              </Button>
            </div>

            {subjects.length === 0 ? (
              <div className="mt-4 rounded-[8px] border border-dashed border-line bg-paper p-6 text-center text-xs text-muted">
                No subjects assigned yet.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-line">
                {subjects.map((sub) => {
                  const pct =
                    sub.classes_held > 0
                      ? ((sub.classes_attended / sub.classes_held) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <div
                      key={sub.id}
                      className="flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="text-sm font-medium text-ink">
                          {sub.code} · {sub.name}
                        </div>
                        <div className="text-xs text-muted">
                          {sub.faculty_name} · {sub.classes_held} lectures conducted · {sub.credits}{' '}
                          Credits
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold tabular-nums text-ink">
                          Avg {sub.class_average_pct}% · {pct}%
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedSubjectCode(sub.code);
                            onNavigate('marks');
                          }}
                        >
                          Marks
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onNavigate('attendance')}
                        >
                          Attendance
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Low-Attendance Student List */}
          <div className="rounded-[10px] border border-line bg-surface p-6 lg:col-span-5">
            <h3 className="font-editorial text-lg font-medium text-ink">
              Low-Attendance Students (&lt;75% Statutory Threshold)
            </h3>
            <p className="mt-1 text-xs text-muted">
              Automatic threshold alerts dispatched to student, mentor, and linked parent.
            </p>
            {lowAttendanceStudents.length === 0 ? (
              <div className="mt-4 rounded-[8px] border border-dashed border-line bg-paper p-6 text-center text-xs text-muted">
                No students are currently below the 75% attendance threshold.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-line">
                {lowAttendanceStudents.map((stu) => (
                  <div key={stu.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-ink">{stu.full_name}</div>
                      <div className="font-mono text-xs text-muted">
                        {stu.enrolment_no} · {stu.batch_label}
                      </div>
                    </div>
                    <StatusLabel tone="danger" label={`${stu.attendance_pct}%`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. FAST ATTENDANCE GRID & HOD REPORTS
  if (activeNav === 'attendance' || activeNav === 'attendance-reports') {
    const exportAttendanceCSV = () => {
      if (students.length === 0) {
        onToast('No enrolled students to export yet.');
        return;
      }
      const headers = 'Enrolment_No,Student_Name,Subject_Code,Date,Status\n';
      const rows = students
        .map(
          (s) =>
            `${s.enrolment_no},"${s.full_name}",${currentSession?.subject_code || 'GEN'},${
              currentSession?.date || new Date().toISOString().slice(0, 10)
            },${gridRecords[s.id] || 'Present'}`
        )
        .join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance_${currentSession?.subject_code || 'Register'}.csv`;
      a.click();
      onToast('Exported attendance register to CSV.');
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-line bg-surface p-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-editorial text-2xl font-medium text-ink">
                Class Attendance Register
              </h2>
              <span className="font-mono text-xs tabular-nums text-accent">
                Session Timer: {elapsedSeconds}s
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Tap any student tile to cycle status (Present → Absent → Late → On Duty). Saving updates student attendance % in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {attendanceSessions.length > 0 && (
              <Select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                options={attendanceSessions.map((ses) => ({
                  value: ses.id,
                  label: `${ses.subject_code} · ${ses.date} (Period ${ses.period})`,
                }))}
              />
            )}
            <Button variant="secondary" size="sm" onClick={() => setNewSessionModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              New Lecture Session
            </Button>
            <Button variant="secondary" size="sm" onClick={exportAttendanceCSV}>
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              Export CSV
            </Button>
          </div>
        </div>

        {students.length === 0 ? (
          <EmptyState
            title="No Enrolled Students in Register Yet"
            description="Once students create accounts and are approved by the College Organizer, they will appear here for fast attendance marking."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-5 font-mono text-xs tabular-nums">
                <span className="text-success font-semibold">Present: {counts.Present}</span>
                <span className="text-danger font-semibold">Absent: {counts.Absent}</span>
                <span className="text-warning font-semibold">Late: {counts.Late}</span>
                <span className="text-accent font-semibold">On Duty: {counts['On Duty']}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleMarkAllPresent}>
                  Mark All Present
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const sessionToSave: AttendanceSession = currentSession
                      ? { ...currentSession, records: gridRecords }
                      : {
                          id: `ses-${Date.now()}`,
                          subject_code: subjects[0]?.code || 'CS601',
                          subject_name: subjects[0]?.name || 'General Lecture',
                          batch_id: 'batch-1',
                          batch_label: 'Active Batch',
                          date: new Date().toISOString().slice(0, 10),
                          period: 1,
                          marked_by_faculty_id: profile?.id || 'fac-active',
                          created_at: new Date().toISOString(),
                          locked_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                          records: gridRecords,
                        };
                    onSaveAttendanceSession(sessionToSave);
                    onToast(
                      `Saved attendance for ${students.length} student(s) and updated student attendance dashboards.`
                    );
                  }}
                >
                  <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Confirm &amp; Save Register
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {students.map((stu) => {
                const st = gridRecords[stu.id] || 'Present';
                const cardTone =
                  st === 'Present'
                    ? 'border-success/40 bg-surface hover:border-success'
                    : st === 'Absent'
                      ? 'border-danger bg-danger/10 text-danger'
                      : st === 'Late'
                        ? 'border-warning bg-warning/10 text-warning'
                        : st === 'Approved Leave'
                          ? 'border-brass bg-brass/10 text-brass'
                          : 'border-accent bg-accent/10 text-accent';

                return (
                  <button
                    key={stu.id}
                    type="button"
                    onClick={() => toggleStudentAttendance(stu.id, false)}
                    className={`flex flex-col justify-between rounded-[10px] border p-3 text-left transition-all cursor-pointer ${cardTone}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-xs font-semibold tabular-nums">
                        {stu.enrolment_no}
                      </span>
                      <span className="font-mono text-[10px] font-medium">{st}</span>
                    </div>
                    <div className="mt-1.5 truncate text-xs font-medium text-ink">
                      {stu.full_name}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-muted">
                      Overall: {stu.attendance_pct}%
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Pending Post-24h Attendance Correction Queue */}
        <div className="rounded-[10px] border border-line bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-editorial text-lg font-medium text-ink">
              Post-24-Hour Attendance Correction Requests
            </h3>
            {students.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setCorrectionModalOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Log Correction Request
              </Button>
            )}
          </div>
          {corrections.length === 0 ? (
            <div className="mt-4 rounded-[8px] border border-dashed border-line bg-paper p-5 text-center text-xs text-muted">
              No post-24h attendance correction requests submitted.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-line">
              {corrections.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col justify-between gap-4 py-3.5 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="text-sm font-medium text-ink">
                      {c.student_name} ({c.enrolment_no}) · {c.subject_code} on {c.date}
                    </div>
                    <div className="text-xs text-muted">
                      Change: <strong>{c.previous_status}</strong> →{' '}
                      <strong className="text-accent">{c.proposed_status}</strong> · Requested by{' '}
                      {c.requested_by_name}
                    </div>
                    <div className="mt-1 text-xs text-ink">Reason: &ldquo;{c.reason}&rdquo;</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.status === 'pending' && role === 'hod' ? (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            onReviewCorrection(c.id, 'approved');
                            onToast('Attendance correction approved and logged.');
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            onReviewCorrection(c.id, 'rejected');
                            onToast('Attendance correction rejected.');
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <StatusLabel
                        tone={
                          c.status === 'approved'
                            ? 'success'
                            : c.status === 'rejected'
                              ? 'danger'
                              : 'warning'
                        }
                        label={c.status.toUpperCase()}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create New Lecture Attendance Session */}
        <ModalDialog
          open={newSessionModalOpen}
          onClose={() => setNewSessionModalOpen(false)}
          title="Start New Class Attendance Session"
          description="Create a new period register and mark attendance for all enrolled students."
        >
          <div className="space-y-4">
            <Select
              label="Subject"
              value={newSessionSubjectCode}
              onChange={(e) => setNewSessionSubjectCode(e.target.value)}
              options={
                subjects.length > 0
                  ? subjects.map((s) => ({
                      value: s.code,
                      label: `${s.code} · ${s.name}`,
                    }))
                  : [{ value: 'CS601', label: 'CS601 · Core Subject' }]
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Lecture Date"
                type="date"
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
              />
              <Input
                label="Period Number"
                type="number"
                min={1}
                max={8}
                value={newSessionPeriod}
                onChange={(e) => setNewSessionPeriod(e.target.value)}
              />
            </div>
            <Input
              label="Batch / Section"
              value={newSessionBatchLabel}
              onChange={(e) => setNewSessionBatchLabel(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setNewSessionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const subj = subjects.find((s) => s.code === newSessionSubjectCode);
                  const defaultRecords = Object.fromEntries(
                    students.map((s) => [s.id, 'Present'])
                  ) as Record<string, AttendanceStatus>;
                  const newSes: AttendanceSession = {
                    id: `ses-${Date.now()}`,
                    subject_code: newSessionSubjectCode,
                    subject_name: subj?.name || 'Academic Lecture',
                    batch_id: 'batch-cse-6a',
                    batch_label: newSessionBatchLabel || 'CSE Sem-6 — Sec A',
                    date: newSessionDate || new Date().toISOString().slice(0, 10),
                    period: Number(newSessionPeriod) || 1,
                    marked_by_faculty_id: profile?.id || 'fac-active',
                    created_at: new Date().toISOString(),
                    locked_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    records: defaultRecords,
                  };
                  if (onCreateAttendanceSession) {
                    onCreateAttendanceSession(newSes);
                  } else {
                    onSaveAttendanceSession(newSes);
                  }
                  setSelectedSessionId(newSes.id);
                  setGridRecords(defaultRecords);
                  setNewSessionModalOpen(false);
                  onToast(
                    `Created new attendance register for ${newSes.subject_code} (${newSes.date}, Period ${newSes.period}).`
                  );
                }}
              >
                Create &amp; Open Register
              </Button>
            </div>
          </div>
        </ModalDialog>

        {/* Modal: Log Attendance Correction Request */}
        <ModalDialog
          open={correctionModalOpen}
          onClose={() => setCorrectionModalOpen(false)}
          title="Submit Attendance Correction Request"
          description="Request HOD approval to amend a locked attendance record."
        >
          <div className="space-y-4">
            <Select
              label="Student"
              value={corrStudentId}
              onChange={(e) => setCorrStudentId(e.target.value)}
              options={students.map((s) => ({
                value: s.id,
                label: `${s.enrolment_no} · ${s.full_name}`,
              }))}
            />
            <Select
              label="Proposed Status"
              value={corrProposedStatus}
              onChange={(e) => setCorrProposedStatus(e.target.value as AttendanceStatus)}
              options={CYCLE_ORDER.map((st) => ({ value: st, label: st }))}
            />
            <Input
              label="Supporting Reason"
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
              placeholder="e.g., Represented college in hackathon / medical certificate verified"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCorrectionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const stu = students.find((s) => s.id === corrStudentId) || students[0];
                  if (!stu) return;
                  onRequestCorrection({
                    session_id: currentSession?.id || 'ses-1',
                    subject_code: currentSession?.subject_code || subjects[0]?.code || 'CS601',
                    date: currentSession?.date || new Date().toISOString().slice(0, 10),
                    student_id: stu.id,
                    student_name: stu.full_name,
                    enrolment_no: stu.enrolment_no,
                    previous_status: gridRecords[stu.id] || 'Absent',
                    proposed_status: corrProposedStatus,
                    reason: corrReason || 'Verified official duty representation.',
                    requested_by_name: activeTeacherName,
                  });
                  setCorrectionModalOpen(false);
                  setCorrReason('');
                  onToast('Attendance correction request submitted to HOD queue.');
                }}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </ModalDialog>
      </div>
    );
  }

  // 3. INTERNAL MARKS ENTRY & HOD RESULTS SUMMARY
  if (activeNav === 'marks' || activeNav === 'results') {
    const maxAllowed = selectedComponent.includes('25')
      ? 25
      : selectedComponent.includes('40')
        ? 40
        : 10;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-line bg-surface p-6">
          <div>
            <h2 className="font-editorial text-2xl font-medium text-ink">
              Internal Assessment Marks Entry &amp; Validation
            </h2>
            <p className="text-xs text-muted">
              Validates every entry against component maximums ({maxAllowed} marks) and updates student grade cards.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedSubjectCode}
              onChange={(e) => setSelectedSubjectCode(e.target.value)}
              options={subjects.map((s) => ({
                value: s.code,
                label: `${s.code} · ${s.name}`,
              }))}
            />
            <Select
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              options={[
                { value: 'Internal 1 (Max 25)', label: 'Internal 1 (Max 25)' },
                { value: 'Internal 2 (Max 25)', label: 'Internal 2 (Max 25)' },
                { value: 'Assignment (Max 10)', label: 'Assignment (Max 10)' },
                { value: 'End-Sem / Lab (Max 40)', label: 'End-Sem / Lab (Max 40)' },
              ]}
            />
          </div>
        </div>

        {marksError && (
          <div
            role="alert"
            className="rounded-[8px] border border-danger bg-danger/5 p-3 text-xs text-danger"
          >
            {marksError}
          </div>
        )}

        {students.length === 0 ? (
          <EmptyState
            title="No Enrolled Students for Marks Entry Yet"
            description="Student rows will appear here once students register or are imported."
          />
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Enrolment No</th>
                  <th className="px-4 py-3 font-medium">Student Name</th>
                  <th className="px-4 py-3 font-medium">Attendance %</th>
                  <th className="px-4 py-3 font-medium">Current CGPA</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Marks Obtained (Max {maxAllowed})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {students.map((stu) => (
                  <tr key={stu.id} className="hover:bg-paper/60">
                    <td className="px-4 py-3 font-mono text-xs text-accent">{stu.enrolment_no}</td>
                    <td className="px-4 py-3 font-medium text-ink">{stu.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted">
                      {stu.attendance_pct}%
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-ink">
                      {stu.cgpa.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={maxAllowed}
                        value={marksDraft[stu.id] ?? 20}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > maxAllowed || val < 0) {
                            setMarksError(
                              `Validation Error: Marks for ${stu.enrolment_no} must be between 0 and ${maxAllowed}.`
                            );
                          } else {
                            setMarksError(null);
                          }
                          setMarksDraft((prev) => ({ ...prev, [stu.id]: val }));
                        }}
                        className="w-24 rounded-[8px] border border-line bg-paper px-3 py-1.5 text-right font-mono text-xs tabular-nums text-ink"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            disabled={students.length === 0}
            onClick={() => onToast('Internal marks draft saved.')}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            disabled={Boolean(marksError) || students.length === 0}
            onClick={() => {
              if (onUpdateSubjectMarks) {
                students.forEach((stu) => {
                  const score = marksDraft[stu.id] ?? 20;
                  onUpdateSubjectMarks(selectedSubjectCode, stu.id, selectedComponent, score);
                });
              }
              onToast(
                `${selectedSubjectCode || 'Subject'} ${selectedComponent} marks published and synchronized with student grade cards.`
              );
            }}
          >
            Publish Marks to Grade Cards
          </Button>
        </div>
      </div>
    );
  }

  // 4. MENTEES & MENTOR ALLOCATION (Section 5.8)
  if (activeNav === 'mentor' || activeNav === 'mentees' || activeNav === 'mentors') {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-editorial text-2xl font-medium text-ink">
              {role === 'hod'
                ? 'Department Mentor Allocation & Rebalancing'
                : 'Assigned Mentees Overview & Private Counseling Log'}
            </h2>
            <p className="text-xs text-muted">
              Private notes are visible exclusively to the mentor; shared summaries are visible to the student.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={students.length === 0}
            onClick={() => setMeetingModalOpen(true)}
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Log Mentoring Session
          </Button>
        </div>

        {/* Incoming Student Mentoring Requests */}
        {(() => {
          const incomingRequests = (mentorRequests || []).filter(
            (r) =>
              r.status === 'pending' &&
              (role === 'hod' || r.mentor_id === profile?.id || r.mentor_name === activeTeacherName)
          );
          if (incomingRequests.length === 0) return null;
          return (
            <div className="rounded-[10px] border border-warning/40 bg-warning/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-ink text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  Incoming Student Mentorship Requests ({incomingRequests.length})
                </div>
                <Badge tone="warning" dot>Pending Decision</Badge>
              </div>
              <div className="divide-y divide-line/40">
                {incomingRequests.map((req) => (
                  <div key={req.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-ink text-xs">
                        {req.student_name} ({req.enrolment_no})
                      </div>
                      {req.notes && (
                        <div className="text-[11px] text-muted">Goals: &ldquo;{req.notes}&rdquo;</div>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onReassignMentor(req.student_id, profile?.id || 'fac-1', activeTeacherName);
                        onToast(`Accepted ${req.student_name} into your mentoring cohort.`);
                      }}
                    >
                      Accept Mentee
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Mentees Table */}
        {students.length === 0 ? (
          <EmptyState
            title="No Mentees Assigned Yet"
            description="Enrolled students will appear here once registered or assigned to your mentoring roster."
          />
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium text-right">Attendance</th>
                  <th className="px-4 py-3 font-medium text-right">CGPA</th>
                  <th className="px-4 py-3 font-medium">Risk Flag</th>
                  <th className="px-4 py-3 font-medium">Assigned Mentor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {students.map((stu) => {
                  const isAtRisk =
                    stu.attendance_pct > 0 && (stu.attendance_pct < 75 || stu.cgpa < 7.5);
                  return (
                    <tr key={stu.id} className="hover:bg-paper/60">
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-ink">{stu.full_name}</div>
                        <div className="font-mono text-xs text-muted">{stu.enrolment_no}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums">
                        {stu.attendance_pct}%
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums">
                        {stu.cgpa.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5">
                        {isAtRisk ? (
                          <StatusLabel tone="danger" label="Flagged: Attendance Shortage" />
                        ) : (
                          <StatusLabel tone="success" label="Good Standing" />
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {role === 'hod' && facultyList.length > 0 ? (
                          <Select
                            value={stu.mentor_id}
                            onChange={(e) => {
                              onReassignMentor(stu.id, e.target.value);
                              onToast(`Reassigned mentor for ${stu.full_name}.`);
                            }}
                            options={facultyList.map((f) => ({
                              value: f.id,
                              label: f.full_name,
                            }))}
                          />
                        ) : (
                          <span className="text-xs text-ink">
                            {facultyList.find((f) => f.id === stu.mentor_id)?.full_name ||
                              activeTeacherName}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mentor Meeting Log */}
        <div className="rounded-[10px] border border-line bg-surface p-6">
          <h3 className="font-editorial text-lg font-medium text-ink">
            Faculty Mentor Counseling Log (Includes Confidential Private Notes)
          </h3>
          {mentorMeetings.length === 0 ? (
            <div className="mt-4 rounded-[8px] border border-dashed border-line bg-paper p-5 text-center text-xs text-muted">
              No mentoring sessions logged yet.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-line">
              {mentorMeetings.map((m) => (
                <div key={m.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">{m.student_name}</span>
                    <span className="font-mono text-muted">{m.date}</span>
                  </div>
                  <div className="rounded-[8px] border border-warning/40 bg-warning/5 p-3 text-xs text-ink">
                    <strong className="text-warning">
                      Private Faculty Notes (Hidden from Student):
                    </strong>{' '}
                    {m.private_notes}
                  </div>
                  <div className="text-xs text-ink">
                    <strong>Shared Student Summary:</strong> {m.shared_summary}
                  </div>
                  <div className="text-xs text-muted">
                    <strong>Action Items:</strong> {m.action_items}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ModalDialog
          open={meetingModalOpen}
          onClose={() => setMeetingModalOpen(false)}
          title="Record Mentoring Session"
          description="Private notes are protected by Row-Level Security and never exposed to students or parents."
        >
          <div className="space-y-4">
            <Select
              label="Mentee"
              value={meetingStudentId}
              onChange={(e) => setMeetingStudentId(e.target.value)}
              options={students.map((s) => ({
                value: s.id,
                label: `${s.enrolment_no} · ${s.full_name}`,
              }))}
            />
            <Input
              label="Private Mentor Notes (Faculty Only)"
              placeholder="Confidential observations..."
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
            />
            <Input
              label="Shared Summary (Visible to Student)"
              placeholder="Summary of academic discussion..."
              value={sharedSummary}
              onChange={(e) => setSharedSummary(e.target.value)}
            />
            <Input
              label="Action Items"
              placeholder="Next steps before follow-up..."
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMeetingModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const stu = students.find((s) => s.id === meetingStudentId) || students[0];
                  if (!stu) return;
                  onAddMentorMeeting({
                    mentor_id: profile?.id || 'fac-active',
                    student_id: stu.id,
                    student_name: stu.full_name,
                    date: new Date().toISOString().slice(0, 10),
                    private_notes:
                      privateNotes || 'Confidential follow-up on academic progress.',
                    shared_summary:
                      sharedSummary || 'Reviewed academic progress and attendance.',
                    action_items: actionItems || 'Follow up in next advising session.',
                  });
                  setMeetingModalOpen(false);
                  setPrivateNotes('');
                  setSharedSummary('');
                  setActionItems('');
                  onToast('Mentoring session saved.');
                }}
              >
                Save Session Log
              </Button>
            </div>
          </div>
        </ModalDialog>
      </div>
    );
  }

  // 5. LEAVE APPROVALS (Mentor step vs HOD escalated step)
  if (activeNav === 'leave' || activeNav === 'leaves') {
    const stepRole = role === 'hod' ? 'hod' : 'mentor';
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-editorial text-2xl font-medium text-ink">
            {role === 'hod'
              ? 'Escalated Department Leave Approvals (>3 Days or Exam Dates)'
              : 'Mentee Leave Approval Queue'}
          </h2>
          <p className="text-xs text-muted">
            Approved leaves automatically mark matching dates as Approved Leave on the attendance calendar and generate an official Leave Permit PDF.
          </p>
        </div>

        {(!Array.isArray(leaveRequests) || leaveRequests.length === 0) ? (
          <EmptyState
            title="No Leave Requests Pending"
            description="Student leave applications routed to your role will appear here for approval."
          />
        ) : (
          <div className="space-y-4">
            {(Array.isArray(leaveRequests) ? leaveRequests : []).map((lv) => (
              <div
                key={lv.id}
                className="rounded-[10px] border border-line bg-surface p-6 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-ink">
                      {lv.applicant_name} ({lv.enrolment_no})
                    </span>
                    <span className="mx-2 text-muted">·</span>
                    <span className="text-xs font-medium text-accent">{lv.type}</span>
                    <span className="mx-2 text-muted">·</span>
                    <span className="font-mono text-xs tabular-nums text-muted">
                      {lv.from_date} to {lv.to_date} ({lv.days_count} days)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusLabel
                      tone={
                        lv.status === 'Approved'
                          ? 'success'
                          : lv.status === 'Rejected'
                            ? 'danger'
                            : 'brass'
                      }
                      label={lv.status}
                    />
                    {lv.status === 'Approved' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          generateLeavePermitPDF(
                            lv,
                            profile?.college_name || 'Institution Workspace',
                            profile?.college_code || ''
                          );
                          onToast(`Downloaded Leave Permit PDF for ${lv.applicant_name}.`);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Permit PDF
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-ink">{lv.reason}</p>

                {(lv.status === 'Pending Mentor' || lv.status === 'Pending HOD') && (
                  <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
                    <Input
                      placeholder="Approver comment (required for audit trail)..."
                      value={leaveComments[lv.id] || ''}
                      onChange={(e) =>
                        setLeaveComments((prev) => ({ ...prev, [lv.id]: e.target.value }))
                      }
                      className="w-72"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onDecideLeave(
                          lv.id,
                          stepRole,
                          'approved',
                          leaveComments[lv.id] || `Approved by ${activeTeacherName}.`
                        );
                        onToast(`Leave request for ${lv.applicant_name} approved.`);
                      }}
                    >
                      Approve Leave
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        onDecideLeave(
                          lv.id,
                          stepRole,
                          'rejected',
                          leaveComments[lv.id] || 'Insufficient attendance margin.'
                        );
                        onToast(`Leave request for ${lv.applicant_name} rejected.`);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 6. NOTICES COMPOSER FOR CLASS / DEPARTMENT
  if (activeNav === 'notices') {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="rounded-[10px] border border-line bg-surface p-6 space-y-4 lg:col-span-5">
          <h2 className="font-editorial text-xl font-medium text-ink">
            Post {role === 'hod' ? 'Department' : 'Class'} Circular
          </h2>
          <Input
            label="Notice Title"
            value={noticeTitle}
            onChange={(e) => setNoticeTitle(e.target.value)}
            placeholder="e.g., Lab Evaluation Schedule"
          />
          <Select
            label="Category"
            value={noticeCategory}
            onChange={(e) => setNoticeCategory(e.target.value as NoticeItem['category'])}
            options={[
              { value: 'Academic', label: 'Academic' },
              { value: 'Exam', label: 'Examination' },
              { value: 'Event', label: 'Departmental Event' },
              { value: 'Urgent', label: 'Urgent (Dispatches Email)' },
            ]}
          />
          <Input
            label="Circular Body"
            value={noticeBody}
            onChange={(e) => setNoticeBody(e.target.value)}
            placeholder="Details, dates, and instructions..."
          />
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              if (!noticeTitle.trim()) return;
              onCreateNotice(
                noticeTitle,
                noticeBody || 'Please check the departmental schedule for full instructions.',
                noticeCategory,
                role === 'hod' ? 'department' : 'batch',
                role === 'hod' ? activeTeacherDept : 'Active Batch'
              );
              setNoticeTitle('');
              setNoticeBody('');
              onToast('Circular published to target audience.');
            }}
          >
            Publish Circular
          </Button>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <h2 className="font-editorial text-xl font-medium text-ink">Published Notices</h2>
          {notices.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-line bg-surface p-6 text-center text-xs text-muted">
              No circulars published yet.
            </div>
          ) : (
            notices.map((n) => (
              <div key={n.id} className="rounded-[10px] border border-line bg-surface p-5">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {n.category} · Target: {n.audience_target}
                  </span>
                  <span className="font-mono tabular-nums">
                    Read: {n.read_count}/{n.total_target_count}
                  </span>
                </div>
                <h3 className="mt-1 font-editorial text-lg font-medium text-ink">{n.title}</h3>
                <p className="mt-1 text-xs text-muted">{n.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 6B. COURSEWORK & LAB ASSIGNMENTS
  if (activeNav === 'assignments') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="COURSEWORK & LABS"
          title="Coursework & Laboratory Assignment Management"
          subtitle="Publish coursework problems, lab experiments, and review student PDF submissions."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <GlassCard equalHeight className="lg:col-span-5 space-y-4">
            <h2 className="text-base font-bold text-[var(--text)]">
              Publish New Course / Lab Assignment
            </h2>
            <Input
              label="Assignment Title *"
              value={asgTitle}
              onChange={(e) => setAsgTitle(e.target.value)}
              placeholder="e.g., Lab 4: B-Tree Indexing & Query Optimization"
            />
            <Select
              label="Subject"
              value={asgSubjectCode}
              onChange={(e) => setAsgSubjectCode(e.target.value)}
              options={
                subjects.length > 0
                  ? subjects.map((s) => ({
                      value: s.code,
                      label: `${s.code} · ${s.name}`,
                    }))
                  : [{ value: 'CS601', label: 'CS601 · Core Subject' }]
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Due Date"
                type="date"
                value={asgDueDate}
                onChange={(e) => setAsgDueDate(e.target.value)}
              />
              <Input
                label="Maximum Marks"
                type="number"
                value={asgMaxMarks}
                onChange={(e) => setAsgMaxMarks(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              className="w-full mt-auto"
              onClick={() => {
                if (!asgTitle.trim()) return;
                const subj = subjects.find((s) => s.code === asgSubjectCode);
                if (onCreateAssignment) {
                  onCreateAssignment({
                    subject_code: asgSubjectCode,
                    subject_name: subj?.name || 'Academic Coursework',
                    title: asgTitle.trim(),
                    due_date: asgDueDate || '2026-11-15',
                    max_marks: Number(asgMaxMarks) || 20,
                  });
                }
                setAsgTitle('');
                onToast('Coursework assignment published to student portal.');
              }}
            >
              <Plus className="h-4 w-4" strokeWidth={1.85} />
              Publish Assignment
            </Button>
          </GlassCard>

          <GlassCard equalHeight className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--text)]">
                Published Coursework &amp; Student Submissions ({assignments.length})
              </h2>
              <Badge tone="accent">{students.length} Enrolled Students</Badge>
            </div>
            {assignments.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-muted)] my-auto">
                No coursework or lab assignments published yet. Use the form on the left to publish an assignment.
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[var(--accent-text)]">
                          {asg.subject_code}
                        </span>
                        <span className="text-[var(--text-muted)]">·</span>
                        <span className="font-mono text-[var(--text-muted)]">
                          Due: {asg.due_date} · Max {asg.max_marks} Marks
                        </span>
                      </div>
                      <div className="mt-1 font-semibold text-[var(--text)]">{asg.title}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {asg.submitted ? (
                        <Badge tone="success" dot>
                          Submitted ({asg.file_name})
                        </Badge>
                      ) : (
                        <Badge tone="warning" dot>
                          Awaiting Student Uploads
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    );
  }

  // 6C. STUDENT ACADEMIC DOUBTS & HELPDESK TICKETS
  if (activeNav === 'tickets') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="ACADEMIC DOUBTS & HELPDESK"
          title="Student Academic Doubts & Support Queue"
          subtitle="Respond to student academic questions, lab doubts, and departmental inquiries in real time."
        />

        {tickets.length === 0 ? (
          <EmptyState
            title="No Student Doubts or Helpdesk Tickets"
            description="Questions and helpdesk tickets submitted by students will appear here for faculty resolution."
          />
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-[12px] border border-line bg-surface p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={t.category === 'Academic Doubt' ? 'accent' : 'neutral'}>
                      {t.category}
                    </Badge>
                    <span className="font-semibold text-ink">{t.subject}</span>
                  </div>
                  <StatusLabel
                    tone={t.status === 'resolved' ? 'success' : 'warning'}
                    label={t.status.toUpperCase()}
                  />
                </div>
                <div className="text-xs text-muted">
                  Raised by: <strong className="text-ink">{t.raised_by_name}</strong> ·{' '}
                  {new Date(t.created_at).toLocaleString()}
                </div>
                <p className="text-sm text-ink">{t.body}</p>

                {t.resolution_note && (
                  <div className="rounded-[8px] border border-success/30 bg-success/5 p-3 text-xs text-ink">
                    <strong className="text-success">Resolution / Answer:</strong>{' '}
                    {t.resolution_note}
                  </div>
                )}

                {t.status !== 'resolved' && onResolveTicket && (
                  <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
                    <Input
                      placeholder="Write your academic explanation or resolution note..."
                      value={ticketReplies[t.id] || ''}
                      onChange={(e) =>
                        setTicketReplies((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      className="flex-1 min-w-[240px]"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const reply =
                          ticketReplies[t.id]?.trim() ||
                          `Answered and resolved by ${activeTeacherName}.`;
                        onResolveTicket(t.id, reply);
                        onToast(`Sent response to ${t.raised_by_name} and marked resolved.`);
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Send Answer &amp; Resolve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 7. TIMETABLE & LECTURE SCHEDULER
  const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="TEACHING SCHEDULE"
        title="Faculty Teaching Schedule & Period Planner"
        subtitle="View assigned lecture periods and add extra classes, lab slots, or substitutions visible to students."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {onAddTimetableSlot && (
          <GlassCard className="lg:col-span-4 space-y-4">
            <h3 className="text-base font-bold text-ink">Schedule Lecture / Substitution</h3>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Day"
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
              onChange={(e) => setTtSubjectCode(e.target.value)}
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
              label="Room / Lab"
              value={ttRoom}
              onChange={(e) => setTtRoom(e.target.value)}
              placeholder="LH-204"
            />
            <Input
              label="Notes / Substitution (Optional)"
              value={ttNote}
              onChange={(e) => setTtNote(e.target.value)}
              placeholder="e.g., Extra Lab Revision Session"
            />
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                const subj = subjects.find((s) => s.code === ttSubjectCode);
                onAddTimetableSlot({
                  batch_id: 'batch-cse-6a',
                  weekday: Number(ttWeekday) || 1,
                  period: Number(ttPeriod) || 1,
                  start_time: ttStartTime || '09:00',
                  end_time: ttEndTime || '09:50',
                  subject_code: ttSubjectCode,
                  subject_name: subj?.name || 'Academic Session',
                  faculty_id: profile?.id || 'fac-1',
                  faculty_name: activeTeacherName,
                  room: ttRoom || 'LH-201',
                  substitution_note: ttNote.trim() || undefined,
                });
                setTtNote('');
                onToast('Timetable slot added and synchronized with student schedule.');
              }}
            >
              <Plus className="h-4 w-4" />
              Add Timetable Slot
            </Button>
          </GlassCard>
        )}

        <div className={onAddTimetableSlot ? 'lg:col-span-8' : 'lg:col-span-12'}>
          {(() => {
            const filteredFacultySlots = timetable
              .filter((slot) => Number(slot.weekday) === selectedTimetableDay)
              .sort((a, b) => {
                if (a.period !== b.period) return a.period - b.period;
                return (a.start_time || '').localeCompare(b.start_time || '');
              });

            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line bg-surface p-3.5">
                  <div>
                    <div className="text-sm font-semibold text-ink">Published Master Timetable</div>
                    <div className="text-xs text-muted">Filter schedule by day of the academic week</div>
                  </div>
                  <div className="w-48">
                    <Select
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

                {filteredFacultySlots.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-line bg-surface p-8 text-center text-sm font-medium text-muted">
                    No classes scheduled for this day.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-paper text-xs text-muted">
                        <tr>
                          <th className="px-4 py-3 font-medium">Day &amp; Time</th>
                          <th className="px-4 py-3 font-medium">Subject</th>
                          <th className="px-4 py-3 font-medium">Faculty</th>
                          <th className="px-4 py-3 font-medium">Room</th>
                          <th className="px-4 py-3 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredFacultySlots.map((t) => (
                          <tr key={t.id} className="hover:bg-paper/60">
                            <td className="px-4 py-3 font-mono text-xs text-accent">
                              {weekdayNames[(t.weekday - 1) % weekdayNames.length]} · P{t.period} (
                              {t.start_time} – {t.end_time})
                            </td>
                            <td className="px-4 py-3 font-medium text-ink">
                              {t.subject_code} · {t.subject_name}
                            </td>
                            <td className="px-4 py-3 text-xs text-ink">{t.faculty_name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-ink">{t.room}</td>
                            <td className="px-4 py-3 text-xs text-muted">
                              {t.substitution_note || 'Regular Session'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
});
