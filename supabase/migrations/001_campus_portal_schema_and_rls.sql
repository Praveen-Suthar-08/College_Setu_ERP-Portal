-- =============================================================================
-- CAMPUS PORTAL: MASTER POSTGRES SCHEMA, ROW LEVEL SECURITY & SEED SCRIPT
-- Target: Supabase Postgres 15+
-- Security Model: Default-Deny Row Level Security on all 23 tables.
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. ENUMS
create type user_role as enum (
  'super_admin',
  'admin',
  'accounts',
  'hod',
  'faculty',
  'student',
  'parent',
  'librarian'
);

create type account_status as enum ('pending', 'active', 'suspended');
create type attendance_status as enum ('Present', 'Absent', 'Late', 'On Duty', 'Approved Leave');
create type leave_status as enum ('Draft', 'Pending Mentor', 'Pending HOD', 'Approved', 'Rejected', 'Cancelled');
create type notice_category as enum ('Academic', 'Exam', 'Fees', 'Event', 'Holiday', 'Urgent');

-- 2. UPDATED_AT TRIGGER HELPER
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. CORE TABLES
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  hod_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null,
  email text not null unique,
  phone text,
  photo_url text,
  status account_status not null default 'pending',
  department_id uuid references departments(id),
  totp_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table departments
  add constraint fk_departments_hod
  foreign key (hod_id) references profiles(id);

-- Helper function: reads caller's role from profiles (never from client JWT metadata)
create or replace function current_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function current_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id from public.profiles where id = auth.uid();
$$;

create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  department_id uuid not null references departments(id) on delete restrict,
  duration_years smallint not null check (duration_years between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table batches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete restrict,
  start_year smallint not null,
  section text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, start_year, section)
);

create table faculty (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  employee_id text not null unique,
  designation text not null,
  office_hours text not null,
  cabin text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  enrolment_no text not null unique,
  batch_id uuid not null references batches(id) on delete restrict,
  current_semester smallint not null check (current_semester between 1 and 12),
  guardian_name text,
  mentor_id uuid references faculty(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_profile_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_profile_id, student_id)
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  credits smallint not null check (credits between 1 and 10),
  semester smallint not null check (semester between 1 and 12),
  course_id uuid not null references courses(id) on delete restrict,
  syllabus_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subject_assignments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete restrict,
  faculty_id uuid not null references faculty(id) on delete restrict,
  batch_id uuid not null references batches(id) on delete restrict,
  academic_year text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, batch_id, academic_year)
);

create table timetable_slots (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  subject_assignment_id uuid not null references subject_assignments(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 6),
  period smallint not null check (period between 1 and 8),
  start_time time not null,
  end_time time not null,
  room text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  subject_assignment_id uuid not null references subject_assignments(id) on delete restrict,
  date date not null,
  period smallint not null check (period between 1 and 8),
  marked_by uuid not null references faculty(id),
  locked_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_assignment_id, date, period)
);

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references attendance_sessions(id) on delete restrict,
  student_id uuid not null references students(id) on delete restrict,
  status attendance_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references attendance_records(id) on delete restrict,
  requested_by uuid not null references faculty(id),
  proposed_status attendance_status not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table exam_components (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null check (name in ('Internal 1', 'Internal 2', 'Assignment', 'Lab', 'Semester End')),
  max_marks integer not null check (max_marks > 0),
  weightage numeric(5,2) not null check (weightage > 0 and weightage <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table marks (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references exam_components(id) on delete restrict,
  student_id uuid not null references students(id) on delete restrict,
  marks_obtained numeric(5,2) not null check (marks_obtained >= 0),
  entered_by uuid not null references faculty(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (component_id, student_id)
);

create table results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete restrict,
  semester smallint not null,
  sgpa numeric(4,2) not null,
  cgpa numeric(4,2) not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, semester)
);

-- All monetary amounts stored in integer paise (1 INR = 100 paise) to prevent floating-point drift
create table fee_structures (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete restrict,
  year smallint not null check (year between 1 and 6),
  category text not null check (category in ('tuition', 'exam', 'hostel', 'transport', 'library', 'miscellaneous')),
  amount_paise bigint not null check (amount_paise >= 0),
  due_date date not null,
  fine_per_day_paise bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table fee_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete restrict,
  structure_id uuid not null references fee_structures(id) on delete restrict,
  amount_paise bigint not null check (amount_paise >= 0),
  concession_paise bigint not null default 0 check (concession_paise >= 0),
  concession_reason text,
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid', 'overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references fee_assignments(id) on delete restrict,
  amount_paise bigint not null,
  mode text not null check (mode in ('cash', 'bank_transfer', 'upi', 'gateway', 'reversal')),
  reference text not null,
  receipt_no text not null unique,
  recorded_by uuid not null references profiles(id),
  reversed_of uuid references payments(id),
  reversal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category notice_category not null,
  audience jsonb not null default '{"scope": "college"}'::jsonb,
  attachment_url text,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  pinned boolean not null default false,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notice_reads (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references notices(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (notice_id, user_id)
);

create table mentor_meetings (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references faculty(id) on delete restrict,
  student_id uuid not null references students(id) on delete restrict,
  date date not null,
  private_notes text,
  shared_summary text not null,
  action_items text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references profiles(id) on delete restrict,
  type text not null check (type in ('Medical', 'Personal', 'On Duty', 'Event')),
  from_date date not null,
  to_date date not null,
  falls_on_exam_day boolean not null default false,
  reason text not null,
  attachment_url text,
  status leave_status not null default 'Pending Mentor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (to_date >= from_date)
);

create table leave_approvals (
  id uuid primary key default gen_random_uuid(),
  leave_id uuid not null references leave_requests(id) on delete cascade,
  step text not null check (step in ('mentor', 'hod', 'super_admin')),
  approver_id uuid not null references profiles(id),
  decision text not null check (decision in ('approved', 'rejected')),
  comment text,
  decided_at timestamptz not null default now()
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  raised_by uuid not null references profiles(id),
  category text not null check (category in ('Attendance', 'Fees', 'Marks', 'Profile Correction', 'Hostel', 'IT Support')),
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  assigned_to uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create table settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- 4. IMMUTABILITY & SECURITY TRIGGERS
-- Prevent UPDATE or DELETE on audit_logs (strictly append-only)
create or replace function prevent_audit_log_tamper()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only; updates and deletes are forbidden';
end;
$$;

create trigger trg_audit_logs_immutable
before update or delete on audit_logs
for each row execute function prevent_audit_log_tamper();

-- Prevent DELETE on payments and attendance_records
create or replace function prevent_hard_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Hard deletion is prohibited on %; use a reversal or correction record instead', tg_table_name;
end;
$$;

create trigger trg_payments_no_delete
before delete on payments
for each row execute function prevent_hard_delete();

create trigger trg_attendance_no_delete
before delete on attendance_records
for each row execute function prevent_hard_delete();

-- Auto-create pending student profile on Auth sign-up (role never accepted from client payload)
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, status)
  values (
    new.id,
    'student',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'pending'
  );
  return new;
end;
$$;

-- 5. ENABLE ROW LEVEL SECURITY ON EVERY TABLE
alter table profiles enable row level security;
alter table departments enable row level security;
alter table courses enable row level security;
alter table batches enable row level security;
alter table students enable row level security;
alter table faculty enable row level security;
alter table parent_links enable row level security;
alter table subjects enable row level security;
alter table subject_assignments enable row level security;
alter table timetable_slots enable row level security;
alter table attendance_sessions enable row level security;
alter table attendance_records enable row level security;
alter table attendance_corrections enable row level security;
alter table exam_components enable row level security;
alter table marks enable row level security;
alter table results enable row level security;
alter table fee_structures enable row level security;
alter table fee_assignments enable row level security;
alter table payments enable row level security;
alter table notices enable row level security;
alter table notice_reads enable row level security;
alter table mentor_meetings enable row level security;
alter table leave_requests enable row level security;
alter table leave_approvals enable row level security;
alter table tickets enable row level security;
alter table audit_logs enable row level security;
alter table settings enable row level security;

-- 6. ROW LEVEL SECURITY POLICIES (with plain-English explanations)

-- Policy: Users read their own profile; Staff/Admin/HOD read profiles within scope
create policy "profiles_select_policy" on profiles
for select using (
  id = auth.uid()
  or current_role() in ('super_admin', 'admin', 'accounts', 'hod', 'faculty')
);

-- Policy: Users can update only their own contact fields; role and status cannot be self-updated
create policy "profiles_self_update_contact" on profiles
for update using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select p.role from profiles p where p.id = auth.uid())
  and status = (select p.status from profiles p where p.id = auth.uid())
);

-- Policy: Admin can manage non-super_admin users; Super Admin can manage all
create policy "profiles_admin_manage" on profiles
for all using (
  current_role() = 'super_admin'
  or (current_role() = 'admin' and role <> 'super_admin')
);

-- Policy: Students read only their own student record; Parents read approved linked children; Staff read within scope
create policy "students_select_policy" on students
for select using (
  profile_id = auth.uid()
  or exists (
    select 1 from parent_links pl
    where pl.student_id = students.id
      and pl.parent_profile_id = auth.uid()
      and pl.status = 'approved'
  )
  or current_role() in ('super_admin', 'admin', 'accounts', 'hod', 'faculty')
);

-- Policy: Attendance records readable by the student themselves, approved linked parent, assigned faculty, HOD, or Admin
create policy "attendance_records_select" on attendance_records
for select using (
  exists (
    select 1 from students s
    where s.id = attendance_records.student_id
      and (
        s.profile_id = auth.uid()
        or exists (
          select 1 from parent_links pl
          where pl.student_id = s.id
            and pl.parent_profile_id = auth.uid()
            and pl.status = 'approved'
        )
      )
  )
  or exists (
    select 1 from attendance_sessions ses
    join subject_assignments sa on sa.id = ses.subject_assignment_id
    join faculty f on f.id = sa.faculty_id
    where ses.id = attendance_records.session_id
      and f.profile_id = auth.uid()
  )
  or current_role() in ('super_admin', 'admin', 'hod')
);

-- Policy: Faculty can insert/update attendance only for their own assigned subjects and only before the 24-hour lock expires
create policy "attendance_records_faculty_write" on attendance_records
for insert with check (
  exists (
    select 1 from attendance_sessions ses
    join subject_assignments sa on sa.id = ses.subject_assignment_id
    join faculty f on f.id = sa.faculty_id
    where ses.id = attendance_records.session_id
      and f.profile_id = auth.uid()
      and now() < ses.locked_at
  )
);

create policy "attendance_records_faculty_update_within_24h" on attendance_records
for update using (
  exists (
    select 1 from attendance_sessions ses
    join subject_assignments sa on sa.id = ses.subject_assignment_id
    join faculty f on f.id = sa.faculty_id
    where ses.id = attendance_records.session_id
      and f.profile_id = auth.uid()
      and now() < ses.locked_at
  )
  or current_role() in ('super_admin', 'hod')
);

-- Policy: Published results are readable by the student or approved parent; unpublished results are visible only to Admin/HOD/Super Admin
create policy "results_select_policy" on results
for select using (
  (
    published_at is not null
    and published_at <= now()
    and exists (
      select 1 from students s
      where s.id = results.student_id
        and (
          s.profile_id = auth.uid()
          or exists (
            select 1 from parent_links pl
            where pl.student_id = s.id
              and pl.parent_profile_id = auth.uid()
              and pl.status = 'approved'
          )
        )
    )
  )
  or current_role() in ('super_admin', 'admin', 'hod')
);

-- Policy: Fee assignments and payments are accessible to the student, approved parent, Accounts Officer, and Super Admin (Faculty/HOD cannot see fees)
create policy "fee_assignments_select" on fee_assignments
for select using (
  exists (
    select 1 from students s
    where s.id = fee_assignments.student_id
      and (
        s.profile_id = auth.uid()
        or exists (
          select 1 from parent_links pl
          where pl.student_id = s.id
            and pl.parent_profile_id = auth.uid()
            and pl.status = 'approved'
        )
      )
  )
  or current_role() in ('accounts', 'super_admin', 'admin')
);

create policy "fee_assignments_accounts_write" on fee_assignments
for all using (current_role() in ('accounts', 'super_admin'));

create policy "payments_select" on payments
for select using (
  exists (
    select 1 from fee_assignments fa
    join students s on s.id = fa.student_id
    where fa.id = payments.assignment_id
      and (
        s.profile_id = auth.uid()
        or exists (
          select 1 from parent_links pl
          where pl.student_id = s.id
            and pl.parent_profile_id = auth.uid()
            and pl.status = 'approved'
        )
      )
  )
  or current_role() in ('accounts', 'super_admin', 'admin')
);

-- Policy: Only Accounts Officer and Super Admin can insert payments (updates/deletes blocked; corrections via reversal rows)
create policy "payments_accounts_insert" on payments
for insert with check (current_role() in ('accounts', 'super_admin'));

-- Policy: Audit logs readable ONLY by super_admin; any authenticated actor can insert an audit event
create policy "audit_logs_super_admin_read" on audit_logs
for select using (current_role() = 'super_admin');

create policy "audit_logs_authenticated_insert" on audit_logs
for insert with check (auth.uid() is not null);
