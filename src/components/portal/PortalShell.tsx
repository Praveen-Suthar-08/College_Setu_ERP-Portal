import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HelpCircle,
  Home,
  Layers,
  Lock,
  LogOut,
  Menu,
  Receipt,
  Search,
  Settings,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { NoticeItem, Profile, ROLE_LABELS, StudentRecord, UserRole } from '../../types/portal';
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  CampusLogo,
  GlassCard,
  ThemeToggleButton,
} from '../ui/DesignSystem';

export interface NavItemConfig {
  id: string;
  label: string;
  code: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  allowedRoles: UserRole[];
}

export const ALL_PORTAL_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Overview',
    code: 'OVW-01',
    icon: Home,
    allowedRoles: ['student', 'parent', 'faculty', 'hod', 'accounts', 'admin', 'super_admin'],
  },
  {
    id: 'admin-colleges',
    label: 'All Colleges Workspace',
    code: 'COL-00',
    icon: Building2,
    allowedRoles: ['admin'],
  },
  {
    id: 'profile',
    label: 'My Profile',
    code: 'PRF-01',
    icon: UserCheck,
    allowedRoles: ['student', 'parent', 'faculty', 'hod', 'accounts', 'admin', 'super_admin'],
  },
  {
    id: 'attendance',
    label: 'Attendance Register',
    code: 'ATT-02',
    icon: Clock,
    allowedRoles: ['student', 'parent', 'faculty', 'hod', 'admin', 'super_admin'],
  },
  {
    id: 'results',
    label: 'Exams & Grade Cards',
    code: 'EXM-03',
    icon: GraduationCap,
    allowedRoles: ['student', 'parent', 'faculty', 'hod', 'admin', 'super_admin'],
  },
  {
    id: 'timetable',
    label: 'Academic Timetable',
    code: 'TMT-04',
    icon: Calendar,
    allowedRoles: ['student', 'parent', 'faculty', 'hod', 'admin', 'super_admin'],
  },
  {
    id: 'fees',
    label: 'Fee Ledger & Receipts',
    code: 'FIN-05',
    icon: Receipt,
    allowedRoles: ['student', 'parent', 'accounts', 'admin', 'super_admin'],
  },
  {
    id: 'notices',
    label: 'Circulars & Notices',
    code: 'CIR-06',
    icon: Bell,
    allowedRoles: ['student', 'parent', 'faculty', 'hod', 'accounts', 'admin', 'super_admin'],
  },
  {
    id: 'subjects',
    label: 'Subject Management',
    code: 'SUB-04',
    icon: BookOpen,
    allowedRoles: ['student', 'super_admin', 'admin'],
  },
  {
    id: 'teachers',
    label: 'Teacher Management',
    code: 'TCH-05',
    icon: GraduationCap,
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    id: 'mentor',
    label: 'Faculty Mentoring',
    code: 'MNT-07',
    icon: Users,
    allowedRoles: ['student', 'parent', 'faculty', 'hod', 'super_admin', 'admin'],
  },
  {
    id: 'leaves',
    label: 'Leave Applications',
    code: 'LVE-08',
    icon: FileText,
    allowedRoles: ['student', 'parent', 'faculty', 'hod', 'admin', 'super_admin'],
  },
  {
    id: 'assignments',
    label: 'Coursework & Labs',
    code: 'ASG-09',
    icon: BookOpen,
    allowedRoles: ['student', 'faculty', 'hod'],
  },
  {
    id: 'tickets',
    label: 'Grievance & Helpdesk',
    code: 'TKT-10',
    icon: HelpCircle,
    allowedRoles: ['student', 'parent', 'faculty', 'hod', 'admin', 'super_admin'],
  },
  {
    id: 'admin-users',
    label: 'User & Role Registry',
    code: 'ADM-11',
    icon: Layers,
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    id: 'audit-log',
    label: 'Platform Activity & Audit Log',
    code: 'AUD-13',
    icon: ShieldAlert,
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    id: 'settings',
    label: 'System Thresholds',
    code: 'CFG-14',
    icon: Settings,
    allowedRoles: ['admin', 'super_admin'],
  },
];

interface PortalShellProps {
  currentProfile: Profile;
  activeNav: string;
  unauthorizedAttemptRoute: string | null;
  onSelectNav: (navId: string) => void;
  onAttemptUnauthorizedRoute: (routeLabel: string | null) => void;
  onSwitchRole: (role: UserRole) => void;
  onSignOut: () => void;
  onOpenDesignSystem: () => void;
  currentTabId?: string;
  isDark: boolean;
  onToggleTheme: () => void;
  notices: NoticeItem[];
  onMarkNoticeRead: (noticeId: string) => void;
  students: StudentRecord[];
  children: React.ReactNode;
}

const SessionTimeoutBanner: React.FC<{ onExtend: () => void }> = React.memo(({ onExtend }) => {
  const [secondsLeft, setSecondsLeft] = useState(1795);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (secondsLeft > 120) return null;

  return (
    <div
      role="alert"
      className="shrink-0 border-b border-[var(--border)] bg-[var(--warning-soft)] px-4 py-2 text-xs text-[var(--text)] flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[var(--warning)]" strokeWidth={1.75} />
        <span>
          Idle session timeout warning: Your session will lock in{' '}
          <strong className="font-mono tabular-nums">{secondsLeft}s</strong>.
        </span>
      </div>
      <Button 
        variant="secondary" 
        size="sm" 
        onClick={() => {
          setSecondsLeft(1800);
          onExtend();
        }}
      >
        Extend Session
      </Button>
    </div>
  );
});

export const PortalShell: React.FC<PortalShellProps> = React.memo(({
  currentProfile,
  activeNav,
  unauthorizedAttemptRoute,
  onSelectNav,
  onAttemptUnauthorizedRoute,
  onSignOut,
  isDark,
  onToggleTheme,
  notices,
  onMarkNoticeRead,
  students,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('campus_portal_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('campus_portal_sidebar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const handleExtendSession = useCallback(() => {
    // Analytics or server heartbeat could go here
  }, []);

  const isUnapprovedStudent =
    currentProfile.role === 'student' && currentProfile.status !== 'active';

  const allowedNavItems = useMemo(() => 
    ALL_PORTAL_NAV_ITEMS.filter((item) => item.allowedRoles.includes(currentProfile.role)),
    [currentProfile.role]
  );
  
  const activeNavConfig = useMemo(() =>
    ALL_PORTAL_NAV_ITEMS.find((i) => i.id === activeNav) || allowedNavItems[0],
    [activeNav, allowedNavItems]
  );

  // Scope notices to the user's college code if set
  const scopedNotices = useMemo(() => notices.filter(
    (n) =>
      !n.college_code ||
      !currentProfile.college_code ||
      (n.college_code || '').trim().toUpperCase() === (currentProfile.college_code || '').trim().toUpperCase()
  ), [notices, currentProfile.college_code]);

  const unreadNotices = useMemo(() => scopedNotices.filter((n) => !n.is_read), [scopedNotices]);

  // Global search results (Notices, Nav Routes, Students if staff)
  const canSearchStudents = useMemo(() => 
    ['faculty', 'hod', 'accounts', 'admin', 'super_admin'].includes(currentProfile.role),
    [currentProfile.role]
  );

  const q = searchQuery.trim().toLowerCase();
  
  const matchedNavs = useMemo(() => 
    q ? allowedNavItems.filter((n) => n.label.toLowerCase().includes(q)) : [],
    [q, allowedNavItems]
  );

  const matchedNotices = useMemo(() => 
    q ? scopedNotices.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) : [],
    [q, scopedNotices]
  );

  const matchedStudents = useMemo(() => 
    q && canSearchStudents ? students.filter((s) => s.full_name.toLowerCase().includes(q) || s.enrolment_no.toLowerCase().includes(q)) : [],
    [q, canSearchStudents, students]
  );

  return (
    <div className="h-screen overflow-hidden w-full bg-[var(--bg)] text-[var(--text)] flex flex-col">
      {/* IDLE SESSION TIMEOUT BANNER */}
      <SessionTimeoutBanner onExtend={handleExtendSession} />


      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* =====================================================================
            SOLID SIDEBAR (252px expanded / 72px collapsed) — Fixed in viewport
           ===================================================================== */}
        <aside
          aria-label="Workspace Navigation"
          style={{ width: sidebarCollapsed ? '72px' : '252px' }}
          className="hidden lg:flex flex-col justify-between border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 ease-out shrink-0 h-full z-30 select-none overflow-x-hidden"
        >
          {/* Top Brand + Collapse Button */}
          <div className="flex flex-col min-h-0 flex-1">
            <div
              className={`flex h-16 items-center border-b border-[var(--border)] shrink-0 ${
                sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
              }`}
            >
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1 overflow-hidden">
                  <CampusLogo size="sm" subtitle="Academic Workspace" />
                </div>
              )}

              <button
                type="button"
                onClick={toggleSidebarCollapse}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent-text)] transition-colors cursor-pointer"
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            </div>

            {/* Navigation Items (40px height, 10px radius, 3px left accent bar when active) */}
            <nav
              className={`flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 ${
                sidebarCollapsed ? 'px-2.5' : 'px-3'
              }`}
            >
              {allowedNavItems.map((item) => {
                const Icon = item.icon;
                const locked = isUnapprovedStudent && item.id !== 'dashboard';
                const active =
                  (isUnapprovedStudent ? item.id === 'dashboard' : activeNav === item.id) &&
                  !unauthorizedAttemptRoute;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onAttemptUnauthorizedRoute(null);
                      if (isUnapprovedStudent) {
                        onSelectNav('dashboard');
                        return;
                      }
                      onSelectNav(item.id);
                    }}
                    title={
                      sidebarCollapsed
                        ? locked
                          ? `${item.label} (Locked — Awaiting College Organizer Approval)`
                          : item.label
                        : locked
                          ? 'Locked until College Organizer approves your account'
                          : undefined
                    }
                    aria-label={item.label}
                    className={`relative flex h-10 w-full items-center rounded-[10px] text-[13px] transition-all duration-150 ${
                      locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3 text-left'
                    } ${
                      active
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] font-semibold'
                        : 'text-[var(--text-2)] font-medium hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--accent)]"
                      />
                    )}
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 ${
                        active ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]'
                      }`}
                      strokeWidth={1.85}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate flex-1" title={item.label}>{item.label}</span>
                    )}
                    {!sidebarCollapsed && locked && (
                      <Lock
                        className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
                        strokeWidth={1.85}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom User Card (Solid surface-2, Avatar + Name + 1 Role Pill + Sign out) */}
          <div
            className={`border-t border-[var(--border)] shrink-0 ${
              sidebarCollapsed ? 'p-2.5' : 'p-3.5'
            }`}
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onAttemptUnauthorizedRoute(null);
                    onSelectNav(isUnapprovedStudent ? 'dashboard' : 'profile');
                  }}
                  title={`${currentProfile.full_name} · ${ROLE_LABELS[currentProfile.role]}`}
                  className="rounded-full p-0.5 hover:ring-2 hover:ring-[var(--accent)] transition-all cursor-pointer"
                >
                  <Avatar
                    name={currentProfile.full_name}
                    size="sm"
                    avatarId={currentProfile.avatar_id}
                    photoUrl={currentProfile.custom_avatar_url || currentProfile.photo_url}
                  />
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-2.5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    onAttemptUnauthorizedRoute(null);
                    onSelectNav(isUnapprovedStudent ? 'dashboard' : 'profile');
                  }}
                  className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden text-left cursor-pointer group"
                >
                  <Avatar
                    name={currentProfile.full_name}
                    size="sm"
                    avatarId={currentProfile.avatar_id}
                    photoUrl={currentProfile.custom_avatar_url || currentProfile.photo_url}
                  />
                  <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
                    <div
                      title={currentProfile.display_name || currentProfile.full_name}
                      className="flex-1 truncate w-full min-w-0 text-xs font-semibold text-[var(--text)] group-hover:text-[var(--accent-text)] transition-colors"
                    >
                      {currentProfile.display_name || currentProfile.full_name}
                    </div>
                    <div
                      title={ROLE_LABELS[currentProfile.role]}
                      className="flex-1 truncate w-full min-w-0 text-[11px] font-medium text-[var(--text-muted)]"
                    >
                      {ROLE_LABELS[currentProfile.role]}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onSignOut}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* =====================================================================
            MAIN CONTENT SHELL (Top Bar + Responsive Fluid Content Area)
           ===================================================================== */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* 64px Solid Top Bar (Breadcrumb | Search Input | Theme Toggle + Bell + Avatar) */}
          <header className="shrink-0 z-20 h-16 border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            {/* Left: Mobile Drawer Trigger + Breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                aria-label="Open mobile navigation"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text)] cursor-pointer"
              >
                <Menu className="h-4 w-4" strokeWidth={1.75} />
              </button>

              <Breadcrumbs
                items={[
                  {
                    label: currentProfile.college_name || 'Campus Portal',
                    onClick: () => {
                      onAttemptUnauthorizedRoute(null);
                      onSelectNav('dashboard');
                    },
                  },
                  {
                    label: unauthorizedAttemptRoute
                      ? 'Access Restricted'
                      : isUnapprovedStudent
                        ? 'Awaiting Organizer Approval'
                        : activeNavConfig?.label || 'Dashboard',
                    isCurrent: true,
                  },
                ]}
              />
            </div>

            {/* Center: Search Input */}
            <div className="relative flex-1 md:max-w-xs lg:max-w-md hidden md:block">
              <label htmlFor="portal-global-search" className="sr-only">
                Search notices, modules, or student records
              </label>
              <div className="relative flex items-center">
                <Search
                  className="h-4 w-4 text-[var(--text-muted)] absolute left-3.5 pointer-events-none"
                  strokeWidth={1.75}
                />
                <input
                  id="portal-global-search"
                  type="search"
                  value={searchQuery}
                  disabled={isUnapprovedStudent}
                  onFocus={() => !isUnapprovedStudent && setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 180)}
                  onChange={(e) => {
                    if (isUnapprovedStudent) return;
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  placeholder={
                    isUnapprovedStudent
                      ? 'Locked until College Organizer approves your account...'
                      : canSearchStudents
                        ? 'Search modules, notices, or students...'
                        : 'Search modules or announcements...'
                  }
                  className="h-[44px] w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] pl-10 pr-4 text-[14px] text-[var(--text)] placeholder:text-[var(--placeholder)] transition-all focus:border-[var(--accent)] disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {searchOpen && q.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl z-40 space-y-3 max-h-80 overflow-y-auto">
                  {matchedNavs.length === 0 &&
                    matchedNotices.length === 0 &&
                    matchedStudents.length === 0 && (
                      <div className="text-xs text-[var(--text-muted)] py-3 text-center">
                        No matching modules, announcements, or records for &ldquo;{searchQuery}&rdquo;.
                      </div>
                    )}

                  {matchedNavs.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 mb-1">
                        Modules
                      </div>
                      {matchedNavs.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onMouseDown={() => {
                            onAttemptUnauthorizedRoute(null);
                            onSelectNav(n.id);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-[10px] hover:bg-[var(--accent-soft)] text-xs flex items-center justify-between text-[var(--text)] cursor-pointer"
                        >
                          <span className="font-medium">{n.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {matchedStudents.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 mb-1">
                        Students
                      </div>
                      {matchedStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => {
                            onSelectNav('attendance');
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-[10px] hover:bg-[var(--accent-soft)] text-xs flex items-center justify-between text-[var(--text)] cursor-pointer"
                        >
                          <span>{s.full_name}</span>
                          <span className="font-mono text-[11px] text-[var(--accent-text)]">
                            {s.enrolment_no}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {matchedNotices.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 mb-1">
                        Announcements
                      </div>
                      {matchedNotices.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onMouseDown={() => {
                            onSelectNav('notices');
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-[10px] hover:bg-[var(--accent-soft)] text-xs truncate text-[var(--text)] cursor-pointer"
                        >
                          {n.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Theme Toggle + Notification Bell + User Avatar */}
            <div className="flex items-center gap-2.5">
              <ThemeToggleButton isDark={isDark} onToggle={onToggleTheme} compact />

              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  aria-label={`Notifications (${unreadNotices.length} unread)`}
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--accent-text)] transition-colors cursor-pointer"
                >
                  <Bell className="h-4 w-4" strokeWidth={1.85} />
                  {unreadNotices.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[var(--danger)] text-[#FFFFFF] font-mono text-[10px] flex items-center justify-center">
                      {unreadNotices.length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl z-40">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                      <span className="text-sm font-bold text-[var(--text)]">
                        Notifications &amp; Circulars
                      </span>
                      <Badge tone="accent">{unreadNotices.length} Unread</Badge>
                    </div>
                    <div className="divide-y divide-[var(--border)] max-h-72 overflow-y-auto my-2">
                      {scopedNotices.slice(0, 5).map((n) => (
                        <div key={n.id} className="py-2.5 flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              onSelectNav('notices');
                            }}
                            className="space-y-0.5 text-left min-w-0 flex-1 cursor-pointer group"
                          >
                            <div className="text-xs font-semibold text-[var(--text)] group-hover:text-[var(--accent-text)] truncate">
                              {n.title}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)]">
                              {n.category} · {n.created_by_name}
                            </div>
                          </button>
                          {!n.is_read ? (
                            <button
                              type="button"
                              onClick={() => onMarkNoticeRead(n.id)}
                              className="text-[11px] font-mono text-[var(--accent-text)] hover:underline shrink-0 cursor-pointer"
                            >
                              Mark read
                            </button>
                          ) : (
                            <CheckCircle2
                              className="h-3.5 w-3.5 text-[var(--success)] shrink-0 mt-0.5"
                              strokeWidth={1.75}
                            />
                          )}
                        </div>
                      ))}
                      {scopedNotices.length === 0 && (
                        <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                          No announcements published yet.
                        </div>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      disabled={isUnapprovedStudent}
                      onClick={() => {
                        setNotifOpen(false);
                        if (!isUnapprovedStudent) {
                          onSelectNav('notices');
                        }
                      }}
                    >
                      {isUnapprovedStudent
                        ? 'Locked Until Organizer Approval'
                        : 'Open Circulars & Notices'}
                    </Button>
                  </div>
                )}
              </div>

              {/* User Avatar Quick Profile Trigger */}
              <button
                type="button"
                onClick={() => {
                  onAttemptUnauthorizedRoute(null);
                  onSelectNav(isUnapprovedStudent ? 'dashboard' : 'profile');
                }}
                title={isUnapprovedStudent ? 'Awaiting Organizer Approval' : 'Open My Profile'}
                aria-label="Open My Profile"
                className="inline-flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-[var(--accent)] transition-all cursor-pointer"
              >
                <Avatar
                  name={currentProfile.full_name}
                  size="sm"
                  avatarId={currentProfile.avatar_id}
                  photoUrl={currentProfile.custom_avatar_url || currentProfile.photo_url}
                />
              </button>
            </div>
          </header>

          {/* MOBILE DRAWER */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <div
                className="fixed inset-0 bg-black/60"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="relative w-72 max-w-full bg-[var(--surface)] border-r border-[var(--border)] h-full flex flex-col justify-between p-4 z-10">
                <div className="space-y-4 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <CampusLogo size="sm" />
                    <button
                      type="button"
                      aria-label="Close mobile menu"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <X className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>

                  <nav className="space-y-1">
                    {allowedNavItems.map((item) => {
                      const Icon = item.icon;
                      const locked = isUnapprovedStudent && item.id !== 'dashboard';
                      const active = isUnapprovedStudent
                        ? item.id === 'dashboard'
                        : activeNav === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onAttemptUnauthorizedRoute(null);
                            onSelectNav(isUnapprovedStudent ? 'dashboard' : item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-xs font-medium ${
                            locked ? 'opacity-60 cursor-not-allowed' : ''
                          } ${
                            active
                              ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] font-semibold'
                              : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                          }`}
                        >
                          <span className="flex items-center gap-3 truncate">
                            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.85} />
                            <span className="truncate">{item.label}</span>
                          </span>
                          {locked && <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="border-t border-[var(--border)] pt-3 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onAttemptUnauthorizedRoute(null);
                      onSelectNav(isUnapprovedStudent ? 'dashboard' : 'profile');
                      setMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-2.5 min-w-0 overflow-hidden text-left cursor-pointer"
                  >
                    <Avatar
                      name={currentProfile.full_name}
                      size="sm"
                      avatarId={currentProfile.avatar_id}
                      photoUrl={currentProfile.custom_avatar_url || currentProfile.photo_url}
                    />
                    <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
                      <div
                        title={currentProfile.display_name || currentProfile.full_name}
                        className="flex-1 truncate w-full min-w-0 text-xs font-semibold text-[var(--text)]"
                      >
                        {currentProfile.display_name || currentProfile.full_name}
                      </div>
                      <div
                        title={ROLE_LABELS[currentProfile.role]}
                        className="flex-1 truncate w-full min-w-0 text-[11px] font-medium text-[var(--text-muted)]"
                      >
                        {ROLE_LABELS[currentProfile.role]}
                      </div>
                    </div>
                  </button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSignOut();
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN CONTENT BODY — Independently scrollable fluid content area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
            <main className="w-full max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
              {unauthorizedAttemptRoute ? (
                <GlassCard padding="lg" className="my-8 max-w-2xl mx-auto">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-[var(--danger-soft)] p-3 text-[var(--danger)]">
                      <ShieldAlert className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <div className="space-y-3">
                      <Badge tone="danger" dot>
                        HTTP 403 · Role Policy Restricted
                      </Badge>
                      <h1 className="font-editorial text-2xl font-bold text-[var(--text)]">
                        Access Denied to &ldquo;{unauthorizedAttemptRoute}&rdquo;
                      </h1>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                        Your active session role (
                        <strong className="text-[var(--text)]">
                          {ROLE_LABELS[currentProfile.role]}
                        </strong>
                        ) does not have permission to query or mutate records in this module.
                      </p>
                      <div className="pt-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onAttemptUnauthorizedRoute(null)}
                        >
                          Return to Authorized Workspace
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ) : (
                children
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
});
