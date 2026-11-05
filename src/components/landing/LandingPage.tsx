import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BellRing,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  FileCheck2,
  FileSpreadsheet,
  KeyRound,
  Landmark,
  Layers,
  Lock,
  Menu,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { UserRole } from '../../types/portal';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import {
  Button,
  CampusLogo,
  ModalDialog,
  Reveal,
  StatusLabel,
  ThemeToggleButton,
} from '../ui/DesignSystem';

interface LandingPageProps {
  onOpenAuth: (
    mode: 'login' | 'signup' | 'accept-invite',
    roleOption?: 'student' | 'faculty' | 'super_admin' | 'admin'
  ) => void;
  onQuickRoleLogin: (role: UserRole) => void;
  onOpenDesignSystem: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

type RoleTabKey =
  | 'student'
  | 'parent'
  | 'faculty'
  | 'hod'
  | 'accounts'
  | 'admin'
  | 'super_admin';

const PLATFORM_ROLE_WORKSPACES: Record<
  RoleTabKey,
  {
    title: string;
    badge: string;
    summary: string;
    features: string[];
    metrics: { label: string; value: string; detail: string }[];
  }
> = {
  student: {
    title: 'Student Workspace',
    badge: 'Scholar Self-Service',
    summary:
      'Gives students a single, mobile-ready dashboard to monitor subject-wise attendance, download verified grade cards and fee receipts, book mentor consultations, and submit leave requests.',
    features: [
      'Real-time subject attendance tracker with configurable threshold alerts',
      'Credit-weighted SGPA & CGPA grade cards with one-click PDF export',
      'Transparent tuition fee ledger with instant digital receipt downloads',
      'Online leave applications and faculty mentor slot booking',
    ],
    metrics: [
      { label: 'Attendance Visibility', value: 'Real-Time', detail: 'Instant updates as classroom registers are saved' },
      { label: 'Document Exports', value: 'PDF Ready', detail: 'Verified receipts, grade reports & timetables' },
      { label: 'Mobile Experience', value: 'PWA Enabled', detail: 'Installable on any phone with offline caching' },
    ],
  },
  parent: {
    title: 'Parent & Guardian Workspace',
    badge: 'Guardian Transparency',
    summary:
      'Provides parents and guardians with dedicated, read-only visibility into their linked ward’s attendance standing, internal assessment scores, and tuition installment schedules.',
    features: [
      'Multi-child switcher for guardians with more than one enrolled ward',
      'Early attendance shortage indicators before examination eligibility locks',
      'Complete fee installment breakdown, concessions, and receipt history',
      'Direct access to institution-wide and department circulars',
    ],
    metrics: [
      { label: 'Permission Model', value: 'Read-Only', detail: 'Strict system-enforced guardian data isolation' },
      { label: 'Multi-Ward Support', value: 'Unified', detail: 'Switch between linked student profiles seamlessly' },
      { label: 'Fee History', value: '100% Itemised', detail: 'Downloadable official receipts for every payment' },
    ],
  },
  faculty: {
    title: 'Faculty Workspace',
    badge: 'Classroom & Evaluation',
    summary:
      'Built for instructors to mark 60-student attendance registers in under a minute, enter validated component marks, manage assigned mentees, and publish targeted class circulars.',
    features: [
      'Fast keyboard-assisted attendance register with automatic 24-hour lock',
      'Component-wise marks entry (Quiz, Mid-Term, Lab, End-Term) with ceiling validation',
      'Dedicated mentee roster with separate private and shared counseling notes',
      'Post-24-hour attendance correction workflow routed to the HOD',
    ],
    metrics: [
      { label: 'Register Speed', value: '< 45 Sec', detail: 'Bulk present/absent actions & keyboard shortcuts' },
      { label: 'Data Integrity', value: '24-Hr Lock', detail: 'Prevents unauthorized retrospective edits' },
      { label: 'Mentoring Logs', value: 'Dual-Privacy', detail: 'Private faculty notes isolated from student view' },
    ],
  },
  hod: {
    title: 'Head of Department Workspace',
    badge: 'Departmental Governance',
    summary:
      'Equips Department Chairs with cross-batch attendance analytics, attendance correction approval queues, faculty mentor balancing tools, and multi-day leave sign-off.',
    features: [
      'Department-wide attendance heatmaps and shortage intervention rosters',
      'Approval queue for post-24-hour faculty attendance correction requests',
      'Faculty mentor assignment and workload rebalancing across batches',
      'Second-tier approval workflow for extended student leave requests',
    ],
    metrics: [
      { label: 'Batch Analytics', value: 'Live Cohort', detail: 'Compare attendance and pass rates across semesters' },
      { label: 'Audit Control', value: 'Dual-Signoff', detail: 'Every retrospective register change is reviewed' },
      { label: 'Escalation Rule', value: 'Automated', detail: 'Multi-day leaves route automatically from Mentor' },
    ],
  },
  accounts: {
    title: 'Accounts & Finance Workspace',
    badge: 'Financial Ledger Engine',
    summary:
      'Delivers zero-drift financial management using integer-paise accounting for fee structures, batch assignments, scholarship concessions, sequential receipts, and formal reversals.',
    features: [
      'Configurable fee structures by program, batch, and installment schedule',
      'Sequential receipt generation across UPI, NEFT, card, cash, and cheque modes',
      'Append-only payment ledger where adjustments occur strictly via reversal rows',
      'Real-time collection vs. pending reconciliation with CSV audit exports',
    ],
    metrics: [
      { label: 'Arithmetic Precision', value: 'Integer Paise', detail: 'Zero floating-point rounding errors across ledgers' },
      { label: 'Ledger Rule', value: 'Append-Only', detail: 'Payments cannot be deleted; reversals link to originals' },
      { label: 'Audit Exports', value: 'Instant CSV', detail: 'Ready for statutory financial reconciliation' },
    ],
  },
  admin: {
    title: 'College Admin Workspace',
    badge: 'Operations & Onboarding',
    summary:
      'Centralizes institutional setup—enabling administrators to configure departments and courses, verify student sign-ups, dispatch role-bound staff invitations, and run bulk CSV imports.',
    features: [
      'Pending student verification queue to approve self-registered accounts',
      'Cryptographically signed role invitations for Faculty, HOD, and Accounts staff',
      'Master setup for departments, degree programs, batches, and subjects',
      'Bulk CSV importer with dry-run validation and row-level error reporting',
    ],
    metrics: [
      { label: 'Role Assignment', value: 'Server-Bound', detail: 'Roles are never self-selected during sign-up' },
      { label: 'Bulk Onboarding', value: 'Dry-Run CSV', detail: 'Preview and validate thousands of rows safely' },
      { label: 'Helpdesk Queue', value: 'Categorised', detail: 'Route and resolve student support tickets' },
    ],
  },
  super_admin: {
    title: 'Super Admin Workspace',
    badge: 'System & Audit Authority',
    summary:
      'Provides executive leadership and system owners with an immutable, append-only audit log of all sensitive platform events alongside global policy and threshold controls.',
    features: [
      'Immutable audit log tracking actor, role, IP, entity, and detailed context',
      'Global policy controls for attendance minimums, lock windows, and fine rates',
      'Platform-wide security and role-based access compliance checklist',
      'Cross-role governance oversight and administrative privilege management',
    ],
    metrics: [
      { label: 'Audit Trail', value: 'Immutable', detail: 'Database triggers block UPDATE or DELETE on logs' },
      { label: 'Admin Security', value: 'Mandatory 2FA', detail: 'TOTP verification enforced for privileged roles' },
      { label: 'Policy Engine', value: 'Centralised', detail: 'Configure thresholds once for the entire platform' },
    ],
  },
};

const PLATFORM_FEATURES = [
  {
    id: 'MOD-01',
    icon: Clock,
    title: 'Attendance & 24-Hour Lock Engine',
    description:
      'High-speed classroom register with bulk actions, keyboard shortcuts, and real-time student eligibility calculations. Registers lock automatically after 24 hours; retrospective edits require formal HOD approval.',
    tags: ['60-Second Register', '24h Auto-Lock', 'HOD Correction Flow'],
  },
  {
    id: 'MOD-02',
    icon: Award,
    title: 'Examinations & Credit-Weighted Grading',
    description:
      'Configure internal assessment components (Quizzes, Mid-Terms, Labs, End-Terms) with strict maximum-mark validation. Automatically computes credit-weighted SGPA, CGPA, and downloadable PDF grade cards.',
    tags: ['Component Validation', 'Auto SGPA/CGPA', 'PDF Transcripts'],
  },
  {
    id: 'MOD-03',
    icon: Landmark,
    title: 'Integer-Paise Fee & Receipt Ledger',
    description:
      'Eliminate rounding discrepancies by storing all tuition fees, concessions, and fines in exact integer paise. Issue sequentially numbered PDF receipts and handle corrections strictly through append-only reversals.',
    tags: ['Integer-Paise Math', 'Sequential Receipts', 'Formal Reversals'],
  },
  {
    id: 'MOD-04',
    icon: Users,
    title: 'Faculty Mentoring & Leave Workflows',
    description:
      'Assign faculty mentors to student cohorts with isolated private counseling notes and shared action items. Route student leave requests from Mentor to HOD automatically based on leave duration.',
    tags: ['Private Mentor Notes', 'Multi-Step Leave', 'Attendance Sync'],
  },
  {
    id: 'MOD-05',
    icon: BellRing,
    title: 'Scoped Circulars & Read Analytics',
    description:
      'Publish announcements targeted to the entire institution, specific departments, individual batches, or specific roles—complete with pinned priority banners and real-time read-receipt tracking.',
    tags: ['Audience Targeting', 'Read-Receipt Counts', 'Urgent Alerts'],
  },
  {
    id: 'MOD-06',
    icon: FileSpreadsheet,
    title: 'Bulk CSV Onboarding & Audit Governance',
    description:
      'Import students, subjects, and historical records via dry-run validated CSV uploads. Every sensitive action across roles, grades, and fees is recorded in an immutable Super Admin audit log.',
    tags: ['Dry-Run CSV Import', 'Invite-Only Staff', 'Append-Only Audit'],
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onQuickRoleLogin,
  onOpenDesignSystem,
  isDark,
  onToggleTheme,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedRoleTab, setSelectedRoleTab] = useState<RoleTabKey>('student');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | 'accessibility' | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');

  const activeRoleWorkspace = PLATFORM_ROLE_WORKSPACES[selectedRoleTab];

  // Smooth scroll helper with header offset for clean section navigation
  const scrollToSection = (sectionId: string) => {
    setMobileNavOpen(false);
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      const headerOffset = 80;
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(0, elementPosition - headerOffset),
        behavior: 'smooth',
      });
    }
  };

  // Track active section while scrolling
  useEffect(() => {
    const sectionIds = ['overview', 'features', 'roles', 'workflow', 'faq'];
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen w-full bg-paper text-ink selection:bg-accent selection:text-white">
      {/* Top Platform Announcement Bar */}
      <div className="w-full border-b border-line bg-surface">
        <div className="w-full px-6 py-2 sm:px-10 lg:px-16 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              <Layers className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
              Multi-Institution Campus Management Platform
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => scrollToSection('roles')}
              className="editorial-link text-muted hover:text-ink font-medium cursor-pointer"
            >
              Explore 7 Role Portals
            </button>

          </div>
        </div>
      </div>

      {/* Sticky Header with Logo, Smooth-Scroll Nav & Functional Light/Dark Mode Switcher */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--surface)] transition-colors duration-200">
        <div className="w-full px-6 py-3.5 sm:px-10 lg:px-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top of Campus Portal"
            className="text-left focus:outline-none cursor-pointer"
          >
            <CampusLogo subtitle="Institutional Operating System" />
          </button>

          {/* Desktop Smooth-Scroll Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden xl:flex items-center gap-7 text-sm font-medium"
          >
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'features', label: 'Platform Modules' },
              { id: 'roles', label: 'Role Workspaces' },
              { id: 'workflow', label: 'How It Works' },

              { id: 'faq', label: 'FAQ' },
            ].map((nav) => (
              <button
                key={nav.id}
                type="button"
                onClick={() => scrollToSection(nav.id)}
                className={`editorial-link py-1 transition-colors cursor-pointer ${
                  activeSection === nav.id ? 'text-accent font-semibold' : 'text-ink hover:text-accent'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>

          {/* Right Action Controls: Light/Dark Theme Switcher + Smooth Redirection Auth Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <ThemeToggleButton isDark={isDark} onToggle={onToggleTheme} />
            <Button variant="secondary" size="sm" onClick={() => onOpenAuth('login')}>
              Sign In
            </Button>
            <Button variant="primary" size="sm" onClick={() => onOpenAuth('signup')}>
              Get Started
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
          </div>

          {/* Mobile Header Controls */}
          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggleButton isDark={isDark} onToggle={onToggleTheme} compact />
            <button
              type="button"
              aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="rounded-[10px] border border-line bg-surface p-2 text-ink"
            >
              {mobileNavOpen ? (
                <X className="h-5 w-5" strokeWidth={1.75} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Smooth-Scroll Drawer */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-line bg-surface px-6 py-5 sm:hidden space-y-4"
            >
              <nav className="flex flex-col space-y-2.5 text-sm font-medium text-ink">
                {[
                  { id: 'overview', label: 'Platform Overview' },
                  { id: 'features', label: 'Platform Modules' },
                  { id: 'roles', label: 'Role Workspaces' },
                  { id: 'workflow', label: 'How It Works' },

                  { id: 'faq', label: 'FAQ' },
                ].map((nav) => (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => scrollToSection(nav.id)}
                    className="text-left py-1 text-ink hover:text-accent"
                  >
                    {nav.label}
                  </button>
                ))}
              </nav>
              <div className="flex flex-col gap-2 pt-3 border-t border-line">
                <Button variant="secondary" size="md" onClick={() => onOpenAuth('login')}>
                  Sign In to Portal
                </Button>
                <Button variant="primary" size="md" onClick={() => onOpenAuth('signup')}>
                  Get Started
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="w-full">
        {/* HERO SECTION — Universal College & University Operating System */}
        <section id="overview" className="w-full border-b border-line bg-paper">
          <div className="w-full px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
              {/* Left Column: Platform Value Proposition & Smooth Redirection Actions */}
              <Reveal className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-[8px] border border-line bg-surface px-3 py-1.5 text-xs font-medium text-accent">
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Built for Colleges, Universities & Academic Institutions</span>
                  </div>

                  <h1 className="mt-5 font-editorial font-normal text-ink text-3xl sm:text-5xl lg:text-[3.35rem] leading-[1.08] tracking-[-0.025em]">
                    One unified platform for campus academics, finance, and governance.
                  </h1>

                  <p className="mt-5 text-base sm:text-lg text-muted leading-relaxed max-w-3xl">
                    Replace fragmented spreadsheets and disconnected tools with a role-based institutional operating system. Purpose-built to unify classroom attendance, credit-weighted grading, integer-paise fee ledgers, faculty mentoring, and immutable audit trails for any campus.
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => onOpenAuth('login')}
                    >
                      Launch Portal Sign In
                      <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => scrollToSection('roles')}
                    >
                      Explore Role Workspaces
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => onOpenAuth('accept-invite')}
                    >
                      Accept Staff Invitation
                    </Button>
                  </div>
                </div>

                {/* 4 Platform Capability Pillars */}
                <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-line">
                  <div className="rounded-[10px] border border-line bg-surface p-4">
                    <div className="font-mono text-xs text-brass font-medium">ROLE ISOLATION</div>
                    <div className="mt-1 font-editorial text-2xl font-medium text-ink">8 Roles</div>
                    <div className="mt-0.5 text-xs text-muted">Granular Role-Based Access</div>
                  </div>
                  <div className="rounded-[10px] border border-line bg-surface p-4">
                    <div className="font-mono text-xs text-brass font-medium">CORE SUITE</div>
                    <div className="mt-1 font-editorial text-2xl font-medium text-ink">6 Modules</div>
                    <div className="mt-0.5 text-xs text-muted">Academics, Fees & Governance</div>
                  </div>
                  <div className="rounded-[10px] border border-line bg-surface p-4">
                    <div className="font-mono text-xs text-brass font-medium">FEE LEDGER</div>
                    <div className="mt-1 font-editorial text-2xl font-medium text-ink">Zero Drift</div>
                    <div className="mt-0.5 text-xs text-muted">Integer-Paise Accounting</div>
                  </div>
                  <div className="rounded-[10px] border border-line bg-surface p-4">
                    <div className="font-mono text-xs text-brass font-medium">ARCHITECTURE</div>
                    <div className="mt-1 font-editorial text-2xl font-medium text-ink">PWA Ready</div>
                    <div className="mt-0.5 text-xs text-muted">Installable & Offline-Capable</div>
                  </div>
                </div>
              </Reveal>

              {/* Right Column: 4 Role Account Creation & Access Options */}
              <Reveal delayMs={100} className="lg:col-span-5 flex flex-col justify-between">
                <div className="rounded-[12px] border border-line bg-surface p-6 sm:p-7 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-line pb-4">
                      <div>
                        <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
                          Role-Based Account Access
                        </div>
                        <h2 className="mt-0.5 font-editorial text-xl font-medium text-ink">
                          Create an Account or Sign In
                        </h2>
                      </div>
                      <StatusLabel tone="accent" label="4 Account Types" />
                    </div>

                    <p className="mt-3 text-xs text-muted leading-relaxed">
                      <strong>College Organizers</strong> register first and create their own <strong>Unique College Code</strong> to share with <strong>Students</strong>, <strong>Teachers / Faculty</strong>, and <strong>Admins</strong>:
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-2.5">
                      {(
                        [
                          {
                            role: 'super_admin' as const,
                            title: '1. College Organizer Account',
                            desc: 'Register your college first & create a custom Unique College Code to share with your Students, Teachers and Admins.',
                            badge: 'Creates College Code',
                          },
                          {
                            role: 'faculty' as const,
                            title: '2. Teacher / Faculty Account',
                            desc: 'Enter the Unique College Code shared by your College Organizer to register, mark attendance & enter grades.',
                            badge: 'Uses Organizer Code',
                          },
                          {
                            role: 'admin' as const,
                            title: '3. College Admin Account',
                            desc: 'Enter the Unique College Code shared by your College Organizer to manage batches, courses & circulars.',
                            badge: 'Uses Organizer Code',
                          },
                          {
                            role: 'student' as const,
                            title: '4. Student Account',
                            desc: 'Use the Unique College Code when creating your account, then sign in with your email and password for Organizer approval.',
                            badge: 'Organizer Approved',
                          },
                        ]
                      ).map((item) => (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => onOpenAuth('signup', item.role)}
                          className="group flex items-center justify-between gap-3 rounded-[10px] border border-line bg-paper p-3.5 text-left transition-all duration-180 hover:border-accent hover:-translate-y-0.5 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-ink group-hover:text-accent transition-colors">
                                {item.title}
                              </span>
                              <span className="rounded-[5px] border border-line bg-surface px-2 py-0.5 font-mono text-[10px] text-accent">
                                {item.badge}
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-muted">
                              {item.desc}
                            </div>
                          </div>
                          <ArrowUpRight
                            className="h-4 w-4 shrink-0 text-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                            strokeWidth={1.75}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direct Sign In & Architecture Bar */}
                  <div className="mt-5 pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenAuth('login', 'student')}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-accent hover:underline cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                      <span>Already registered? Sign in to your role portal →</span>
                    </button>

                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* SECTION 01: CORE PLATFORM MODULES (Balanced 3x2 Grid — Zero Wasted Space) */}
        <section id="features" className="w-full border-b border-line bg-surface">
          <div className="w-full px-6 py-12 sm:px-10 lg:px-16">
            <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-line">
              <div>
                <div className="font-mono text-xs font-medium text-brass uppercase tracking-wider">
                  01 · Comprehensive Feature Suite
                </div>
                <h2 className="mt-1 font-editorial text-2xl sm:text-3xl font-normal text-ink">
                  Six Integrated Modules Built for Any Campus
                </h2>
              </div>
              <p className="text-sm text-muted max-w-xl">
                Every module shares a single unified schema with real-time cross-module synchronization—eliminating data silos between classrooms and administration.
              </p>
            </Reveal>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PLATFORM_FEATURES.map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <Reveal key={feat.id} delayMs={idx * 50} className="h-full">
                    <article className="interactive-card rounded-[10px] border border-line bg-paper p-6 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-line bg-surface text-accent">
                            <IconComponent className="h-5 w-5" strokeWidth={1.75} />
                          </div>
                          <span className="font-mono text-xs font-semibold text-brass">
                            {feat.id}
                          </span>
                        </div>
                        <h3 className="mt-4 font-editorial text-xl font-medium text-ink">
                          {feat.title}
                        </h3>
                        <p className="mt-2.5 text-sm text-muted leading-relaxed">
                          {feat.description}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-line flex flex-wrap gap-1.5">
                        {feat.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-[6px] border border-line bg-surface px-2.5 py-1 font-mono text-[11px] font-medium text-ink"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 02: INTERACTIVE ROLE WORKSPACE EXPLORER WITH SMOOTH ANIMATION & REDIRECTION */}
        <section id="roles" className="w-full border-b border-line bg-paper">
          <div className="w-full px-6 py-12 sm:px-10 lg:px-16">
            <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-line">
              <div>
                <div className="font-mono text-xs font-medium text-brass uppercase tracking-wider">
                  02 · Role-Based Access Architecture
                </div>
                <h2 className="mt-1 font-editorial text-2xl sm:text-3xl font-normal text-ink">
                  Purpose-Built Workspaces for Every Institutional Role
                </h2>
              </div>

              {/* Role Selector Tabs */}
              <div
                role="tablist"
                aria-label="Platform Role Workspaces"
                className="flex flex-wrap gap-1.5 rounded-[10px] border border-line bg-surface p-1.5"
              >
                {(
                  [
                    ['student', 'Student'],
                    ['parent', 'Parent'],
                    ['faculty', 'Faculty'],
                    ['hod', 'HOD'],
                    ['accounts', 'Accounts'],
                    ['admin', 'Admin'],
                    ['super_admin', 'Super Admin'],
                  ] as [RoleTabKey, string][]
                ).map(([roleKey, label]) => {
                  const active = selectedRoleTab === roleKey;
                  return (
                    <button
                      key={roleKey}
                      role="tab"
                      aria-selected={active}
                      type="button"
                      onClick={() => setSelectedRoleTab(roleKey)}
                      className={`rounded-[8px] px-3.5 py-2 text-xs font-medium transition-all duration-180 cursor-pointer ${
                        active
                          ? 'bg-accent text-white shadow-xs'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Reveal>

            {/* Animated Role Workspace Panel */}
            <div className="mt-8 rounded-[12px] border border-line bg-surface p-6 sm:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedRoleTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center"
                >
                  <div className="lg:col-span-7 space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-[6px] border border-line bg-paper px-3 py-1 font-mono text-xs text-accent font-medium">
                      <Building2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span>{activeRoleWorkspace.badge}</span>
                    </div>

                    <div>
                      <h3 className="font-editorial text-2xl sm:text-3xl font-medium text-ink">
                        {activeRoleWorkspace.title}
                      </h3>
                      <p className="mt-2 text-sm sm:text-base text-muted leading-relaxed">
                        {activeRoleWorkspace.summary}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <div className="text-xs font-semibold uppercase tracking-wider text-ink">
                        Included Capabilities in This Workspace
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeRoleWorkspace.features.map((cap, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 rounded-[8px] border border-line bg-paper p-3.5 text-xs text-ink"
                          >
                            <CheckCircle2
                              className="h-4 w-4 text-success shrink-0 mt-0.5"
                              strokeWidth={1.75}
                            />
                            <span className="leading-relaxed">{cap}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => {
                          const mappedRole: 'student' | 'faculty' | 'super_admin' | 'admin' =
                            selectedRoleTab === 'student' || selectedRoleTab === 'parent'
                              ? 'student'
                              : selectedRoleTab === 'faculty' || selectedRoleTab === 'hod'
                                ? 'faculty'
                                : selectedRoleTab === 'super_admin'
                                  ? 'super_admin'
                                  : 'admin';
                          onOpenAuth('signup', mappedRole);
                        }}
                      >
                        Create {activeRoleWorkspace.title.replace(' Workspace', '')} Account
                        <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => {
                          const mappedRole: 'student' | 'faculty' | 'super_admin' | 'admin' =
                            selectedRoleTab === 'student' || selectedRoleTab === 'parent'
                              ? 'student'
                              : selectedRoleTab === 'faculty' || selectedRoleTab === 'hod'
                                ? 'faculty'
                                : selectedRoleTab === 'super_admin'
                                  ? 'super_admin'
                                  : 'admin';
                          onOpenAuth('login', mappedRole);
                        }}
                      >
                        Sign In to {activeRoleWorkspace.title}
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: 3 Role Architecture Highlights */}
                  <div className="lg:col-span-5 grid grid-cols-1 gap-4">
                    {activeRoleWorkspace.metrics.map((metric, idx) => (
                      <div
                        key={idx}
                        className="rounded-[10px] border border-line bg-paper p-5 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-xs font-semibold text-ink">{metric.label}</div>
                          <div className="mt-1 text-xs text-muted">{metric.detail}</div>
                        </div>
                        <div className="font-editorial text-xl sm:text-2xl font-semibold text-accent shrink-0 tabular-nums">
                          {metric.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* SECTION 03: HOW ANY INSTITUTION DEPLOYS CAMPUS PORTAL (3-Step Platform Flow) */}
        <section id="workflow" className="w-full border-b border-line bg-surface">
          <div className="w-full px-6 py-12 sm:px-10 lg:px-16">
            <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-line">
              <div>
                <div className="font-mono text-xs font-medium text-brass uppercase tracking-wider">
                  03 · Institutional Deployment Workflow
                </div>
                <h2 className="mt-1 font-editorial text-2xl sm:text-3xl font-normal text-ink">
                  How Any College Configures & Scales the Platform
                </h2>
              </div>
              <p className="text-sm text-muted max-w-xl">
                Designed for rapid onboarding across single-campus colleges and multi-school universities without custom engineering overhead.
              </p>
            </Reveal>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  step: 'STEP 01',
                  title: 'Configure Academic & Fee Structure',
                  body: 'Administrators define departments, degree programs, semester batches, subjects, and integer-paise fee structures—or import existing rosters via dry-run validated CSV files.',
                  actionLabel: 'Explore Admin Setup →',
                  targetRole: 'admin' as UserRole,
                },
                {
                  step: 'STEP 02',
                  title: 'Onboard Staff & Verify Enrolments',
                  body: 'Dispatch signed, role-bound invitations for Faculty, HODs, and Accounts officers. Students self-register with their enrolment number and activate upon admin verification.',
                  actionLabel: 'Try Onboarding Flow →',
                  targetRole: 'admin' as UserRole,
                },
                {
                  step: 'STEP 03',
                  title: 'Run Daily Operations with Full Auditability',
                  body: 'Faculty mark attendance and internal marks, Accounts issue sequential fee receipts, and leadership monitors real-time compliance backed by an immutable audit trail.',
                  actionLabel: 'View Audit Console →',
                  targetRole: 'super_admin' as UserRole,
                },
              ].map((s, idx) => (
                <Reveal key={s.step} delayMs={idx * 70} className="h-full">
                  <div className="interactive-card rounded-[10px] border border-line bg-paper p-6 flex flex-col justify-between h-full">
                    <div>
                      <span className="inline-block rounded-[6px] border border-line bg-surface px-2.5 py-1 font-mono text-xs font-semibold text-accent">
                        {s.step}
                      </span>
                      <h3 className="mt-4 font-editorial text-xl font-medium text-ink">
                        {s.title}
                      </h3>
                      <p className="mt-2.5 text-sm text-muted leading-relaxed">{s.body}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-line flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onQuickRoleLogin(s.targetRole)}
                        className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                      >
                        {s.actionLabel}
                      </button>
                      <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.75} />
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 04: ENTERPRISE SECURITY, DATABASE ISOLATION & PWA ARCHITECTURE */}


        {/* SECTION 05: PLATFORM FAQ & CALL TO ACTION */}
        <section id="faq" className="w-full border-b border-line bg-surface">
          <div className="w-full px-6 py-12 sm:px-10 lg:px-16">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <Reveal className="lg:col-span-4 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-xs font-medium text-brass uppercase tracking-wider">
                    04 · Platform Questions
                  </div>
                  <h2 className="mt-1 font-editorial text-2xl sm:text-3xl font-normal text-ink">
                    Frequently Asked Questions
                  </h2>
                  <p className="mt-3 text-sm text-muted leading-relaxed">
                    Learn how Campus Portal adapts to any institution’s academic structure, grading rules, and financial workflows.
                  </p>
                </div>

                <div className="mt-6 rounded-[10px] border border-line bg-paper p-5">
                  <div className="text-sm font-editorial font-medium text-ink">
                    Ready to explore the live platform?
                  </div>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Sign in to test any of the 7 active role workspaces or register a new account.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="primary" size="sm" onClick={() => onOpenAuth('login')}>
                      Open Portal Sign In
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => onQuickRoleLogin('student')}>
                      Launch Demo Workspace
                    </Button>
                  </div>
                </div>
              </Reveal>

              <Reveal delayMs={80} className="lg:col-span-8 divide-y divide-line rounded-[10px] border border-line bg-paper">
                {[
                  {
                    q: 'Can Campus Portal be configured for any college or university structure?',
                    a: 'Yes. Administrators can create custom departments, degree courses, semester batches, credit weights, attendance thresholds, and fee structures directly from the Admin & Super Admin consoles without modifying code.',
                  },
                  {
                    q: 'How does the platform prevent unauthorized role escalation during sign-up?',
                    a: 'Public sign-up never accepts a role parameter. Self-registered accounts are assigned the Student role with a Pending status by system automation until verified by the college administrator, while staff members join strictly through signed invitation tokens.',
                  },
                  {
                    q: 'How are attendance corrections and fee adjustments audited?',
                    a: 'Classroom attendance registers lock automatically 24 hours after the session; any change after 24 hours requires a formal request approved by the Head of Department. In the Finance module, payments are append-only and can only be adjusted via a linked reversal entry.',
                  },
                  {
                    q: 'Does the platform support mobile devices and offline access?',
                    a: 'Yes. Campus Portal is a compliant Progressive Web App (PWA) with responsive layouts for phones, tablets, and desktops, complete with offline read caching for timetables, notices, and attendance summaries.',
                  },
                ].map((item, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div key={item.q} className="p-5 sm:p-6">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="flex w-full items-center justify-between gap-4 text-left font-editorial text-base sm:text-lg font-medium text-ink cursor-pointer"
                      >
                        <span>{item.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-accent' : ''
                          }`}
                          strokeWidth={1.75}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="pt-3 text-sm text-muted leading-relaxed">{item.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      {/* PLATFORM FOOTER */}
      <footer className="w-full bg-paper text-ink">
        <div className="w-full px-6 py-12 sm:px-10 lg:px-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-12 pb-10 border-b border-line">
            <div className="lg:col-span-5 space-y-4">
              <CampusLogo subtitle="Institutional Operating System" />
              <p className="text-xs text-muted max-w-md leading-relaxed">
                A unified, role-based college and university management platform for attendance, examinations, integer-paise fee ledgers, faculty mentoring, and audit governance.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <ThemeToggleButton isDark={isDark} onToggle={onToggleTheme} />
                <Button variant="secondary" size="sm" onClick={() => onOpenAuth('login')}>
                  Portal Sign In
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-2.5 text-xs">
              <div className="font-mono font-semibold uppercase tracking-wider text-ink">
                Platform Modules
              </div>
              <ul className="space-y-2 text-muted">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('features')}
                    className="hover:text-ink cursor-pointer"
                  >
                    Attendance & 24h Lock
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('features')}
                    className="hover:text-ink cursor-pointer"
                  >
                    SGPA / CGPA Grading
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('features')}
                    className="hover:text-ink cursor-pointer"
                  >
                    Fee & Receipt Ledger
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('features')}
                    className="hover:text-ink cursor-pointer"
                  >
                    Mentoring & Leave Flow
                  </button>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-2 space-y-2.5 text-xs">
              <div className="font-mono font-semibold uppercase tracking-wider text-ink">
                Role Portals
              </div>
              <ul className="space-y-2 text-muted">
                <li>
                  <button
                    type="button"
                    onClick={() => onQuickRoleLogin('student')}
                    className="hover:text-ink cursor-pointer"
                  >
                    Student & Parent Views
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onQuickRoleLogin('faculty')}
                    className="hover:text-ink cursor-pointer"
                  >
                    Faculty & HOD Consoles
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onQuickRoleLogin('accounts')}
                    className="hover:text-ink cursor-pointer"
                  >
                    Accounts & Finance
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onQuickRoleLogin('admin')}
                    className="hover:text-ink cursor-pointer"
                  >
                    Admin & Super Admin
                  </button>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-3 space-y-2.5 text-xs">
              <div className="font-mono font-semibold uppercase tracking-wider text-ink">
                Compliance & Standards
              </div>
              <ul className="space-y-2 text-muted">
                <li>

                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal('privacy')}
                    className="hover:text-ink cursor-pointer"
                  >
                    Data Privacy & Isolation
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal('terms')}
                    className="hover:text-ink cursor-pointer"
                  >
                    Platform Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal('accessibility')}
                    className="hover:text-ink cursor-pointer"
                  >
                    WCAG 2.1 AA Accessibility
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
            <div>
              © {new Date().getFullYear()} Campus Portal · Multi-Institution Academic & Governance Platform.
            </div>
            <div className="font-mono text-[11px]">
              WCAG 2.1 AA · Row-Level Security · Offline-Ready PWA
            </div>
          </div>
        </div>
      </footer>

      {/* Platform Compliance Modals */}
      <ModalDialog
        open={legalModal !== null}
        onClose={() => setLegalModal(null)}
        title={
          legalModal === 'privacy'
            ? 'Data Privacy & Multi-Role Isolation'
            : legalModal === 'terms'
              ? 'Platform Terms of Service'
              : 'Accessibility Statement (WCAG 2.1 AA)'
        }
      >
        {legalModal === 'privacy' && (
          <div className="space-y-3 text-xs text-muted leading-relaxed">
            <p>
              Campus Portal enforces strict server-level Row-Level Security (RLS) across all institutional records. Students, parents, faculty, and administrative officers can query only the rows permitted by their verified role.
            </p>
            <p>
              Private faculty mentoring notes are stored in a dedicated restricted table that is never exposed to student or guardian queries.
            </p>
          </div>
        )}
        {legalModal === 'terms' && (
          <div className="space-y-3 text-xs text-muted leading-relaxed">
            <p>
              Role assignment is strictly server-controlled via administrator verification or cryptographically signed staff invitations. Every privileged action is recorded in an immutable, append-only audit log.
            </p>
          </div>
        )}
        {legalModal === 'accessibility' && (
          <div className="space-y-3 text-xs text-muted leading-relaxed">
            <p>
              Built to meet WCAG 2.1 AA contrast and keyboard navigation requirements in both Light Mode and Dark Mode. Every status badge pairs colour with an explicit text label, and reduced-motion preferences are respected automatically.
            </p>
          </div>
        )}
      </ModalDialog>
    </div>
  );
};
