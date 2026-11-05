import {
  AssignmentItem,
  AttendanceCorrectionRequest,
  AttendanceSession,
  AuditLogEntry,
  Batch,
  Course,
  Department,
  FacultyRecord,
  FeeAssignment,
  FeeStructure,
  GrievanceTicket,
  LeaveRequestItem,
  MentorMeeting,
  NoticeItem,
  ParentLink,
  PaymentRecord,
  Profile,
  StudentRecord,
  Subject,
  SystemSettings,
  TimetableSlot,
} from '../types/portal';

// All predefined/dummy records removed across all roles — starts clean for real user data
export const SEED_DEPARTMENTS: Department[] = [];
export const SEED_COURSES: Course[] = [];
export const SEED_BATCHES: Batch[] = [];
export const SEED_PROFILES: Profile[] = [];
export const DEMO_TEACHERS: FacultyRecord[] = [
  {
    id: 'tch-001',
    profile_id: 'tch-001',
    full_name: 'Dr. Amit Sharma',
    name: 'Dr. Amit Sharma',
    employee_id: 'TCH-001',
    department: 'Computer Science',
    department_code: 'CSE',
    department_id: 'dept-cse',
    designation: 'Associate Professor',
    email: 'amit.sharma@campus.edu',
    phone: '+91 98234 10001',
    cabin: 'CS-301',
    office_hours: 'Mon-Thu 10:00 AM - 12:00 PM',
  },
  {
    id: 'tch-002',
    profile_id: 'tch-002',
    full_name: 'Prof. Priya Patel',
    name: 'Prof. Priya Patel',
    employee_id: 'TCH-002',
    department: 'Information Technology',
    department_code: 'IT',
    department_id: 'dept-it',
    designation: 'Professor & HOD',
    email: 'priya.patel@campus.edu',
    phone: '+91 98234 10002',
    cabin: 'IT-201',
    office_hours: 'Tue-Fri 02:00 PM - 04:00 PM',
  },
  {
    id: 'tch-003',
    profile_id: 'tch-003',
    full_name: 'Rahul Verma',
    name: 'Rahul Verma',
    employee_id: 'TCH-003',
    department: 'Mathematics',
    department_code: 'MATH',
    department_id: 'dept-math',
    designation: 'Assistant Professor',
    email: 'rahul.verma@campus.edu',
    phone: '+91 98234 10003',
    cabin: 'MATH-105',
    office_hours: 'Mon-Wed 11:00 AM - 01:00 PM',
  },
  {
    id: 'tch-004',
    profile_id: 'tch-004',
    full_name: 'Neha Singh',
    name: 'Neha Singh',
    employee_id: 'TCH-004',
    department: 'Electronics',
    department_code: 'ECE',
    department_id: 'dept-ece',
    designation: 'Assistant Professor',
    email: 'neha.singh@campus.edu',
    phone: '+91 98234 10004',
    cabin: 'EC-402',
    office_hours: 'Wed-Fri 01:00 PM - 03:00 PM',
  },
  {
    id: 'tch-005',
    profile_id: 'tch-005',
    full_name: 'Dr. Arjun Mehta',
    name: 'Dr. Arjun Mehta',
    employee_id: 'TCH-005',
    department: 'Computer Science',
    department_code: 'CSE',
    department_id: 'dept-cse',
    designation: 'Associate Professor',
    email: 'arjun.mehta@campus.edu',
    phone: '+91 98234 10005',
    cabin: 'CS-304',
    office_hours: 'Mon-Thu 03:00 PM - 05:00 PM',
  },
  {
    id: 'tch-006',
    profile_id: 'tch-006',
    full_name: 'Sneha Gupta',
    name: 'Sneha Gupta',
    employee_id: 'TCH-006',
    department: 'Information Technology',
    department_code: 'IT',
    department_id: 'dept-it',
    designation: 'Assistant Professor',
    email: 'sneha.gupta@campus.edu',
    phone: '+91 98234 10006',
    cabin: 'IT-208',
    office_hours: 'Mon-Wed 09:00 AM - 11:00 AM',
  },
  {
    id: 'tch-007',
    profile_id: 'tch-007',
    full_name: 'Vikram Rao',
    name: 'Vikram Rao',
    employee_id: 'TCH-007',
    department: 'Physics',
    department_code: 'PHY',
    department_id: 'dept-phy',
    designation: 'Associate Professor',
    email: 'vikram.rao@campus.edu',
    phone: '+91 98234 10007',
    cabin: 'SCI-102',
    office_hours: 'Tue-Thu 11:00 AM - 01:00 PM',
  },
  {
    id: 'tch-008',
    profile_id: 'tch-008',
    full_name: 'Ananya Reddy',
    name: 'Ananya Reddy',
    employee_id: 'TCH-008',
    department: 'Mathematics',
    department_code: 'MATH',
    department_id: 'dept-math',
    designation: 'Assistant Professor',
    email: 'ananya.reddy@campus.edu',
    phone: '+91 98234 10008',
    cabin: 'MATH-108',
    office_hours: 'Wed-Fri 10:00 AM - 12:00 PM',
  },
  {
    id: 'tch-009',
    profile_id: 'tch-009',
    full_name: 'Karan Malhotra',
    name: 'Karan Malhotra',
    employee_id: 'TCH-009',
    department: 'Electronics',
    department_code: 'ECE',
    department_id: 'dept-ece',
    designation: 'Assistant Professor',
    email: 'karan.malhotra@campus.edu',
    phone: '+91 98234 10009',
    cabin: 'EC-406',
    office_hours: 'Mon-Thu 02:00 PM - 04:00 PM',
  },
  {
    id: 'tch-010',
    profile_id: 'tch-010',
    full_name: 'Pooja Desai',
    name: 'Pooja Desai',
    employee_id: 'TCH-010',
    department: 'English',
    department_code: 'ENG',
    department_id: 'dept-eng',
    designation: 'Senior Lecturer',
    email: 'pooja.desai@campus.edu',
    phone: '+91 98234 10010',
    cabin: 'HUM-201',
    office_hours: 'Mon-Fri 01:00 PM - 03:00 PM',
  },
];
export const SEED_FACULTY: FacultyRecord[] = DEMO_TEACHERS;
export const SEED_STUDENTS: StudentRecord[] = [];

export const SIXTY_STUDENT_ROSTER: {
  id: string;
  enrolment_no: string;
  full_name: string;
  has_approved_leave: boolean;
}[] = [];

export const SEED_PARENT_LINKS: ParentLink[] = [];
export const SEED_SUBJECTS: Subject[] = [];
export const SEED_TIMETABLE: TimetableSlot[] = [];
export const SEED_ATTENDANCE_SESSIONS: AttendanceSession[] = [];
export const SEED_ATTENDANCE_CORRECTIONS: AttendanceCorrectionRequest[] = [];
export const SEED_FEE_STRUCTURES: FeeStructure[] = [];
export const SEED_FEE_ASSIGNMENTS: FeeAssignment[] = [];
export const SEED_PAYMENTS: PaymentRecord[] = [];
export const SEED_NOTICES: NoticeItem[] = [];
export const SEED_MENTOR_MEETINGS: MentorMeeting[] = [];
export const SEED_LEAVE_REQUESTS: LeaveRequestItem[] = [];
export const SEED_TICKETS: GrievanceTicket[] = [];
export const SEED_ASSIGNMENTS: AssignmentItem[] = [];
export const SEED_AUDIT_LOGS: AuditLogEntry[] = [];

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  minimum_attendance_pct: 75,
  warning_attendance_pct: 80,
  block_hall_ticket_on_overdue_fees: true,
  results_published: true,
  results_publish_date: new Date().toISOString().slice(0, 10),
  default_late_fine_paise_per_day: 2500,
  require_totp_for_admins: true,
};


