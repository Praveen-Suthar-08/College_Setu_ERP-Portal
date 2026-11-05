export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'accounts'
  | 'hod'
  | 'faculty'
  | 'student'
  | 'parent'
  | 'librarian';

export type AccountStatus = 'pending' | 'active' | 'suspended';

export type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Late'
  | 'On Duty'
  | 'Approved Leave';

export type LeaveStatus =
  | 'Draft'
  | 'Pending Mentor'
  | 'Pending HOD'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled';

export type NoticeCategory =
  | 'Academic'
  | 'Exam'
  | 'Fees'
  | 'Event'
  | 'Holiday'
  | 'Urgent';

export interface ProfilePreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  email_notifications?: boolean;
  dashboard_notifications?: boolean;
  security_alerts?: boolean;
  profile_visibility?: 'public' | 'institution' | 'private';
  show_email?: boolean;
  show_phone?: boolean;
  show_address?: boolean;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string;
  photo_url?: string;
  avatar_id?: string;
  custom_avatar_url?: string;
  status: AccountStatus;
  department_id?: string;
  totp_enabled: boolean;
  emergency_contact?: string;
  college_code?: string;
  college_name?: string;
  identifier_no?: string;
  password?: string;
  created_at: string;

  // Extended Personal Information
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  display_name?: string;
  username?: string;
  date_of_birth?: string;
  gender?: string;
  alternate_phone?: string;
  alternate_email?: string;

  // Extended Academic & Role Information
  department?: string;
  course_program?: string;
  semester_year?: string;
  batch_academic_year?: string;
  section_group?: string;
  faculty_advisor?: string;
  employee_id?: string;
  designation?: string;
  assigned_courses?: string;
  qualification?: string;
  specialization?: string;
  experience_years?: string;
  joining_date?: string;
  institution_type?: string;
  campus_location?: string;
  administrative_responsibilities?: string;

  // Extended Contact & Address Information
  country?: string;
  state_province?: string;
  city?: string;
  postal_code?: string;
  address_line_1?: string;
  address_line_2?: string;

  // Extended Professional Information
  bio?: string;
  skills?: string[];
  areas_of_expertise?: string[];
  office_location?: string;
  website_url?: string;

  // Extended Account & Security Metadata
  email_verified?: boolean;
  phone_verified?: boolean;
  last_login?: string;
  updated_at?: string;
  preferences?: ProfilePreferences;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hod_id: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  department_id: string;
  duration_years: number;
}

export interface Batch {
  id: string;
  course_id: string;
  start_year: number;
  section: string;
  label: string;
}

export interface FacultyRecord {
  id: string;
  profile_id: string;
  full_name: string;
  name?: string;
  email: string;
  phone: string;
  department_id: string;
  department_code: string;
  department?: string;
  employee_id: string;
  designation: string;
  office_hours: string;
  cabin: string;
}

export interface StudentRecord {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  phone: string;
  enrolment_no: string;
  batch_id: string;
  batch_label: string;
  department_id: string;
  department_code: string;
  current_semester: number;
  guardian_name: string;
  mentor_id: string;
  mentor_name?: string;
  attendance_pct: number;
  cgpa: number;
  sgpa: number;
  fee_status: 'paid' | 'partial' | 'overdue' | 'pending';
  college_code?: string;
  college_name?: string;
  verification_status?: 'pending' | 'verified' | 'rejected' | string;
  department?: string;
  year?: number | string;
}

export type Student = StudentRecord;

export interface ParentLink {
  id: string;
  parent_profile_id: string;
  student_id: string;
  status: 'pending' | 'approved' | 'revoked';
  link_code: string;
  approved_by?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  course_id: string;
  college_code?: string;
  department?: string;
  section?: string;
  description?: string;
  type?: 'theory' | 'practical' | 'elective' | 'core';
  status?: 'active' | 'inactive';
  faculty_id: string;
  faculty_name: string;
  faculty_email: string;
  faculty_cabin: string;
  syllabus_url: string;
  classes_held: number;
  classes_attended: number;
  internal_1_marks: number;
  internal_1_max: number;
  internal_2_marks: number;
  internal_2_max: number;
  assignment_marks: number;
  assignment_max: number;
  lab_marks: number;
  lab_max: number;
  class_average_pct: number;
  grade: string;
  grade_points: number;
}

export interface TimetableSlot {
  id: string;
  college_code?: string;
  batch_id: string;
  subject_code: string;
  subject_name: string;
  faculty_id: string;
  faculty_name: string;
  weekday: number; // 1 = Monday .. 6 = Saturday
  period: number;
  start_time: string;
  end_time: string;
  room: string;
  substitution_note?: string;
}

export interface AttendanceSession {
  id: string;
  college_code?: string;
  subject_code: string;
  subject_name: string;
  batch_id: string;
  batch_label: string;
  date: string;
  period: number;
  marked_by_faculty_id: string;
  created_at: string;
  locked_at: string;
  records: Record<string, AttendanceStatus>; // student_id -> status
}

export interface Examination {
  id: string;
  college_code?: string;
  name: string;
  title?: string;
  subject_code: string;
  subject_name?: string;
  subject?: string;
  course_name?: string;
  exam_date: string;
  max_marks: number;
  passing_marks: number;
  pass_marks?: number;
  department_code?: string;
  department?: string;
  semester: number;
  created_by_id?: string;
  created_by_name?: string;
  created_by_role?: string;
  is_published: boolean;
  status?: 'draft' | 'published';
  published_at?: string;
  created_at?: string;
}

export interface StudentGradeCard {
  id: string;
  exam_id: string;
  examination_id?: string;
  exam_name?: string;
  student_id: string;
  profile_id?: string;
  enrolment_no: string;
  student_name: string;
  college_code?: string;
  subject_code?: string;
  subject_name?: string;
  subject?: string;
  marks_obtained: number;
  max_marks: number;
  grade: string;
  grade_points?: number;
  result_status: 'Pass' | 'Fail';
  status?: string;
  remarks?: string;
  is_published?: boolean;
  published?: boolean;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceCorrectionRequest {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  enrolment_no: string;
  subject_code: string;
  date: string;
  previous_status: AttendanceStatus;
  proposed_status: AttendanceStatus;
  requested_by_name: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface FeeStructure {
  id: string;
  college_code?: string;
  course_id: string;
  year: number;
  category: 'tuition' | 'exam' | 'hostel' | 'transport' | 'library' | 'miscellaneous';
  title: string;
  amount_paise: number;
  due_date: string;
  fine_per_day_paise: number;
}

export interface FeeAssignment {
  id: string;
  college_code?: string;
  student_id: string;
  student_name: string;
  enrolment_no: string;
  structure_id: string;
  category: FeeStructure['category'];
  title: string;
  amount_paise: number;
  concession_paise: number;
  concession_reason?: string;
  due_date: string;
  fine_per_day_paise: number;
  paid_paise: number;
  status: 'pending' | 'partial' | 'partially_paid' | 'paid' | 'overdue';
}

export interface PaymentRecord {
  id: string;
  college_code?: string;
  status?: string;
  amount?: number;
  assignment_id: string;
  student_id: string;
  student_name: string;
  enrolment_no: string;
  fee_title: string;
  amount_paise: number;
  mode: 'cash' | 'bank_transfer' | 'upi' | 'gateway' | 'reversal';
  reference: string;
  receipt_no: string;
  recorded_by_name: string;
  reversed_of?: string;
  reversal_reason?: string;
  created_at: string;
}

export interface NoticeItem {
  id: string;
  title: string;
  body: string;
  category: NoticeCategory;
  audience_scope: 'college' | 'department' | 'batch' | 'role' | 'all_students' | 'all_teachers' | 'selected_students' | 'selected_teachers';
  audience_target: string;
  recipient_ids?: string[];
  recipient_labels?: string[];
  is_public: boolean;
  pinned: boolean;
  attachment_name?: string;
  publish_at: string;
  expires_at?: string;
  created_by_name: string;
  created_by_role: string;
  read_count: number;
  total_target_count: number;
  is_read?: boolean;
  college_code?: string;
  college_name?: string;
}

export interface MentorMeeting {
  id: string;
  mentor_id: string;
  student_id: string;
  student_name: string;
  date: string;
  private_notes: string; // Strictly hidden from Student & Parent via RLS
  shared_summary: string;
  action_items: string;
}

export interface LeaveApprovalStep {
  step: 'mentor' | 'hod' | 'super_admin';
  approver_name: string;
  decision: 'approved' | 'rejected';
  comment: string;
  decided_at: string;
}

export interface LeaveRequestItem {
  id: string;
  college_code?: string;
  applicant_profile_id: string;
  applicant_student_id?: string;
  applicant_name: string;
  student_name?: string;
  applicant_role: UserRole;
  enrolment_no?: string;
  type: 'Medical' | 'Personal' | 'On Duty' | 'Event';
  from_date: string;
  to_date: string;
  dates_label?: string;
  days_count: number;
  falls_on_exam_day: boolean;
  requires_hod: boolean;
  reason: string;
  rejection_reason?: string;
  reviewer_remarks?: string;
  attachment_name?: string;
  status: LeaveStatus;
  approvals: LeaveApprovalStep[];
  created_at: string;
}

export interface TicketReply {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  message: string;
  created_at: string;
}

export interface GrievanceTicket {
  id: string;
  college_code?: string;
  ticket_no?: string;
  raised_by_id: string;
  raised_by_name: string;
  raised_by_role: UserRole;
  category:
    | 'Academic Doubt'
    | 'Attendance'
    | 'Fees'
    | 'Marks'
    | 'Exam & Hall Ticket'
    | 'Profile Correction'
    | 'Hostel'
    | 'IT Support';
  subject: string;
  body: string;
  status: 'open' | 'in_progress' | 'resolved';
  assigned_to_name: string;
  resolution_note?: string;
  replies?: TicketReply[];
  created_at: string;
  updated_at?: string;
}

export interface AssignmentItem {
  id: string;
  subject_code: string;
  subject_name: string;
  title: string;
  due_date: string;
  max_marks: number;
  submitted: boolean;
  submitted_at?: string;
  file_name?: string;
  marks_awarded?: number;
}

export interface AuditLogEntry {
  id: string;
  college_code?: string;
  actor_id: string;
  actor_name: string;
  actor_email?: string;
  actor_role: UserRole;
  action: string;
  entity: string;
  entity_id: string;
  metadata: Record<string, string | number | boolean>;
  ip: string;
  created_at: string;
}

export type PlatformAuditLog = AuditLogEntry;

export interface SystemSettings {
  minimum_attendance_pct: number;
  warning_attendance_pct: number;
  block_hall_ticket_on_overdue_fees: boolean;
  results_published: boolean;
  results_publish_date: string;
  default_late_fine_paise_per_day: number;
  require_totp_for_admins: boolean;
}

export type SystemSettingsPayload = SystemSettings;

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'College Organizer / Super Admin',
  admin: 'College Admin',
  accounts: 'Accounts Officer',
  hod: 'Head of Department',
  faculty: 'Teacher / Faculty',
  student: 'Student',
  parent: 'Parent / Guardian',
  librarian: 'Librarian',
};

export interface ParallelTabSessionInfo {
  tabId: string;
  profileId: string | null;
  fullName: string;
  email: string;
  role: UserRole | 'visitor';
  collegeCode?: string;
  view: string;
}

export interface FullPortalJsonData {
  version: number;
  updatedAt: string;
  profiles: Profile[];
  students: StudentRecord[];
  validCollegeCodes: { code: string; collegeName: string; scope: string; updatedAt?: string }[];
  subjects: Subject[];
  timetable: TimetableSlot[];
  attendanceSessions: AttendanceSession[];
  corrections: AttendanceCorrectionRequest[];
  examinations?: Examination[];
  gradeCards?: StudentGradeCard[];
  feeStructures: FeeStructure[];
  feeAssignments: FeeAssignment[];
  payments: PaymentRecord[];
  notices: NoticeItem[];
  mentorMeetings: MentorMeeting[];
  mentorRequests?: MentorRequest[];
  leaveRequests: LeaveRequestItem[];
  tickets: GrievanceTicket[];
  assignments: AssignmentItem[];
  auditLogs: AuditLogEntry[];
  settings: SystemSettings;
  activeSessions?: ParallelTabSessionInfo[];
  feeNotificationLogs?: any[];
}

export interface MentorRequest {
  id: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  enrolment_no?: string;
  department_code?: string;
  mentor_id: string;
  mentor_name: string;
  mentor_email?: string;
  college_code?: string;
  status: 'pending' | 'accepted' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
  updated_at?: string;
}

// Exact Navigation Contract with Universal Profile Management
export const ROLE_NAVIGATION: Record<UserRole, { id: string; label: string }[]> = {
  student: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'My Profile' },
    { id: 'subjects', label: 'Courses and Subjects' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'results', label: 'Results' },
    { id: 'fees', label: 'Fees' },
    { id: 'notices', label: 'Notices' },
    { id: 'mentor', label: 'Mentor' },
    { id: 'leave', label: 'Leave' },
    { id: 'timetable', label: 'Timetable' },
    { id: 'assignments', label: 'Assignments & Tickets' },
    { id: 'library', label: 'Library' },
  ],
  parent: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'My Profile' },
    { id: 'child-overview', label: 'Child Overview' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'results', label: 'Results' },
    { id: 'fees', label: 'Fees' },
    { id: 'notices', label: 'Notices' },
    { id: 'leave', label: 'Leave Status' },
  ],
  faculty: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'My Profile' },
    { id: 'classes', label: 'My Classes' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'marks', label: 'Marks' },
    { id: 'mentor', label: 'Faculty Mentoring' },
    { id: 'mentees', label: 'Mentees' },
    { id: 'leave', label: 'Leave' },
    { id: 'notices', label: 'Notices' },
    { id: 'timetable', label: 'Timetable' },
  ],
  hod: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'My Profile' },
    { id: 'department', label: 'Department' },
    { id: 'attendance-reports', label: 'Attendance Reports' },
    { id: 'results', label: 'Results' },
    { id: 'leave', label: 'Leave Approvals' },
    { id: 'mentors', label: 'Mentors' },
    { id: 'notices', label: 'Notices' },
  ],
  accounts: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'My Profile' },
    { id: 'fee-structures', label: 'Fee Structures' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'payments', label: 'Payments' },
    { id: 'dues', label: 'Dues' },
    { id: 'reports', label: 'Reports' },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'My Profile' },
    { id: 'users', label: 'Users' },
    { id: 'academics', label: 'Academics' },
    { id: 'timetable', label: 'Timetable' },
    { id: 'notices', label: 'Notices' },
    { id: 'tickets', label: 'Tickets' },
  ],
  super_admin: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'My Profile' },
    { id: 'subjects', label: 'Subject Management' },
    { id: 'users', label: 'Users' },
    { id: 'mentor', label: 'Faculty Mentoring' },
    { id: 'leaves', label: 'Leave Applications' },
    { id: 'academics', label: 'Academics' },
    { id: 'timetable', label: 'Timetable' },
    { id: 'notices', label: 'Notices' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'audit-log', label: 'Audit Log' },
    { id: 'settings', label: 'Settings & Security Audit' },
  ],
  librarian: [
    { id: 'library', label: 'Library Catalogue' },
    { id: 'profile', label: 'My Profile' },
  ],
};
