import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Briefcase,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  GraduationCap,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Share2,
  ShieldCheck,
  Sliders,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { BUILT_IN_AVATARS, BuiltInAvatarGraphic } from '../../data/avatars';
import { Profile, ROLE_LABELS, UserRole } from '../../types/portal';
import {
  Avatar,
  Badge,
  Button,
  Chip,
  DefinitionList,
  GlassCard,
  Input,
  ModalDialog,
  Select,
  StatTile,
  Switch,
} from '../ui/DesignSystem';
import { AvatarStudioModal } from './AvatarStudioModal';

export type ProfileSectionId =
  | 'overview'
  | 'personal'
  | 'academic'
  | 'contact'
  | 'professional'
  | 'security'
  | 'preferences';

interface ProfileManagementViewProps {
  profile: Profile;
  onUpdateProfile: (patch: Partial<Profile>) => void;
  onCreateNewProfile?: (newProfile: Profile, switchToNew?: boolean) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onToast: (msg: string) => void;
  initialEditMode?: boolean;
  initialOpenAvatarStudio?: boolean;
  initialOpenCreateWizard?: boolean;
}

const SECTION_NAV: {
  id: ProfileSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { id: 'overview', label: 'Overview', icon: UserCheck },
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'academic', label: 'Academic & Role', icon: GraduationCap },
  { id: 'contact', label: 'Contact', icon: MapPin },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'security', label: 'Account & Security', icon: ShieldCheck },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
];

export const ProfileManagementView: React.FC<ProfileManagementViewProps> = ({
  profile,
  onUpdateProfile,
  onCreateNewProfile,
  isDark,
  onToggleTheme,
  onToast,
  initialEditMode = false,
  initialOpenAvatarStudio = false,
  initialOpenCreateWizard = false,
}) => {
  const [activeSection, setActiveSection] = useState<ProfileSectionId>('overview');
  const [isEditing, setIsEditing] = useState<boolean>(initialEditMode);
  const [avatarStudioOpen, setAvatarStudioOpen] = useState<boolean>(initialOpenAvatarStudio);
  const [createWizardOpen, setCreateWizardOpen] = useState<boolean>(initialOpenCreateWizard);
  const [formError, setFormError] = useState<string | null>(null);

  const nameParts = (profile.full_name || '').trim().split(/\s+/);
  const defaultFirstName = profile.first_name ?? (nameParts[0] || '');
  const defaultLastName =
    profile.last_name ?? (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  const defaultUsername =
    profile.username ||
    (profile.email
      ? profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '')
      : 'campus.user');

  const [draft, setDraft] = useState<Profile>(() => ({
    ...profile,
    first_name: defaultFirstName,
    middle_name: profile.middle_name || '',
    last_name: defaultLastName,
    display_name: profile.display_name || profile.full_name,
    username: defaultUsername,
    date_of_birth: profile.date_of_birth || '1998-05-14',
    gender: profile.gender || 'Prefer not to say',
    alternate_phone: profile.alternate_phone || '',
    alternate_email: profile.alternate_email || '',
    department:
      profile.department ||
      (profile.role === 'super_admin' || profile.role === 'admin'
        ? 'Institutional Governance & Registry'
        : 'Computer Science & Engineering'),
    course_program: profile.course_program || 'B.Tech Computer Science & Engineering',
    semester_year: profile.semester_year || 'Semester 5 · Year 3',
    batch_academic_year: profile.batch_academic_year || '2024–2028 Cohort',
    section_group: profile.section_group || 'Section A',
    faculty_advisor: profile.faculty_advisor || 'Assigned Faculty Mentor',
    employee_id: profile.employee_id || profile.identifier_no || 'EMP-2026-104',
    designation: profile.designation || ROLE_LABELS[profile.role],
    assigned_courses:
      profile.assigned_courses || 'Operating Systems, Distributed Systems, Capstone Lab',
    qualification: profile.qualification || 'Ph.D. / M.Tech in Computer Science',
    specialization: profile.specialization || 'Systems Architecture & Cloud Governance',
    experience_years: profile.experience_years || '8 Years',
    joining_date: profile.joining_date || '2021-08-01',
    institution_type: profile.institution_type || 'Autonomous University / Engineering Institute',
    campus_location: profile.campus_location || 'Main Academic Campus',
    administrative_responsibilities:
      profile.administrative_responsibilities ||
      'Institutional Access Control, Academic Policy, Multi-Role Verification & Security Audit',
    country: profile.country || 'India',
    state_province: profile.state_province || 'Karnataka',
    city: profile.city || 'Bengaluru',
    postal_code: profile.postal_code || '560001',
    address_line_1: profile.address_line_1 || 'Academic Enclave, University Road',
    address_line_2: profile.address_line_2 || 'Block II, Administrative Wing',
    bio:
      profile.bio ||
      (profile.role === 'student'
        ? `Dedicated Computer Science student passionate about software development, artificial intelligence, data analytics, and campus learning.`
        : `Dedicated ${ROLE_LABELS[profile.role]} focused on academic excellence, transparent institutional governance, and student success.`),
    skills:
      profile.skills && profile.skills.length > 0
        ? profile.skills
        : profile.role === 'student'
          ? ['Programming', 'Data Analytics', 'Software Development', 'AI / Machine Learning']
          : ['Academic Governance', 'Curriculum Planning', 'Data Analytics', 'Institutional Security'],
    areas_of_expertise:
      profile.areas_of_expertise && profile.areas_of_expertise.length > 0
        ? profile.areas_of_expertise
        : profile.role === 'student'
          ? ['Computer Science', 'Algorithms', 'Web Development', 'Problem Solving']
          : ['Higher Education Administration', 'Digital Campus Operations', 'Policy Compliance'],
    office_location: profile.office_location || 'Admin Block · Suite 204',
    website_url: profile.website_url || 'https://campus-portal.edu',
    email_verified: profile.email_verified ?? true,
    phone_verified: profile.phone_verified ?? true,
    last_login: profile.last_login || new Date().toISOString(),
    preferences: {
      theme: isDark ? 'dark' : 'light',
      language: profile.preferences?.language || 'English (IN / US)',
      timezone: profile.preferences?.timezone || 'Asia/Kolkata (IST · UTC+05:30)',
      email_notifications: profile.preferences?.email_notifications ?? true,
      dashboard_notifications: profile.preferences?.dashboard_notifications ?? true,
      security_alerts: profile.preferences?.security_alerts ?? true,
      profile_visibility: profile.preferences?.profile_visibility || 'institution',
      show_email: profile.preferences?.show_email ?? true,
      show_phone: profile.preferences?.show_phone ?? true,
      show_address: profile.preferences?.show_address ?? false,
    },
  }));

  const [newSkillInput, setNewSkillInput] = useState('');
  const [newExpertiseInput, setNewExpertiseInput] = useState('');

  useEffect(() => {
    const parts = (profile.full_name || '').trim().split(/\s+/);
    setDraft((prev) => ({
      ...prev,
      ...profile,
      first_name: profile.first_name ?? (parts[0] || ''),
      last_name: profile.last_name ?? (parts.length > 1 ? parts.slice(1).join(' ') : ''),
      display_name: profile.display_name || profile.full_name,
      username:
        profile.username ||
        (profile.email
          ? profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '')
          : prev.username),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile.id,
    profile.full_name,
    profile.email,
    profile.phone,
    profile.role,
    profile.status,
    profile.avatar_id,
    profile.custom_avatar_url,
    profile.department,
    profile.college_code,
    profile.college_name,
  ]);

  const completeness = useMemo(() => {
    const checks = [
      {
        label: 'Full Name & Username',
        done: Boolean(draft.full_name && draft.username),
        section: 'personal' as ProfileSectionId,
      },
      {
        label: 'Profile Avatar Selected',
        done: Boolean(draft.avatar_id || draft.custom_avatar_url || draft.photo_url),
        section: 'overview' as ProfileSectionId,
      },
      {
        label: 'Verified Email & Phone',
        done: Boolean(draft.email && draft.phone),
        section: 'personal' as ProfileSectionId,
      },
      {
        label: 'Department & Role Info',
        done: Boolean(
          draft.department && (draft.identifier_no || draft.employee_id || draft.college_code)
        ),
        section: 'academic' as ProfileSectionId,
      },
      {
        label: 'City & Contact Address',
        done: Boolean(draft.city && draft.address_line_1),
        section: 'contact' as ProfileSectionId,
      },
      {
        label: 'Professional Bio & Skills',
        done: Boolean(draft.bio && (draft.skills?.length || 0) > 0),
        section: 'professional' as ProfileSectionId,
      },
      {
        label: 'Two-Factor Security (2FA)',
        done: Boolean(draft.totp_enabled),
        section: 'security' as ProfileSectionId,
      },
    ];
    const completedCount = checks.filter((c) => c.done).length;
    const pct = Math.round((completedCount / checks.length) * 100);
    const missing = checks.filter((c) => !c.done);
    return { pct, checks, missing };
  }, [draft]);

  const handleSaveProfile = () => {
    setFormError(null);
    const combinedFromParts =
      `${draft.first_name || ''} ${draft.middle_name || ''} ${draft.last_name || ''}`
        .replace(/\s+/g, ' ')
        .trim();
    const combinedFullName =
      combinedFromParts || (draft.display_name || '').trim() || draft.full_name.trim();

    if (!combinedFullName) {
      setFormError('Full name is required.');
      return;
    }
    if (!draft.email || !draft.email.includes('@')) {
      setFormError('Please enter a valid institutional email address.');
      return;
    }
    if (!draft.phone || draft.phone.trim().length < 7) {
      setFormError('Please enter a valid phone number.');
      return;
    }
    if ((draft.bio || '').length > 300) {
      setFormError('Short bio must be 300 characters or fewer.');
    }

    const nameTokens = combinedFullName.split(/\s+/);
    const syncedFirstName = nameTokens[0] || combinedFullName;
    const syncedLastName = nameTokens.length > 1 ? nameTokens.slice(1).join(' ') : '';

    const updatedPatch: Partial<Profile> = {
      ...draft,
      full_name: combinedFullName,
      display_name: combinedFullName,
      first_name: syncedFirstName,
      last_name: syncedLastName,
      college_code: (draft.college_code || '').trim().toUpperCase(),
      college_name: (draft.college_name || '').trim(),
      updated_at: new Date().toISOString(),
    };

    setDraft((prev) => ({
      ...prev,
      ...updatedPatch,
    }));
    onUpdateProfile(updatedPatch);
    setIsEditing(false);
    onToast(`Profile updated for ${combinedFullName} in real time across the portal.`);
  };

  const handleCancelEdit = () => {
    setDraft((prev) => ({ ...prev, ...profile }));
    setFormError(null);
    setIsEditing(false);
    onToast('Discarded unsaved profile edits.');
  };

  // ===========================================================================
  // 5-STEP "CREATE NEW PROFILE" (ADD PROFILE) WIZARD STATE
  // ===========================================================================
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizName, setWizName] = useState('');
  const [wizUsername, setWizUsername] = useState('');
  const [wizEmail, setWizEmail] = useState('');
  const [wizPhone, setWizPhone] = useState('+91 ');
  const [wizRole, setWizRole] = useState<UserRole>('faculty');
  const [wizCollegeName, setWizCollegeName] = useState(
    profile.college_name || 'Institution Workspace'
  );
  const [wizCollegeCode, setWizCollegeCode] = useState(profile.college_code || '');
  const [wizDept, setWizDept] = useState('Computer Science & Engineering');
  const [wizIdNo, setWizIdNo] = useState('');
  const [wizAvatarId, setWizAvatarId] = useState<string>(BUILT_IN_AVATARS[0].id);
  const [wizCity, setWizCity] = useState('Bengaluru');
  const [wizState, setWizState] = useState('Karnataka');
  const [wizCountry, setWizCountry] = useState('India');
  const [wizDesignation, setWizDesignation] = useState('Associate Professor');
  const [wizBio, setWizBio] = useState('');
  const [wizSwitchOnCreate, setWizSwitchOnCreate] = useState(false);
  const [wizError, setWizError] = useState<string | null>(null);

  const handleCreateProfileWizardSubmit = () => {
    if (!wizName.trim() || !wizEmail.includes('@')) {
      setWizError('Please provide a valid full name and email address.');
      return;
    }
    const cleanId = `prof-${Date.now()}`;
    const namePartsNew = wizName.trim().split(/\s+/);
    const createdProfile: Profile = {
      id: cleanId,
      role: wizRole,
      full_name: wizName.trim(),
      first_name: namePartsNew[0] || wizName.trim(),
      last_name: namePartsNew.slice(1).join(' '),
      display_name: wizName.trim(),
      username:
        wizUsername.trim() ||
        wizEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, ''),
      email: wizEmail.trim(),
      phone: wizPhone.trim() || '+91 98000 00000',
      avatar_id: wizAvatarId,
      status: 'active',
      totp_enabled: wizRole === 'super_admin' || wizRole === 'admin',
      college_name: wizCollegeName.trim(),
      college_code: wizCollegeCode.trim().toUpperCase(),
      department: wizDept.trim(),
      identifier_no:
        wizIdNo.trim().toUpperCase() ||
        `${wizRole.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      designation: wizDesignation.trim() || ROLE_LABELS[wizRole],
      city: wizCity.trim(),
      state_province: wizState.trim(),
      country: wizCountry.trim(),
      bio:
        wizBio.trim() ||
        `${ROLE_LABELS[wizRole]} at ${wizCollegeName.trim()} (${wizDept.trim()}).`,
      email_verified: true,
      phone_verified: true,
      created_at: new Date().toISOString(),
    };

    if (onCreateNewProfile) {
      onCreateNewProfile(createdProfile, wizSwitchOnCreate);
    }
    setCreateWizardOpen(false);
    setWizardStep(1);
    setWizName('');
    setWizUsername('');
    setWizEmail('');
    setWizBio('');
    onToast(
      `Created new ${ROLE_LABELS[wizRole]} profile for ${createdProfile.full_name}${
        wizSwitchOnCreate ? ' and switched active session.' : ' and added to registry.'
      }`
    );
  };

  // Circular completeness ring math
  const ringRadius = 15;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (completeness.pct / 100) * ringCircumference;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          6A. PROFILE HERO CARD (Solid surface, zero overlap/cutoff)
         ===================================================================== */}
      <GlassCard padding="none" className="overflow-hidden">
        {/* Top Institutional Metadata Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-6 py-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1 text-xs font-semibold text-[var(--text)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              <span>{ROLE_LABELS[draft.role]}</span>
            </span>
            {draft.college_code && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1 font-mono text-xs font-semibold text-[var(--accent-text)]">
                <span>Code:</span>
                <span>{draft.college_code}</span>
              </span>
            )}
            {draft.college_name && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-2)]">
                <Building2 className="h-3.5 w-3.5 text-[var(--accent-text)]" strokeWidth={1.75} />
                <span>{draft.college_name}</span>
              </span>
            )}
          </div>

          {/* Profile Completeness Circular Progress Ring */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-2 pr-3.5 py-1 text-[var(--text)]">
            <svg className="h-8 w-8 -rotate-90 shrink-0" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r={ringRadius}
                fill="none"
                stroke="var(--border)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r={ringRadius}
                fill="none"
                stroke="var(--success)"
                strokeWidth="3"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="leading-tight">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Completeness
              </div>
              <div className="font-mono text-xs font-bold tabular-nums text-[var(--text)]">
                {completeness.pct}%
              </div>
            </div>
          </div>
        </div>

        {/* Hero Main Body — Clean Flexbox/Grid with zero negative margin so name and avatar never clip */}
        <div className="p-6 bg-[var(--surface)]">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
            {/* Left: 88x88 Avatar + Camera Quick-Edit + Full Name & Metadata */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center min-w-0 flex-1">
              <div className="relative inline-block h-[88px] w-[88px] shrink-0">
                <Avatar
                  name={draft.full_name}
                  size="2xl"
                  avatarId={draft.avatar_id}
                  photoUrl={draft.custom_avatar_url || draft.photo_url}
                  className="!h-[88px] !w-[88px] ring-2 ring-[var(--border)]"
                />
                <button
                  type="button"
                  onClick={() => setAvatarStudioOpen(true)}
                  title="Open Avatar Studio"
                  aria-label="Change Avatar"
                  className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--accent)] text-[var(--on-accent)] shadow-sm hover:opacity-95 transition-transform hover:scale-105 cursor-pointer"
                >
                  <Camera className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[var(--text)] leading-snug break-words">
                    {draft.display_name || draft.full_name}
                  </h1>
                  <Badge tone="success" dot>
                    Verified
                  </Badge>
                  <Badge
                    tone={
                      draft.status === 'active'
                        ? 'accent'
                        : draft.status === 'pending'
                          ? 'warning'
                          : 'danger'
                    }
                    dot
                  >
                    {draft.status === 'active'
                      ? 'Active'
                      : draft.status === 'pending'
                        ? 'Pending Approval'
                        : 'Suspended'}
                  </Badge>
                </div>

                {/* Metadata line: @handle · Role · Department · Email */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-[var(--text-2)]">
                  <span className="font-mono font-semibold text-[var(--accent-text)]">
                    @{draft.username}
                  </span>
                  <span className="text-[var(--text-muted)]">·</span>
                  <span className="font-semibold text-[var(--text)]">
                    {ROLE_LABELS[draft.role]}
                  </span>
                  {draft.department && (
                    <>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-[var(--text-2)]">{draft.department}</span>
                    </>
                  )}
                  {draft.email && (
                    <>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        {draft.email}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right-aligned Actions: Edit Profile (primary), Change Avatar, Share, Add Profile */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {isEditing ? (
                <>
                  <Button type="button" variant="secondary" size="sm" onClick={handleCancelEdit}>
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Cancel</span>
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={handleSaveProfile}>
                    <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Save Changes</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsEditing(true);
                      if (activeSection === 'overview') {
                        setActiveSection('personal');
                      }
                    }}
                  >
                    <Edit3 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Edit Profile</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setAvatarStudioOpen(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                    <span>Change Avatar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const summary = `${draft.full_name} (@${draft.username}) · ${ROLE_LABELS[draft.role]} · ${draft.email}`;
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(summary).catch(() => {});
                      }
                      onToast('Copied verified profile card details to clipboard.');
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Share</span>
                  </Button>
                  {onCreateNewProfile && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setCreateWizardOpen(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                      <span>Add Profile</span>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-accent/40 bg-accent/10 px-5 py-3 text-xs font-semibold text-accent">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                <span>Profile Editing Mode Active. Modify any fields across sections and click &quot;Save Changes&quot;.</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleSaveProfile}><Save className="h-3.5 w-3.5" /> Save Changes</Button>
              </div>
            </div>
          )}

          {formError && (
            <div className="mt-4 rounded-[12px] border border-danger/40 bg-danger/10 px-4 py-2.5 text-xs font-medium text-danger">
              {formError}
            </div>
          )}
        </div>
      </GlassCard>

      {/* =====================================================================
          6B. PROFILE SECTION TABS (Horizontal bar — avoids a 2nd sidebar & dead space)
         ===================================================================== */}
      <GlassCard padding="sm">
        <div
          role="tablist"
          aria-label="Profile Sections"
          className="flex items-center gap-1.5 overflow-x-auto py-0.5"
        >
          {SECTION_NAV.map((sec) => {
            const Icon = sec.icon;
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveSection(sec.id)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)]/30'
                    : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] border border-transparent'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]'
                  }`}
                  strokeWidth={1.85}
                />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* =====================================================================
          6C. PROFILE BODY (Full 12-Col Width, Equal-Height Cards)
         ===================================================================== */}
      <div className="space-y-6">
        <div className="space-y-6">
          {/* 1. OVERVIEW SECTION */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* 3 Equal StatTiles */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 items-stretch">
                <StatTile
                  label="Primary Role"
                  value={ROLE_LABELS[draft.role]}
                  icon={Award}
                  tone="accent"
                  delta={`ID: ${draft.identifier_no || draft.employee_id || draft.id}`}
                />
                <StatTile
                  label="Department / Unit"
                  value={draft.department || 'Academic Registry'}
                  icon={Building2}
                  tone="info"
                  delta={draft.college_name || 'Registered Campus'}
                />
                <StatTile
                  label="Security & 2FA"
                  value={draft.totp_enabled ? '2FA Enabled' : 'Standard Auth'}
                  icon={ShieldCheck}
                  tone="success"
                  delta="Email & Phone Verified"
                />
              </div>

              {/* 2 Equal-Height GlassCards (col-span-6 + col-span-6 inside the 9-col area) */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-12 items-stretch">
                {/* Card A: About & Biography + Skills/Expertise Chips + Recent Account Activity */}
                <div className="md:col-span-6 flex flex-col">
                  <GlassCard equalHeight padding="lg" className="justify-between gap-5">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between border-b border-line pb-3.5">
                        <div>
                          <h2 className="text-[17px] font-semibold text-ink">
                            About &amp; Institutional Biography
                          </h2>
                          <p className="text-xs text-muted">
                            Public summary &amp; verified competencies
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setActiveSection('professional');
                            setIsEditing(true);
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          <span>Edit Bio &amp; Skills</span>
                        </Button>
                      </div>

                      <p className="text-sm leading-relaxed text-ink">{draft.bio}</p>

                      <div className="space-y-3 pt-1">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
                            Core Skills &amp; Competencies
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(draft.skills || []).map((sk, idx) => (
                              <Chip key={idx}>{sk}</Chip>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
                            Areas of Expertise
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(draft.areas_of_expertise || []).map((ex, idx) => (
                              <Chip key={idx} active>
                                {ex}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Account Activity Footer so Card A & Card B balance cleanly */}
                    <div className="border-t border-line pt-4 space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Recent Account Activity
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 text-ink">
                          <Clock className="h-3.5 w-3.5 text-accent" />
                          <span>Last authenticated session</span>
                        </span>
                        <span className="font-mono text-muted tabular-nums">
                          {new Date(draft.last_login || Date.now()).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 text-ink">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Institutional Profile Status</span>
                        </span>
                        <span className="font-mono text-[var(--success)]">
                          Verified
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Card B: Contact & Role Details (Combined DefinitionList, 44px rows, copy-on-click) */}
                <div className="md:col-span-6 flex flex-col">
                  <GlassCard equalHeight padding="lg" className="justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between border-b border-line pb-3.5">
                        <div>
                          <h2 className="text-[17px] font-semibold text-ink">
                            Contact &amp; Role Details
                          </h2>
                          <p className="text-xs text-muted">
                            Click copy icon on Email, Phone, or Code
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setActiveSection('contact');
                            setIsEditing(true);
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          <span>Edit Contact Details</span>
                        </Button>
                      </div>

                      <div className="mt-2">
                        <DefinitionList
                          onCopy={(lbl) => onToast(`Copied ${lbl} to clipboard.`)}
                          items={[
                            {
                              label: 'Email',
                              value: draft.email,
                              mono: true,
                              copyable: true,
                            },
                            {
                              label: 'Phone',
                              value: draft.phone,
                              mono: true,
                              copyable: true,
                            },
                            {
                              label: 'Location',
                              value: `${draft.city || 'Bengaluru'}, ${draft.state_province || 'KA'}, ${draft.country || 'India'}`,
                            },
                            {
                              label: 'Office',
                              value: draft.office_location || 'Admin Block · Suite 204',
                            },
                            {
                              label: 'Designation',
                              value: draft.designation || ROLE_LABELS[draft.role],
                            },
                            {
                              label: 'Department',
                              value: draft.department || 'Academic Registry',
                            },
                            {
                              label: 'Identifier / Code',
                              value:
                                draft.college_code ||
                                draft.identifier_no ||
                                draft.employee_id ||
                                draft.id,
                              mono: true,
                              copyable: true,
                            },
                            {
                              label: 'Member Since',
                              value: new Date(draft.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              }),
                              mono: true,
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </div>
            </div>
          )}

          {/* 2. PERSONAL INFORMATION SECTION */}
          {activeSection === 'personal' && (
            <GlassCard padding="lg" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h2 className="text-[17px] font-semibold text-ink">Personal Information</h2>
                  <p className="text-xs text-muted">
                    Legal name, display identity, demographics, and primary contact numbers.
                  </p>
                </div>
                {!isEditing && (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Edit Fields</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label="First Name *"
                  value={draft.first_name || ''}
                  disabled={!isEditing}
                  onChange={(e) => {
                    const nextFirst = e.target.value;
                    const combined = `${nextFirst} ${draft.middle_name || ''} ${draft.last_name || ''}`
                      .replace(/\s+/g, ' ')
                      .trim();
                    setDraft({
                      ...draft,
                      first_name: nextFirst,
                      full_name: combined || nextFirst,
                      display_name: combined || nextFirst,
                    });
                  }}
                />
                <Input
                  label="Middle Name"
                  value={draft.middle_name || ''}
                  disabled={!isEditing}
                  onChange={(e) => {
                    const nextMid = e.target.value;
                    const combined = `${draft.first_name || ''} ${nextMid} ${draft.last_name || ''}`
                      .replace(/\s+/g, ' ')
                      .trim();
                    setDraft({
                      ...draft,
                      middle_name: nextMid,
                      full_name: combined || draft.full_name,
                      display_name: combined || draft.display_name,
                    });
                  }}
                />
                <Input
                  label="Last Name *"
                  value={draft.last_name || ''}
                  disabled={!isEditing}
                  onChange={(e) => {
                    const nextLast = e.target.value;
                    const combined = `${draft.first_name || ''} ${draft.middle_name || ''} ${nextLast}`
                      .replace(/\s+/g, ' ')
                      .trim();
                    setDraft({
                      ...draft,
                      last_name: nextLast,
                      full_name: combined || draft.full_name,
                      display_name: combined || draft.display_name,
                    });
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Full / Display Name"
                  value={draft.display_name || draft.full_name || ''}
                  disabled={!isEditing}
                  onChange={(e) => {
                    const val = e.target.value;
                    const parts = val.trim().split(/\s+/);
                    setDraft({
                      ...draft,
                      display_name: val,
                      full_name: val,
                      first_name: parts[0] || '',
                      middle_name: '',
                      last_name: parts.length > 1 ? parts.slice(1).join(' ') : '',
                    });
                  }}
                />
                <Input
                  label="Username (@handle) *"
                  value={draft.username || ''}
                  disabled={!isEditing}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''),
                    })
                  }
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Date of Birth"
                  type="date"
                  value={draft.date_of_birth || ''}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, date_of_birth: e.target.value })}
                />
                <Select
                  label="Gender"
                  value={draft.gender || 'Prefer not to say'}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, gender: e.target.value })}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Non-binary', label: 'Non-binary' },
                    { value: 'Prefer not to say', label: 'Prefer not to say' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Primary Email Address *"
                  type="email"
                  value={draft.email}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
                <Input
                  label="Alternate Email Address"
                  type="email"
                  value={draft.alternate_email || ''}
                  disabled={!isEditing}
                  placeholder="personal.email@domain.com"
                  onChange={(e) => setDraft({ ...draft, alternate_email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Primary Phone Number *"
                  value={draft.phone}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
                <Input
                  label="Alternate Phone Number"
                  value={draft.alternate_phone || ''}
                  disabled={!isEditing}
                  placeholder="+91 98000 00000"
                  onChange={(e) => setDraft({ ...draft, alternate_phone: e.target.value })}
                />
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2 border-t border-line pt-4">
                  <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveProfile}>
                    Save Personal Information
                  </Button>
                </div>
              )}
            </GlassCard>
          )}

          {/* 3. ACADEMIC / ROLE INFORMATION SECTION */}
          {activeSection === 'academic' && (
            <GlassCard padding="lg" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h2 className="text-[17px] font-semibold text-ink">
                    {draft.role === 'student' || draft.role === 'parent'
                      ? 'Student Academic Registration'
                      : draft.role === 'faculty' || draft.role === 'hod'
                        ? 'Faculty & Instructional Registry'
                        : 'College Organizer & Administrative Profile'}
                  </h2>
                  <p className="text-xs text-muted">
                    Role-adaptive academic, departmental, and institutional parameters.
                  </p>
                </div>
                {!isEditing && (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Edit Fields</span>
                  </Button>
                )}
              </div>

              {draft.role === 'student' || draft.role === 'parent' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Student ID / Roll Number"
                    value={draft.identifier_no || '24CSE001'}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, identifier_no: e.target.value })}
                    className="font-mono"
                  />
                  <Input
                    label="Joined Unique College Code"
                    value={draft.college_code || ''}
                    disabled={draft.role === 'student' || draft.role === 'parent' || !isEditing}
                    onChange={(e) =>
                      setDraft({ ...draft, college_code: e.target.value.toUpperCase() })
                    }
                    className="font-mono uppercase"
                  />
                  <Input
                    label="Department"
                    value={draft.department || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                  />
                  <Input
                    label="Course / Degree Program"
                    value={draft.course_program || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, course_program: e.target.value })}
                  />
                  <Input
                    label="Current Semester / Year"
                    value={draft.semester_year || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, semester_year: e.target.value })}
                  />
                  <Input
                    label="Batch / Academic Year"
                    value={draft.batch_academic_year || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, batch_academic_year: e.target.value })}
                  />
                  <Input
                    label="Section / Lab Group"
                    value={draft.section_group || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, section_group: e.target.value })}
                  />
                  <Input
                    label="Assigned Faculty Advisor / Mentor"
                    value={draft.faculty_advisor || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, faculty_advisor: e.target.value })}
                  />
                </div>
              ) : draft.role === 'faculty' || draft.role === 'hod' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Employee ID"
                    value={draft.employee_id || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, employee_id: e.target.value })}
                    className="font-mono"
                  />
                  <Input
                    label="Department"
                    value={draft.department || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                  />
                  <Input
                    label="Academic Designation"
                    value={draft.designation || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
                  />
                  <Input
                    label="Highest Qualification"
                    value={draft.qualification || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, qualification: e.target.value })}
                  />
                  <Input
                    label="Primary Specialization"
                    value={draft.specialization || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, specialization: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Experience"
                      value={draft.experience_years || ''}
                      disabled={!isEditing}
                      onChange={(e) => setDraft({ ...draft, experience_years: e.target.value })}
                    />
                    <Input
                      label="Joining Date"
                      type="date"
                      value={draft.joining_date || ''}
                      disabled={!isEditing}
                      onChange={(e) => setDraft({ ...draft, joining_date: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Assigned Courses & Subjects"
                      value={draft.assigned_courses || ''}
                      disabled={!isEditing}
                      onChange={(e) => setDraft({ ...draft, assigned_courses: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="College / Institution Name"
                    value={draft.college_name || 'Institution Workspace'}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, college_name: e.target.value })}
                  />
                  <Input
                    label="Unique Institution Code"
                    value={draft.college_code || ''}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setDraft({ ...draft, college_code: e.target.value.toUpperCase() })
                    }
                    className="font-mono uppercase"
                  />
                  <Input
                    label="Institution Type"
                    value={draft.institution_type || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, institution_type: e.target.value })}
                  />
                  <Input
                    label="Campus Location"
                    value={draft.campus_location || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, campus_location: e.target.value })}
                  />
                  <Input
                    label="Executive Role / Designation"
                    value={draft.designation || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
                  />
                  <Input
                    label="Department / Governance Office"
                    value={draft.department || ''}
                    disabled={!isEditing}
                    onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Administrative Responsibilities"
                      value={draft.administrative_responsibilities || ''}
                      disabled={!isEditing}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          administrative_responsibilities: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="flex justify-end gap-2 border-t border-line pt-4">
                  <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveProfile}>
                    Save Academic &amp; Role Details
                  </Button>
                </div>
              )}
            </GlassCard>
          )}

          {/* 4. CONTACT & ADDRESS INFORMATION SECTION */}
          {activeSection === 'contact' && (
            <GlassCard padding="lg" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h2 className="text-[17px] font-semibold text-ink">
                    Contact &amp; Residential Address
                  </h2>
                  <p className="text-xs text-muted">
                    Mailing coordinates, emergency contact, and directory privacy controls.
                  </p>
                </div>
                {!isEditing && (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Edit Fields</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Address Line 1"
                  value={draft.address_line_1 || ''}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, address_line_1: e.target.value })}
                />
                <Input
                  label="Address Line 2"
                  value={draft.address_line_2 || ''}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, address_line_2: e.target.value })}
                />
                <Input
                  label="City / Municipality"
                  value={draft.city || ''}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                />
                <Input
                  label="State / Province"
                  value={draft.state_province || ''}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, state_province: e.target.value })}
                />
                <Input
                  label="Postal / PIN Code"
                  value={draft.postal_code || ''}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, postal_code: e.target.value })}
                  className="font-mono"
                />
                <Input
                  label="Country"
                  value={draft.country || ''}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Emergency Contact Name & Number"
                    value={draft.emergency_contact || ''}
                    disabled={!isEditing}
                    placeholder="e.g., Guardian / Spouse — +91 98450 11223"
                    onChange={(e) => setDraft({ ...draft, emergency_contact: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t border-line pt-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Directory Field Visibility Controls
                </div>
                <Switch
                  checked={draft.preferences?.show_email ?? true}
                  onChange={(val) =>
                    setDraft({
                      ...draft,
                      preferences: { ...draft.preferences, show_email: val },
                    })
                  }
                  label="Display Email Address in Campus Directory"
                  description="Allow faculty and verified peers in your institution to view your email."
                />
                <Switch
                  checked={draft.preferences?.show_phone ?? true}
                  onChange={(val) =>
                    setDraft({
                      ...draft,
                      preferences: { ...draft.preferences, show_phone: val },
                    })
                  }
                  label="Display Phone Number to Department Staff"
                  description="Visible to authorized academic mentors and administrators."
                />
                <Switch
                  checked={draft.preferences?.show_address ?? false}
                  onChange={(val) =>
                    setDraft({
                      ...draft,
                      preferences: { ...draft.preferences, show_address: val },
                    })
                  }
                  label="Keep Residential Address Private (Registrar Only)"
                  description="Restrict street address visibility strictly to the College Registrar."
                />
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2 border-t border-line pt-4">
                  <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveProfile}>
                    Save Contact &amp; Privacy Settings
                  </Button>
                </div>
              )}
            </GlassCard>
          )}

          {/* 5. PROFESSIONAL INFORMATION SECTION */}
          {activeSection === 'professional' && (
            <GlassCard padding="lg" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h2 className="text-[17px] font-semibold text-ink">
                    Professional Credentials, Bio &amp; Expertise
                  </h2>
                  <p className="text-xs text-muted">
                    Biography, skills tags, research areas, office location, and portfolio link.
                  </p>
                </div>
                {!isEditing && (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Edit Fields</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Job Title / Role Title"
                  value={draft.designation || ''}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
                />
                <Input
                  label="Department / Academic Unit"
                  value={draft.department || ''}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                />
                <Input
                  label="Office Location / Cabin"
                  value={draft.office_location || ''}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, office_location: e.target.value })}
                />
                <Input
                  label="Website / Academic Portfolio URL"
                  value={draft.website_url || ''}
                  disabled={!isEditing}
                  onChange={(e) => setDraft({ ...draft, website_url: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink">Short Institutional Bio</label>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      (draft.bio || '').length > 300 ? 'text-danger' : 'text-muted'
                    }`}
                  >
                    {(draft.bio || '').length} / 300 characters
                  </span>
                </div>
                <textarea
                  rows={3}
                  disabled={!isEditing}
                  value={draft.bio || ''}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  className="glass w-full rounded-[12px] px-3.5 py-2.5 text-sm text-ink focus:border-accent disabled:opacity-70"
                />
              </div>

              {/* Interactive Skills Chips */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink">Skills &amp; Competencies</label>
                <div className="flex flex-wrap gap-2">
                  {(draft.skills || []).map((skill, idx) => (
                    <Chip
                      key={idx}
                      onRemove={
                        isEditing
                          ? () =>
                              setDraft({
                                ...draft,
                                skills: (draft.skills || []).filter((_, i) => i !== idx),
                              })
                          : undefined
                      }
                    >
                      {skill}
                    </Chip>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Add a skill (e.g., Cloud Security, Curriculum Design)..."
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (!newSkillInput.trim()) return;
                        setDraft({
                          ...draft,
                          skills: [...(draft.skills || []), newSkillInput.trim()],
                        });
                        setNewSkillInput('');
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Skill
                    </Button>
                  </div>
                )}
              </div>

              {/* Interactive Expertise Chips */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink">Areas of Expertise</label>
                <div className="flex flex-wrap gap-2">
                  {(draft.areas_of_expertise || []).map((exp, idx) => (
                    <Chip
                      key={idx}
                      active
                      onRemove={
                        isEditing
                          ? () =>
                              setDraft({
                                ...draft,
                                areas_of_expertise: (draft.areas_of_expertise || []).filter(
                                  (_, i) => i !== idx
                                ),
                              })
                          : undefined
                      }
                    >
                      {exp}
                    </Chip>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Add area of expertise..."
                      value={newExpertiseInput}
                      onChange={(e) => setNewExpertiseInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (!newExpertiseInput.trim()) return;
                        setDraft({
                          ...draft,
                          areas_of_expertise: [
                            ...(draft.areas_of_expertise || []),
                            newExpertiseInput.trim(),
                          ],
                        });
                        setNewExpertiseInput('');
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Expertise
                    </Button>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2 border-t border-line pt-4">
                  <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveProfile}>
                    Save Professional Profile
                  </Button>
                </div>
              )}
            </GlassCard>
          )}

          {/* 6. ACCOUNT & SECURITY SECTION */}
          {activeSection === 'security' && (
            <GlassCard padding="lg" className="space-y-6">
              <div className="border-b border-line pb-4">
                <h2 className="text-[17px] font-semibold text-ink">
                  Account Governance &amp; Security Posture
                </h2>
                <p className="text-xs text-muted">
                  Verification status, active credentials, and Authenticator App Two-Factor
                  Authentication.
                </p>
              </div>

              <DefinitionList
                onCopy={(lbl) => onToast(`Copied ${lbl} to clipboard.`)}
                items={[
                  {
                    label: 'Account Username',
                    value: `@${draft.username}`,
                    mono: true,
                    copyable: true,
                  },
                  {
                    label: 'Assigned Role',
                    value: ROLE_LABELS[draft.role],
                  },
                  {
                    label: 'Account Status',
                    value: draft.status.toUpperCase(),
                    mono: true,
                  },
                  {
                    label: 'Associated Institution',
                    value: `${draft.college_name || 'Main University Campus'}${
                      draft.college_code ? ` (${draft.college_code})` : ''
                    }`,
                  },
                  {
                    label: 'Account Created',
                    value: new Date(draft.created_at).toLocaleString('en-IN'),
                    mono: true,
                  },
                  {
                    label: 'Last Active Session',
                    value: new Date(draft.last_login || Date.now()).toLocaleString('en-IN'),
                    mono: true,
                  },
                ]}
              />

              <div className="divide-y divide-line rounded-[14px] border border-line bg-surface/50 px-4 py-2">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-ink">Email Address Verification</div>
                    <div className="text-xs text-muted">
                      Primary email ({draft.email}) is verified.
                    </div>
                  </div>
                  <Badge tone="success" dot>
                    Verified
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-ink">
                      SMS / Phone Number Verification
                    </div>
                    <div className="text-xs text-muted">
                      Primary mobile ({draft.phone}) is verified for urgent circulars.
                    </div>
                  </div>
                  <Badge tone="success" dot>
                    Verified
                  </Badge>
                </div>

                <Switch
                  checked={draft.totp_enabled}
                  onChange={(val) => {
                    setDraft({ ...draft, totp_enabled: val });
                    onUpdateProfile({ totp_enabled: val });
                    onToast(
                      `Two-Factor Authentication (TOTP) ${val ? 'enabled' : 'disabled'} for your account.`
                    );
                  }}
                  label="Authenticator App Two-Factor Authentication (TOTP)"
                  description="Require a 6-digit time-based one-time code when signing in from unrecognized devices."
                />
              </div>
            </GlassCard>
          )}

          {/* 7. PREFERENCES SECTION */}
          {activeSection === 'preferences' && (
            <GlassCard padding="lg" className="space-y-6">
              <div className="border-b border-line pb-4">
                <h2 className="text-[17px] font-semibold text-ink">
                  Interface, Regional &amp; Notification Preferences
                </h2>
                <p className="text-xs text-muted">
                  Customize your theme appearance, regional formatting, and alert channels.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Select
                  label="Interface Theme"
                  value={isDark ? 'dark' : 'light'}
                  onChange={(e) => {
                    const nextDark = e.target.value === 'dark';
                    if (nextDark !== isDark) {
                      onToggleTheme();
                    }
                    setDraft({
                      ...draft,
                      preferences: {
                        ...draft.preferences,
                        theme: e.target.value as 'light' | 'dark',
                      },
                    });
                  }}
                  options={[
                    { value: 'light', label: 'Light Mode (Cool Alabaster Glass)' },
                    { value: 'dark', label: 'Dark Mode (Deep Obsidian Glass)' },
                  ]}
                />
                <Select
                  label="Language & Locale"
                  value={draft.preferences?.language || 'English (IN / US)'}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      preferences: { ...draft.preferences, language: e.target.value },
                    })
                  }
                  options={[
                    { value: 'English (IN / US)', label: 'English (IN / US)' },
                    { value: 'English (UK)', label: 'English (UK)' },
                    { value: 'Hindi (हिन्दी)', label: 'Hindi (हिन्दी)' },
                  ]}
                />
                <Select
                  label="Time Zone"
                  value={draft.preferences?.timezone || 'Asia/Kolkata (IST · UTC+05:30)'}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      preferences: { ...draft.preferences, timezone: e.target.value },
                    })
                  }
                  options={[
                    {
                      value: 'Asia/Kolkata (IST · UTC+05:30)',
                      label: 'Asia/Kolkata (IST · UTC+05:30)',
                    },
                    { value: 'UTC (Coordinated Universal Time)', label: 'UTC (GMT+00:00)' },
                    { value: 'America/New_York (EST)', label: 'America/New_York (EST)' },
                  ]}
                />
              </div>

              <div className="divide-y divide-line border-t border-line pt-4">
                <Switch
                  checked={draft.preferences?.email_notifications ?? true}
                  onChange={(val) =>
                    setDraft({
                      ...draft,
                      preferences: { ...draft.preferences, email_notifications: val },
                    })
                  }
                  label="Email Circular & Fee Digests"
                  description="Receive official academic circulars, fee receipts, and leave updates via email."
                />
                <Switch
                  checked={draft.preferences?.dashboard_notifications ?? true}
                  onChange={(val) =>
                    setDraft({
                      ...draft,
                      preferences: { ...draft.preferences, dashboard_notifications: val },
                    })
                  }
                  label="Real-Time In-App Notification Bell"
                  description="Show instant unread badges in the top navigation bar."
                />
                <Switch
                  checked={draft.preferences?.security_alerts ?? true}
                  onChange={(val) =>
                    setDraft({
                      ...draft,
                      preferences: { ...draft.preferences, security_alerts: val },
                    })
                  }
                  label="Security & New Sign-In Alerts"
                  description="Alert immediately when your account is accessed from a new browser or IP."
                />
              </div>

              <div className="flex justify-end border-t border-line pt-4">
                <Button variant="primary" size="sm" onClick={handleSaveProfile}>
                  Save Preferences
                </Button>
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* =====================================================================
          BUILT-IN AVATAR STUDIO MODAL
         ===================================================================== */}
      <AvatarStudioModal
        open={avatarStudioOpen}
        onClose={() => setAvatarStudioOpen(false)}
        userName={draft.full_name}
        userRoleLabel={ROLE_LABELS[draft.role]}
        currentAvatarId={draft.avatar_id}
        currentCustomUrl={draft.custom_avatar_url || draft.photo_url}
        onSaveAvatar={({ avatarId, customAvatarUrl }) => {
          setDraft((prev) => ({
            ...prev,
            avatar_id: avatarId,
            custom_avatar_url: customAvatarUrl,
            photo_url: customAvatarUrl,
          }));
          onUpdateProfile({
            avatar_id: avatarId,
            custom_avatar_url: customAvatarUrl,
            photo_url: customAvatarUrl,
          });
          onToast('Profile avatar updated and synced across the portal.');
        }}
      />

      {/* =====================================================================
          5-STEP "CREATE NEW PROFILE" (ADD PROFILE) WIZARD MODAL
         ===================================================================== */}
      <ModalDialog
        open={createWizardOpen}
        onClose={() => setCreateWizardOpen(false)}
        maxWidth="2xl"
        title="Create New Institutional Profile"
        description={`Step ${wizardStep} of 5 — Guided multi-role profile onboarding with Built-In Avatar Studio.`}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-5 gap-2">
            {[
              { step: 1, label: '1. Basic Info' },
              { step: 2, label: '2. Role & Campus' },
              { step: 3, label: '3. Choose Avatar' },
              { step: 4, label: '4. Contact & Bio' },
              { step: 5, label: '5. Review' },
            ].map((item) => (
              <button
                key={item.step}
                type="button"
                onClick={() => setWizardStep(item.step)}
                className={`rounded-[10px] border px-2 py-1.5 text-center text-[11px] font-semibold transition-colors cursor-pointer ${
                  wizardStep === item.step
                    ? 'border-accent bg-accent text-white'
                    : wizardStep > item.step
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'border-line bg-surface/50 text-muted'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {wizError && (
            <div className="rounded-[10px] border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {wizError}
            </div>
          )}

          {wizardStep === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full Name *"
                placeholder="e.g., Dr. Ananya Deshmukh"
                value={wizName}
                onChange={(e) => setWizName(e.target.value)}
              />
              <Input
                label="Username (@handle)"
                placeholder="e.g., ananya.deshmukh"
                value={wizUsername}
                onChange={(e) => setWizUsername(e.target.value)}
                className="font-mono"
              />
              <Input
                label="Institutional Email Address *"
                type="email"
                placeholder="ananya.d@campus.edu"
                value={wizEmail}
                onChange={(e) => setWizEmail(e.target.value)}
              />
              <Input
                label="Primary Phone Number *"
                placeholder="+91 98450 12345"
                value={wizPhone}
                onChange={(e) => setWizPhone(e.target.value)}
              />
            </div>
          )}

          {wizardStep === 2 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Institutional Role *"
                value={wizRole}
                onChange={(e) => setWizRole(e.target.value as UserRole)}
                options={[
                  { value: 'student', label: 'Student' },
                  { value: 'faculty', label: 'Teacher / Faculty' },
                  { value: 'hod', label: 'Head of Department (HOD)' },
                  { value: 'accounts', label: 'Accounts Officer' },
                  { value: 'admin', label: 'College Admin' },
                  { value: 'super_admin', label: 'College Organizer / Super Admin' },
                  { value: 'parent', label: 'Parent / Guardian' },
                ]}
              />
              <Input
                label="Department / Office"
                value={wizDept}
                onChange={(e) => setWizDept(e.target.value)}
              />
              <Input
                label="College / Institution Name"
                value={wizCollegeName}
                onChange={(e) => setWizCollegeName(e.target.value)}
              />
              <Input
                label="Unique College Code"
                value={wizCollegeCode}
                onChange={(e) => setWizCollegeCode(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
              <div className="sm:col-span-2">
                <Input
                  label="Student Enrolment No / Employee ID"
                  placeholder="e.g., FAC-2026-089 or 26CSE104"
                  value={wizIdNo}
                  onChange={(e) => setWizIdNo(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted">
                Select a built-in institutional avatar for {wizName || 'this profile'}:
              </div>
              <div className="grid max-h-60 grid-cols-4 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-6">
                {BUILT_IN_AVATARS.map((av) => {
                  const selected = wizAvatarId === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setWizAvatarId(av.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-[12px] border p-2 transition-all cursor-pointer ${
                        selected
                          ? 'border-accent bg-accent/10 ring-2 ring-accent/25'
                          : 'border-line bg-surface/50 hover:border-accent/50'
                      }`}
                    >
                      <div className="h-11 w-11 overflow-hidden rounded-full border border-line">
                        <BuiltInAvatarGraphic
                          avatarId={av.id}
                          name={wizName || 'New User'}
                          className="h-full w-full"
                        />
                      </div>
                      <span className="w-full truncate text-center text-[10px] font-medium text-ink">
                        {av.label.split('·')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Role Title / Designation"
                value={wizDesignation}
                onChange={(e) => setWizDesignation(e.target.value)}
              />
              <Input
                label="City"
                value={wizCity}
                onChange={(e) => setWizCity(e.target.value)}
              />
              <Input
                label="State / Province"
                value={wizState}
                onChange={(e) => setWizState(e.target.value)}
              />
              <Input
                label="Country"
                value={wizCountry}
                onChange={(e) => setWizCountry(e.target.value)}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Short Biography"
                  placeholder="Brief academic or professional summary..."
                  value={wizBio}
                  onChange={(e) => setWizBio(e.target.value)}
                />
              </div>
            </div>
          )}

          {wizardStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-[14px] border border-line bg-surface/50 p-4">
                <Avatar name={wizName || 'New User'} size="xl" avatarId={wizAvatarId} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-ink">
                      {wizName || 'Unnamed User'}
                    </span>
                    <Badge tone="accent">{ROLE_LABELS[wizRole]}</Badge>
                  </div>
                  <div className="font-mono text-xs text-muted">
                    {wizEmail || 'No email specified'} · {wizPhone}
                  </div>
                  <div className="text-xs text-ink">
                    {wizDept} · {wizCollegeName} ({wizCollegeCode})
                  </div>
                </div>
              </div>

              <Switch
                checked={wizSwitchOnCreate}
                onChange={setWizSwitchOnCreate}
                label="Switch Active Session to New Profile Immediately"
                description="If enabled, you will immediately preview the portal as this newly created profile."
              />
            </div>
          )}

          <div className="flex items-center justify-between border-t border-line pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                wizardStep > 1 ? setWizardStep(wizardStep - 1) : setCreateWizardOpen(false)
              }
            >
              {wizardStep > 1 ? 'Previous Step' : 'Cancel'}
            </Button>

            {wizardStep < 5 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setWizError(null);
                  if (wizardStep === 1 && (!wizName.trim() || !wizEmail.includes('@'))) {
                    setWizError('Please enter a valid Full Name and Email Address to continue.');
                    return;
                  }
                  setWizardStep(wizardStep + 1);
                }}
              >
                Continue to Step {wizardStep + 1}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCreateProfileWizardSubmit}
              >
                <Check className="h-3.5 w-3.5" />
                <span>Create &amp; Save Profile</span>
              </Button>
            )}
          </div>
        </div>
      </ModalDialog>
    </div>
  );
};
