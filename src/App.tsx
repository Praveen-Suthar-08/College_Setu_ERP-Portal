import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AccountRoleOption,
  AuthScreen,
  AuthScreenMode,
  RegisteredAccountPayload,
} from './components/auth/AuthModalAndViews';
import { LandingPage } from './components/landing/LandingPage';
import { AccountsAndAdminModule } from './components/portal/AccountsAndAdminModule';
import { AdminPlatformWorkspace } from './components/portal/AdminPlatformWorkspace';
import { ExaminationsAndGradeCardsModule } from './components/portal/academics/ExaminationsAndGradeCardsModule';
import { FacultyAndHodModule } from './components/portal/FacultyAndHodModule';
import { PortalShell } from './components/portal/PortalShell';
import { ProfileManagementView } from './components/portal/ProfileManagementView';
import { StudentAndParentModule } from './components/portal/StudentAndParentModule';
import { OfflineIndicator } from './components/pwa/PWAInstallButton';
import { DesignSystemShowcase } from './components/ui/DesignSystem';
import {
  DEFAULT_SYSTEM_SETTINGS,
  SEED_ASSIGNMENTS,
  SEED_ATTENDANCE_CORRECTIONS,
  SEED_ATTENDANCE_SESSIONS,
  SEED_AUDIT_LOGS,
  SEED_FACULTY,
  SEED_FEE_ASSIGNMENTS,
  SEED_FEE_STRUCTURES,
  SEED_LEAVE_REQUESTS,
  SEED_MENTOR_MEETINGS,
  SEED_NOTICES,
  SEED_PAYMENTS,
  SEED_PROFILES,
  SEED_STUDENTS,
  SEED_SUBJECTS,
  SEED_TICKETS,
  SEED_TIMETABLE,
} from './data/seedData';
import {
  AccountStatus,
  AssignmentItem,
  AttendanceCorrectionRequest,
  AttendanceSession,
  AuditLogEntry,
  Examination,
  FeeAssignment,
  FeeStructure,
  FullPortalJsonData,
  GrievanceTicket,
  LeaveApprovalStep,
  LeaveRequestItem,
  LeaveStatus,
  MentorMeeting,
  MentorRequest,
  NoticeItem,
  ParallelTabSessionInfo,
  PaymentRecord,
  Profile,
  ROLE_LABELS,
  StudentGradeCard,
  StudentRecord,
  Subject,
  SystemSettings,
  TimetableSlot,
  UserRole,
} from './types/portal';
import {
  FeeNotificationLog,
  evaluateAndGenerateFeeNotifications,
} from './utils/feeNotificationEngine';

type AppView = 'landing' | 'auth' | 'design' | 'portal';

const DEFAULT_COLLEGE_CODES: {
  code: string;
  collegeName: string;
  scope: string;
  updatedAt?: string;
}[] = [];
const TAB_ID_STORAGE_KEY = 'campus_portal_tab_id_v2';
const TAB_SESSION_STORAGE_KEY = 'campus_portal_tab_session_v2';
const LOCAL_JSON_BACKUP_KEY = 'campus_portal_json_db_backup_v2';

interface IsolatedTabSession {
  tabId: string;
  view: AppView;
  activeRole: UserRole;
  authenticatedProfileId: string | null;
  activeNav: string;
}

function getOrCreateIsolatedTabId(): string {
  try {
    const existing = sessionStorage.getItem(TAB_ID_STORAGE_KEY);
    if (existing) return existing;
    const generated = `tab-${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem(TAB_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `tab-${Math.random().toString(36).slice(2, 7)}`;
  }
}

function loadIsolatedTabSession(defaultTabId: string): IsolatedTabSession {
  try {
    let raw = sessionStorage.getItem(TAB_SESSION_STORAGE_KEY);
    if (!raw) {
      // Fallback to persisted session in localStorage so refreshing or reopening tab preserves authenticated identity
      raw = localStorage.getItem('campus_portal_active_session_v4');
    }
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<IsolatedTabSession>;
      return {
        tabId: parsed.tabId || defaultTabId,
        view:
          parsed.view === 'portal' ||
          parsed.view === 'auth' ||
          parsed.view === 'design' ||
          parsed.view === 'landing'
            ? parsed.view
            : 'landing',
        activeRole: parsed.activeRole || 'student',
        authenticatedProfileId: parsed.authenticatedProfileId || null,
        activeNav: parsed.activeNav || 'dashboard',
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    tabId: defaultTabId,
    view: 'landing',
    activeRole: 'student',
    authenticatedProfileId: null,
    activeNav: 'dashboard',
  };
}

function loadLocalJsonBackup(): Partial<FullPortalJsonData> | null {
  try {
    const raw = localStorage.getItem(LOCAL_JSON_BACKUP_KEY);
    if (raw) {
      return JSON.parse(raw) as Partial<FullPortalJsonData>;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function App() {
  // Unique per-tab identifier & per-tab isolated session so parallel browser tabs never collide
  const [currentTabId] = useState<string>(() => getOrCreateIsolatedTabId());
  const initialTabSession = useRef<IsolatedTabSession>(
    loadIsolatedTabSession(currentTabId)
  ).current;

  const [view, setView] = useState<AppView>(initialTabSession.view);
  const [authMode, setAuthMode] = useState<AuthScreenMode>('login');
  const [authRoleOption, setAuthRoleOption] = useState<AccountRoleOption>('student');
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('campus_portal_theme');
      if (saved === 'dark' || saved === 'light') return saved === 'dark';
      return document.documentElement.dataset.theme === 'dark';
    } catch {
      return false;
    }
  });

  // Per-Tab Active Role, Authenticated User & Navigation State (Isolated in sessionStorage)
  const [activeRole, setActiveRole] = useState<UserRole>(initialTabSession.activeRole);
  const [authenticatedProfileId, setAuthenticatedProfileId] = useState<string | null>(
    initialTabSession.authenticatedProfileId
  );
  const [activeNav, setActiveNav] = useState<string>(initialTabSession.activeNav);
  const [unauthorizedAttemptRoute, setUnauthorizedAttemptRoute] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initial backup before server fetch completes
  const initialBackup = useRef<Partial<FullPortalJsonData> | null>(loadLocalJsonBackup()).current;

  const [hasInitialFetchCompleted, setHasInitialFetchCompleted] = useState(false);
  const hasInitialFetchCompletedRef = useRef<boolean>(false);

  // Shared Real-Time Database Collections
  const [dbVersion, setDbVersion] = useState<number>(initialBackup?.version || 1);
  const [, setLastSyncedAt] = useState<string>(
    initialBackup?.updatedAt || new Date().toISOString()
  );
  const [, setActiveSessions] = useState<ParallelTabSessionInfo[]>(
    initialBackup?.activeSessions || []
  );

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    if (Array.isArray(initialBackup?.profiles) && initialBackup.profiles.length > 0) {
      return initialBackup.profiles;
    }
    return SEED_PROFILES;
  });

  const [students, setStudents] = useState<StudentRecord[]>(() => {
    if (Array.isArray(initialBackup?.students) && initialBackup.students.length > 0) {
      return initialBackup.students;
    }
    return SEED_STUDENTS;
  });

  const [validCollegeCodes, setValidCollegeCodes] = useState<
    { code: string; collegeName: string; scope: string; updatedAt?: string }[]
  >(() => {
    if (Array.isArray(initialBackup?.validCollegeCodes) && initialBackup.validCollegeCodes.length > 0) {
      return initialBackup.validCollegeCodes.map(c => ({
        ...c,
        code: (c.code || '').trim().toUpperCase(),
        collegeName: (c.collegeName || '').trim() || 'Institution Workspace'
      }));
    }
    return DEFAULT_COLLEGE_CODES;
  });

  const [subjects, setSubjects] = useState<Subject[]>(
    Array.isArray(initialBackup?.subjects) && initialBackup.subjects.length > 0
      ? initialBackup.subjects
      : SEED_SUBJECTS
  );
  const [timetable, setTimetable] = useState<TimetableSlot[]>(
    Array.isArray(initialBackup?.timetable) && initialBackup.timetable.length > 0
      ? initialBackup.timetable
      : SEED_TIMETABLE
  );
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>(
    Array.isArray(initialBackup?.attendanceSessions)
      ? initialBackup.attendanceSessions
      : SEED_ATTENDANCE_SESSIONS
  );
  const [corrections, setCorrections] = useState<AttendanceCorrectionRequest[]>(
    Array.isArray(initialBackup?.corrections)
      ? initialBackup.corrections
      : SEED_ATTENDANCE_CORRECTIONS
  );
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>(
    Array.isArray(initialBackup?.feeStructures)
      ? initialBackup.feeStructures
      : SEED_FEE_STRUCTURES
  );
  const [feeAssignments, setFeeAssignments] = useState<FeeAssignment[]>(
    Array.isArray(initialBackup?.feeAssignments)
      ? initialBackup.feeAssignments
      : SEED_FEE_ASSIGNMENTS
  );
  const [payments, setPayments] = useState<PaymentRecord[]>(
    Array.isArray(initialBackup?.payments) ? initialBackup.payments : SEED_PAYMENTS
  );
  const [notices, setNotices] = useState<NoticeItem[]>(
    Array.isArray(initialBackup?.notices) ? initialBackup.notices : SEED_NOTICES
  );
  const [mentorMeetings, setMentorMeetings] = useState<MentorMeeting[]>(
    Array.isArray(initialBackup?.mentorMeetings)
      ? initialBackup.mentorMeetings
      : SEED_MENTOR_MEETINGS
  );
  const [mentorRequests, setMentorRequests] = useState<MentorRequest[]>(
    Array.isArray((initialBackup as any)?.mentorRequests)
      ? (initialBackup as any).mentorRequests
      : []
  );
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>(
    Array.isArray(initialBackup?.leaveRequests)
      ? initialBackup.leaveRequests
      : SEED_LEAVE_REQUESTS
  );
  const [tickets, setTickets] = useState<GrievanceTicket[]>(
    Array.isArray(initialBackup?.tickets) ? initialBackup.tickets : SEED_TICKETS
  );
  const [assignments, setAssignments] = useState<AssignmentItem[]>(
    Array.isArray(initialBackup?.assignments) ? initialBackup.assignments : SEED_ASSIGNMENTS
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(
    Array.isArray(initialBackup?.auditLogs) ? initialBackup.auditLogs : SEED_AUDIT_LOGS
  );
  const [feeNotificationLogs, setFeeNotificationLogs] = useState<FeeNotificationLog[]>(
    Array.isArray(initialBackup?.feeNotificationLogs) ? initialBackup.feeNotificationLogs : []
  );
  const [settings, setSettings] = useState<SystemSettings>(
    initialBackup?.settings
      ? { ...DEFAULT_SYSTEM_SETTINGS, ...initialBackup.settings }
      : DEFAULT_SYSTEM_SETTINGS
  );
  const [examinations, setExaminations] = useState<Examination[]>(
    Array.isArray((initialBackup as any)?.examinations) ? (initialBackup as any).examinations : []
  );
  const [gradeCards, setGradeCards] = useState<StudentGradeCard[]>(
    Array.isArray((initialBackup as any)?.gradeCards) ? (initialBackup as any).gradeCards : []
  );

  // Refs to prevent infinite sync loops when applying remote updates
  const isApplyingRemoteRef = useRef<boolean>(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Persist per-tab isolated session in sessionStorage and localStorage for persistent login across refresh
  useEffect(() => {
    try {
      const tabSession: IsolatedTabSession = {
        tabId: currentTabId,
        view,
        activeRole,
        authenticatedProfileId,
        activeNav,
      };
      sessionStorage.setItem(TAB_SESSION_STORAGE_KEY, JSON.stringify(tabSession));
      if (authenticatedProfileId) {
        localStorage.setItem('campus_portal_active_session_v4', JSON.stringify(tabSession));
      } else if (view === 'landing') {
        localStorage.removeItem('campus_portal_active_session_v4');
      }
    } catch {
      // ignore storage errors
    }
  }, [currentTabId, view, activeRole, authenticatedProfileId, activeNav]);

  // Resolve this tab's isolated current profile without colliding with other tabs
  const currentProfile: Profile = useMemo(() => {
    const rawProfile: Profile | undefined = profiles.find((p) => p.id === authenticatedProfileId);
    
    // Improved fallback for hydration
    const isActuallyLoading = authenticatedProfileId && !rawProfile && !hasInitialFetchCompleted;

    const loadingProfile: Profile = {
      id: authenticatedProfileId || `guest-${currentTabId}`,
      role: activeRole,
      full_name: isActuallyLoading ? 'Loading Profile...' : 'Guest User',
      first_name: isActuallyLoading ? 'Loading' : 'Guest',
      last_name: '',
      display_name: isActuallyLoading ? 'Loading Profile...' : 'Guest User',
      username: 'guest',
      email: '',
      phone: '',
      college_name: isActuallyLoading ? 'Loading Workspace...' : 'Guest Workspace',
      college_code: '',
      status: 'pending',
      totp_enabled: false,
      created_at: new Date().toISOString(),
    };

    const base = rawProfile || loadingProfile;
    let resolvedCollegeName = base.college_name;
    let resolvedCollegeCode = (base.college_code || '').trim().toUpperCase();

    if (resolvedCollegeCode) {
      const match = validCollegeCodes.find(
        (c) => (c.code || '').trim().toUpperCase() === resolvedCollegeCode
      );
      if (match) {
        resolvedCollegeName = match.collegeName;
      }
    }

    const cleanFullName = base.full_name || (isActuallyLoading ? 'Loading Profile...' : 'Anonymous User');
    return {
      ...base,
      full_name: cleanFullName,
      display_name: cleanFullName,
      first_name: base.first_name || cleanFullName.split(/\s+/)[0] || 'User',
      college_code: resolvedCollegeCode,
      college_name: resolvedCollegeName || (isActuallyLoading ? 'Loading Workspace...' : 'Institution Workspace'),
    };
  }, [authenticatedProfileId, profiles, activeRole, currentTabId, validCollegeCodes, hasInitialFetchCompleted]);

  const authenticatedProfileIdRef = useRef(authenticatedProfileId);
  authenticatedProfileIdRef.current = authenticatedProfileId;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply a full database snapshot received from /api/db, SSE, or BroadcastChannel
  const applyRemoteDatabaseSnapshot = useCallback((remoteDb: Partial<FullPortalJsonData>) => {
    if (!remoteDb || typeof remoteDb !== 'object') return;

    setDbVersion((currentVersion) => {
      if (typeof remoteDb.version === 'number') {
        const incomingVersion = remoteDb.version;
        const currentAuthId = authenticatedProfileIdRef.current;

        if (incomingVersion < currentVersion && currentVersion !== 1) {
          return currentVersion;
        }
        
        isApplyingRemoteRef.current = true;
        if (applyTimerRef.current) clearTimeout(applyTimerRef.current);

        const updateIfChanged = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, nextVal: T) => {
          setter((prev) => {
            try {
              if (JSON.stringify(prev) === JSON.stringify(nextVal)) return prev;
            } catch { /* ignore */ }
            return nextVal;
          });
        };

        if (typeof remoteDb.updatedAt === 'string') setLastSyncedAt(remoteDb.updatedAt);
        if (Array.isArray(remoteDb.activeSessions)) updateIfChanged(setActiveSessions, remoteDb.activeSessions);

        if (Array.isArray(remoteDb.profiles) && remoteDb.profiles.length > 0) {
          setProfiles((prev) => {
            const incomingIds = new Set(remoteDb.profiles!.map((p) => p.id));
            const activeLocal = prev.find((p) => p.id === currentAuthId);
            const filteredPrev = prev.filter((p) => !incomingIds.has(p.id));
            const combined = [...remoteDb.profiles!, ...filteredPrev];
            const final = (activeLocal && !incomingIds.has(activeLocal.id)) ? [activeLocal, ...combined] : combined;
            try { if (JSON.stringify(prev) === JSON.stringify(final)) return prev; } catch { /* ignore */ }
            return final;
          });
        }
        if (Array.isArray(remoteDb.students) && remoteDb.students.length > 0) {
          setStudents((prev) => {
            const incomingIds = new Set(remoteDb.students!.map((s) => s.id));
            const filteredPrev = prev.filter((s) => !incomingIds.has(s.id));
            const combined = [...remoteDb.students!, ...filteredPrev];
            try { if (JSON.stringify(prev) === JSON.stringify(combined)) return prev; } catch { /* ignore */ }
            return combined;
          });
        }
        if (Array.isArray(remoteDb.validCollegeCodes) && remoteDb.validCollegeCodes.length > 0) {
          setValidCollegeCodes((prev) => {
            const incomingCodes = new Set(remoteDb.validCollegeCodes!.map((c) => (c.code || '').trim().toUpperCase()));
            const filteredPrev = prev.filter((c) => !incomingCodes.has((c.code || '').trim().toUpperCase()));
            const combined = [...remoteDb.validCollegeCodes!, ...filteredPrev];
            try { if (JSON.stringify(prev) === JSON.stringify(combined)) return prev; } catch { /* ignore */ }
            return combined;
          });
        }
        
        if (Array.isArray(remoteDb.subjects)) updateIfChanged(setSubjects, remoteDb.subjects);
        if (Array.isArray(remoteDb.timetable)) updateIfChanged(setTimetable, remoteDb.timetable);
        if (Array.isArray(remoteDb.attendanceSessions)) updateIfChanged(setAttendanceSessions, remoteDb.attendanceSessions);
        if (Array.isArray(remoteDb.corrections)) updateIfChanged(setCorrections, remoteDb.corrections);
        if (Array.isArray(remoteDb.feeStructures)) updateIfChanged(setFeeStructures, remoteDb.feeStructures);
        if (Array.isArray(remoteDb.feeAssignments)) updateIfChanged(setFeeAssignments, remoteDb.feeAssignments);
        if (Array.isArray(remoteDb.payments)) updateIfChanged(setPayments, remoteDb.payments);
        if (Array.isArray(remoteDb.notices)) updateIfChanged(setNotices, remoteDb.notices);
        if (Array.isArray(remoteDb.mentorMeetings)) updateIfChanged(setMentorMeetings, remoteDb.mentorMeetings);
        if (Array.isArray(remoteDb.leaveRequests)) updateIfChanged(setLeaveRequests, remoteDb.leaveRequests);
        if (Array.isArray(remoteDb.tickets)) updateIfChanged(setTickets, remoteDb.tickets);
        if (Array.isArray(remoteDb.assignments)) updateIfChanged(setAssignments, remoteDb.assignments);
        if (Array.isArray(remoteDb.auditLogs)) updateIfChanged(setAuditLogs, remoteDb.auditLogs);
        if (Array.isArray(remoteDb.feeNotificationLogs)) updateIfChanged(setFeeNotificationLogs, remoteDb.feeNotificationLogs);
        if (Array.isArray((remoteDb as any).examinations)) updateIfChanged(setExaminations, (remoteDb as any).examinations);
        if (Array.isArray((remoteDb as any).gradeCards)) updateIfChanged(setGradeCards, (remoteDb as any).gradeCards);
        if (Array.isArray((remoteDb as any).mentorRequests)) updateIfChanged(setMentorRequests, (remoteDb as any).mentorRequests);
        if (remoteDb.settings) {
          setSettings((prev) => {
            const next = { ...prev, ...remoteDb.settings };
            try { if (JSON.stringify(prev) === JSON.stringify(next)) return prev; } catch { /* ignore */ }
            return next;
          });
        }

        try { localStorage.setItem(LOCAL_JSON_BACKUP_KEY, JSON.stringify(remoteDb)); } catch { /* ignore */ }
        applyTimerRef.current = setTimeout(() => { isApplyingRemoteRef.current = false; }, 300);
        return incomingVersion;
      }
      return currentVersion;
    });
  }, []);

  // Fetch & load the latest database state from /api/db
  const fetchFromJsonDatabase = useCallback(async () => {
    try {
      const response = await fetch('/api/db', { cache: 'no-store' });
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.ok && data?.db) {
        applyRemoteDatabaseSnapshot(data.db);
        return data.db;
      }
    } finally {
      hasInitialFetchCompletedRef.current = true;
      setHasInitialFetchCompleted(true);
    }
    return null;
  }, [applyRemoteDatabaseSnapshot]);

  const lastSyncedHashRef = useRef<string>('');

  // Save/sync current state into /api/db/sync and broadcast to parallel tabs
  const syncStateToJsonDatabase = useCallback(
    async (overrides?: any) => {
      if (isApplyingRemoteRef.current) return;
      const payload = {
        tabId: currentTabId,
        profiles: overrides?.profiles || profiles,
        students: overrides?.students || students,
        validCollegeCodes: overrides?.validCollegeCodes || validCollegeCodes,
        subjects: overrides?.subjects || subjects,
        timetable: overrides?.timetable || timetable,
        attendanceSessions: overrides?.attendanceSessions || attendanceSessions,
        corrections: overrides?.corrections || corrections,
        feeStructures: overrides?.feeStructures || feeStructures,
        feeAssignments: overrides?.feeAssignments || feeAssignments,
        payments: overrides?.payments || payments,
        notices: overrides?.notices || notices,
        mentorMeetings: overrides?.mentorMeetings || mentorMeetings,
        leaveRequests: overrides?.leaveRequests || leaveRequests,
        tickets: overrides?.tickets || tickets,
        assignments: overrides?.assignments || assignments,
        auditLogs: overrides?.auditLogs || auditLogs,
        feeNotificationLogs: overrides?.feeNotificationLogs || feeNotificationLogs,
        settings: overrides?.settings || settings,
        examinations: overrides?.examinations || examinations,
        gradeCards: overrides?.gradeCards || gradeCards,
        mentorRequests: overrides?.mentorRequests || mentorRequests,
        deletedCollegeCodes: overrides?.deletedCollegeCodes,
        deletedIds: overrides?.deletedIds,
        tabSession: {
          tabId: currentTabId,
          profileId: authenticatedProfileId,
          fullName: view === 'portal' ? currentProfile.full_name : 'Guest',
          email: view === 'portal' ? currentProfile.email : '',
          role: view === 'portal' ? currentProfile.role : 'visitor',
          collegeCode: view === 'portal' ? currentProfile.college_code : undefined,
          view,
        },
      };

      let currentHash = '';
      try {
        currentHash = JSON.stringify({
          p: payload.profiles.length,
          s: payload.students.length,
          sub: payload.subjects.length,
          tt: payload.timetable.length,
          f: payload.feeAssignments.length,
          m: payload.payments.length,
          n: payload.notices.length,
          l: payload.leaveRequests.length,
          mm: payload.mentorMeetings.length,
          tk: payload.tickets.length,
          asg: payload.assignments.length,
          str: payload.feeStructures.length,
          a: payload.auditLogs.length,
          set: payload.settings,
          ex: (payload as any).examinations?.length || 0,
          mr: (payload as any).mentorRequests?.length || 0,
        });
      } catch { /* ignore */ }

      if (currentHash && currentHash === lastSyncedHashRef.current && !overrides) {
        return;
      }
      lastSyncedHashRef.current = currentHash;

      try { localStorage.setItem(LOCAL_JSON_BACKUP_KEY, JSON.stringify({ version: dbVersion, updatedAt: new Date().toISOString(), ...payload })); } catch { /* ignore */ }
      try { broadcastChannelRef.current?.postMessage({ type: 'db:updated', sourceTabId: currentTabId, db: payload }); } catch { /* ignore */ }

      try {
        const response = await fetch('/api/db/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.ok && data?.db?.version) setDbVersion((prev) => Math.max(prev, data.db.version));
        }
      } catch { /* ignore */ }
    },
    [assignments, attendanceSessions, auditLogs, authenticatedProfileId, corrections, currentProfile, currentTabId, dbVersion, examinations, feeAssignments, feeNotificationLogs, feeStructures, gradeCards, leaveRequests, mentorMeetings, mentorRequests, notices, payments, profiles, settings, students, subjects, tickets, timetable, validCollegeCodes, view]
  );

  useEffect(() => {
    void fetchFromJsonDatabase();
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('campus_portal_realtime_json_v2');
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data?.type === 'db:updated' && event.data.sourceTabId !== currentTabId) {
          applyRemoteDatabaseSnapshot(event.data.db);
        }
      };
    }
    if (typeof EventSource !== 'undefined') {
      const es = new EventSource('/api/db/stream');
      es.onmessage = (e) => {
        try {
          const p = JSON.parse(e.data);
          if ((p?.type === 'db:init' || p?.type === 'db:updated') && p.sourceTabId !== currentTabId) applyRemoteDatabaseSnapshot(p.db);
        } catch { /* ignore */ }
      };
      return () => es.close();
    }
    const poll = setInterval(() => { if (!isApplyingRemoteRef.current) void fetchFromJsonDatabase(); }, 5000);
    return () => clearInterval(poll);
  }, [currentTabId, applyRemoteDatabaseSnapshot, fetchFromJsonDatabase]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    if (isDark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    try { localStorage.setItem('campus_portal_theme', isDark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => { setToastMessage((prev) => (prev === msg ? null : prev)); }, 4500);
  }, []);

  const appendAuditLog = useCallback((action: string, entity: string, entityId: string, metadata: any) => {
    const entry: any = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      actor_id: currentProfile.id,
      actor_name: currentProfile.full_name,
      actor_email: currentProfile.email,
      actor_role: currentProfile.role,
      college_code: currentProfile.college_code || metadata?.college_code || 'PLATFORM',
      action,
      entity,
      entity_id: entityId,
      metadata: { ...metadata, tab_id: currentTabId },
      ip: '10.24.118.42',
      created_at: new Date().toISOString(),
    };
    setAuditLogs((prev) => [entry, ...prev]);
  }, [currentProfile.full_name, currentProfile.id, currentProfile.role, currentProfile.email, currentProfile.college_code, currentTabId]);

  const handleRegisterCollegeCode = useCallback((code: string | null | undefined, collegeName: string | null | undefined, overrideProfileId?: string) => {
    const cleanCode = (code || '').trim().toUpperCase();
    const cleanName = (collegeName || '').trim() || 'Institution Workspace';
    if (!cleanCode) return;
    const nowIso = new Date().toISOString();
    const targetId = overrideProfileId || currentProfile.id;
    setValidCollegeCodes((prev) => [{ code: cleanCode, collegeName: cleanName, scope: 'Authorized', updatedAt: nowIso }, ...prev.filter(c => c.code !== cleanCode)]);
    setProfiles((prev) => prev.map(p => p.id === targetId ? { ...p, college_code: cleanCode, college_name: cleanName, updated_at: nowIso } : p));
  }, [currentProfile.id]);

  const handleUpdateCurrentProfile = useCallback((patch: Partial<Profile>) => {
    const targetId = currentProfile.id;
    const nextFullName = (patch.full_name || currentProfile.full_name).trim();
    const nameParts = nextFullName.split(/\s+/);
    const normalized: Partial<Profile> = {
      ...patch,
      full_name: nextFullName,
      display_name: nextFullName,
      first_name: patch.first_name || nameParts[0] || 'User',
      last_name: patch.last_name !== undefined ? patch.last_name : nameParts.slice(1).join(' '),
      updated_at: new Date().toISOString(),
    };
    const nextProfiles = profiles.map(p => p.id === targetId ? { ...p, ...normalized } : p);
    setProfiles(nextProfiles);

    const nextStudents = students.map(s => s.profile_id === targetId ? {
      ...s,
      full_name: nextFullName,
      email: normalized.email || s.email,
      phone: normalized.phone || s.phone,
      enrolment_no: normalized.identifier_no || s.enrolment_no,
      department_code: normalized.department || s.department_code,
    } : s);
    setStudents(nextStudents);

    void fetch('/api/portal/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: targetId, patch: normalized }),
    }).catch(err => console.error('Failed to persist profile to server', err));

    void syncStateToJsonDatabase({ profiles: nextProfiles, students: nextStudents });
  }, [currentProfile, profiles, students, syncStateToJsonDatabase]);

  const handleMarkNoticeRead = useCallback((noticeId: string) => {
    setNotices((prev) => prev.map(n => n.id === noticeId ? { ...n, is_read: true, read_count: n.read_count + 1 } : n));
  }, []);

  const handleSwitchRole = useCallback((newRole: UserRole) => {
    const match = profiles.find(p => p.role === newRole && p.status === 'active' && p.email === currentProfile.email);
    if (match) { setAuthenticatedProfileId(match.id); setActiveRole(newRole); setActiveNav('dashboard'); setUnauthorizedAttemptRoute(null); showToast(`Switched to ${ROLE_LABELS[newRole]}.`); }
    else showToast(`No active ${ROLE_LABELS[newRole]} account found.`);
  }, [currentProfile.email, profiles, showToast]);

  const handleSignOut = useCallback(() => {
    appendAuditLog('AUTH_SIGNOUT', 'auth.sessions', currentProfile.id, {});
    setAuthenticatedProfileId(null);
    try {
      localStorage.removeItem('campus_portal_active_session_v4');
      sessionStorage.removeItem(TAB_SESSION_STORAGE_KEY);
    } catch { /* ignore */ }
    setView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [appendAuditLog, currentProfile.id]);

  const handleAuthenticateUser = useCallback((profileId: string, role: UserRole) => {
    setAuthenticatedProfileId(profileId);
    setActiveRole(role);
    setView('portal');
    setActiveNav('dashboard');
    appendAuditLog('AUTH_SIGNIN', 'auth.sessions', profileId, { role });
  }, [appendAuditLog]);

  const handleCreateAndAuthenticateUser = useCallback((payload: RegisteredAccountPayload) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newId = `prof-${payload.role}-${suffix}`;
    const now = new Date().toISOString();
    const nameParts = payload.full_name.trim().split(/\s+/);
    const newProfile: Profile = {
      id: newId,
      role: payload.role,
      full_name: payload.full_name.trim(),
      display_name: payload.full_name.trim(),
      first_name: nameParts[0] || 'User',
      last_name: nameParts.slice(1).join(' '),
      username: (payload.username || nameParts[0]).toLowerCase(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      status: payload.initial_status || (payload.role === 'student' ? 'pending' : 'active'),
      totp_enabled: payload.role === 'admin' || payload.role === 'super_admin',
      college_code: (payload.college_code || '').trim().toUpperCase(),
      college_name: payload.college_name || 'Institution Workspace',
      identifier_no: (payload.identifier_no || '').toUpperCase(),
      department: payload.role === 'student' ? 'CSE' : 'Academic Registry',
      password: payload.password,
      created_at: now,
      updated_at: now,
    };
    const nextProfiles = [newProfile, ...profiles];
    setProfiles(nextProfiles);

    let nextStudents = students;
    if (payload.role === 'student') {
      const newStudent: StudentRecord = {
        id: `stu-${suffix}`,
        profile_id: newId,
        full_name: payload.full_name.trim(),
        email: payload.email.trim(),
        phone: payload.phone.trim(),
        enrolment_no: (payload.identifier_no || `26STU${100 + students.length}`).toUpperCase(),
        batch_id: 'batch-2026',
        batch_label: 'B.Tech 2026 Cohort',
        department_id: 'dept-cse',
        department_code: 'CSE',
        current_semester: 6,
        mentor_id: 'fac-1',
        guardian_name: 'Registered Guardian',
        attendance_pct: 88,
        cgpa: 8.5,
        sgpa: 8.5,
        fee_status: 'paid',
        college_code: (payload.college_code || '').trim().toUpperCase(),
      };
      nextStudents = [newStudent, ...students];
      setStudents(nextStudents);

      void fetch('/api/portal/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => console.error('Server register failed', err));
    }

    setAuthenticatedProfileId(newId);
    setActiveRole(payload.role);
    setView('portal');
    setActiveNav('dashboard');
    appendAuditLog('AUTH_REGISTER', 'profiles', newId, { role: payload.role, college_code: payload.college_code });
    void syncStateToJsonDatabase({ profiles: nextProfiles, students: nextStudents });
  }, [profiles, students, appendAuditLog, syncStateToJsonDatabase]);

  const allCollegeStudents = useMemo(() => {
    const byProfileId = new Map<string, StudentRecord>();
    students.forEach((s) => byProfileId.set(s.profile_id, s));
    const synced = profiles.filter(p => p.role === 'student').map((p, idx) => {
      const e = byProfileId.get(p.id);
      if (e) return { ...e, full_name: p.full_name, email: p.email, phone: p.phone || e.phone, enrolment_no: p.identifier_no || e.enrolment_no, department_code: p.department || e.department_code, college_code: p.college_code || e.college_code };
      return { id: `stu-sync-${p.id}`, profile_id: p.id, full_name: p.full_name, email: p.email, phone: p.phone || '+91 98000 00000', enrolment_no: p.identifier_no || `26STU${101 + idx}`, batch_id: 'batch-2026', batch_label: 'B.Tech 2026 Cohort', department_id: 'dept-cse', department_code: p.department || 'CSE', current_semester: 6, mentor_id: 'fac-1', guardian_name: 'Registered Guardian', attendance_pct: 88, cgpa: 8.5, sgpa: 8.5, fee_status: 'paid' as const, college_code: p.college_code || '' };
    });
    const standalone = students.filter(s => !profiles.some(p => p.id === s.profile_id && p.role === 'student'));
    return [...synced, ...standalone];
  }, [profiles, students]);

  const handleSaveAttendanceSession = useCallback((session: AttendanceSession) => {
    const nextSessions = [session, ...attendanceSessions.filter(s => s.id !== session.id)];
    setAttendanceSessions(nextSessions);
    setStudents((prev) => prev.map(s => {
      const m = session.records[s.id]; if (!m) return s;
      const d = (m === 'Present' || m === 'On Duty') ? 1 : m === 'Absent' ? -2 : 0;
      return { ...s, attendance_pct: Math.min(100, Math.max(50, s.attendance_pct + d)) };
    }));

    void fetch('/api/portal/attendance-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
    }).catch(err => console.error('Server attendance save failed', err));

    void syncStateToJsonDatabase({ attendanceSessions: nextSessions });
  }, [attendanceSessions, syncStateToJsonDatabase]);

  const handleUpdateSubjectMarks = useCallback((code: string, stuId: string, comp: string, marks: number) => {
    setSubjects((prev) => prev.map(s => {
      if (s.code !== code) return s;
      const l = comp.toLowerCase();
      if (l.includes('internal 1')) return { ...s, internal_1_marks: marks };
      if (l.includes('internal 2')) return { ...s, internal_2_marks: marks };
      return { ...s, lab_marks: marks };
    }));
    setStudents((prev) => prev.map(s => s.id === stuId ? { ...s, cgpa: Number(Math.min(10, Math.max(6, s.cgpa + (marks >= 20 ? 0.05 : -0.03))).toFixed(2)) } : s));
  }, []);

  const handleUpdateAnyProfile = useCallback((id: string, patch: Partial<Profile>) => {
    setProfiles(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...patch, updated_at: new Date().toISOString() } : p);
      void syncStateToJsonDatabase({ profiles: next });
      return next;
    });
  }, [syncStateToJsonDatabase]);
  const handleUpdateStudentRecord = useCallback((id: string, patch: Partial<StudentRecord>) => setStudents(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s)), []);

  const handleCreateNewProfile = useCallback((p: Profile) => setProfiles(prev => [p, ...prev]), []);
  
  const handleSubmitLeave = useCallback((l: any) => {
    const newLeave: LeaveRequestItem = {
      ...l,
      id: `lv-${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'Pending Mentor',
      approvals: [],
    };
    const nextLeaves = [newLeave, ...leaveRequests];
    setLeaveRequests(nextLeaves);
    appendAuditLog('LEAVE_APPLICATION', 'leaves', newLeave.id, {
      applicant: newLeave.applicant_name,
      days: newLeave.days_count,
      requires_hod: newLeave.requires_hod,
    });
    void syncStateToJsonDatabase({ leaveRequests: nextLeaves });
    showToast(`Leave application submitted (${newLeave.days_count} day${newLeave.days_count > 1 ? 's' : ''}). Routed to Mentor.`);
  }, [leaveRequests, appendAuditLog, syncStateToJsonDatabase, showToast]);

  const handleCancelLeave = useCallback((id: string) => {
    const nextLeaves = leaveRequests.map(l => l.id === id ? { ...l, status: 'Cancelled' as const } : l);
    setLeaveRequests(nextLeaves);
    void syncStateToJsonDatabase({ leaveRequests: nextLeaves });
    showToast('Leave request cancelled.');
  }, [leaveRequests, syncStateToJsonDatabase, showToast]);

  const handleDecideLeave = useCallback((id: string, step: string, decision: 'approved' | 'rejected', comment: string) => {
    const nextLeaves = leaveRequests.map(l => {
      if (l.id !== id) return l;
      const isApproved = decision === 'approved';
      const newStepApproval: LeaveApprovalStep = {
        step: step as 'mentor' | 'hod',
        approver_name: currentProfile.full_name,
        decision,
        comment: comment || (isApproved ? 'Approved by advisor' : 'Rejected'),
        decided_at: new Date().toISOString(),
      };
      const existingApprovals = l.approvals || [];
      const updatedApprovals = [...existingApprovals.filter(a => a.step !== step), newStepApproval];

      let nextStatus: LeaveStatus = isApproved ? 'Approved' : 'Rejected';
      if (isApproved && l.requires_hod && step === 'mentor') {
        nextStatus = 'Pending HOD';
      }

      return {
        ...l,
        status: nextStatus,
        approvals: updatedApprovals,
      };
    });

    setLeaveRequests(nextLeaves);
    appendAuditLog('LEAVE_DECISION', 'leaves', id, { step, decision, decider: currentProfile.full_name, comment });

    void fetch('/api/portal/decide-leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leaveId: id,
        step,
        decision,
        comment: comment || (decision === 'approved' ? 'Approved' : 'Rejected'),
        deciderName: currentProfile.full_name,
      }),
    }).catch(err => console.error('Server decide leave failed', err));

    void syncStateToJsonDatabase({ leaveRequests: nextLeaves });
    showToast(`Leave ${decision === 'approved' ? 'Approved' : 'Rejected'} (${step.toUpperCase()}).`);
  }, [leaveRequests, currentProfile.full_name, appendAuditLog, syncStateToJsonDatabase, showToast]);

  const handleCreateTicket = useCallback((c: string, s: string, b: string) => {
    const newTicket: GrievanceTicket = {
      id: `tkt-${Date.now()}`,
      raised_by_id: currentProfile.id,
      raised_by_name: currentProfile.full_name,
      raised_by_role: currentProfile.role,
      category: c as any,
      subject: s,
      body: b,
      status: 'open',
      assigned_to_name: 'Academic Registry',
      college_code: currentProfile.college_code,
      created_at: new Date().toISOString(),
      replies: [],
    };
    const nextTickets = [newTicket, ...tickets];
    setTickets(nextTickets);
    appendAuditLog('TICKET_CREATED', 'helpdesk', newTicket.id, { subject: s, category: c });
    void fetch('/api/portal/ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: newTicket }),
    }).catch(err => console.error('Ticket persist failed', err));
    void syncStateToJsonDatabase({ tickets: nextTickets });
    showToast('Helpdesk ticket submitted successfully.');
  }, [currentProfile.id, currentProfile.full_name, currentProfile.role, currentProfile.college_code, tickets, appendAuditLog, syncStateToJsonDatabase, showToast]);

  const handleSubmitAssignment = useCallback((id: string, f: string) => {
    const nextAssignments = assignments.map(a => a.id === id ? { ...a, submitted: true, file_name: f } : a);
    setAssignments(nextAssignments);
    void syncStateToJsonDatabase({ assignments: nextAssignments });
    showToast('Course assignment submitted successfully.');
  }, [assignments, syncStateToJsonDatabase, showToast]);
  
  const handleReassignMentor = useCallback(async (studentId: string, mentorId: string, mentorName?: string) => {
    const student = allCollegeStudents.find((s) => s.id === studentId || s.profile_id === studentId);
    const resolvedName = mentorName || mentorId;

    const existingStudentIndex = students.findIndex((s) => s.id === studentId || s.profile_id === studentId);
    let nextStudents: StudentRecord[];
    if (existingStudentIndex >= 0) {
      nextStudents = students.map((s, idx) =>
        idx === existingStudentIndex
          ? { ...s, mentor_id: mentorId, mentor_name: resolvedName }
          : s
      );
    } else if (student) {
      nextStudents = [
        ...students,
        {
          id: student.id || `stu-${Date.now()}`,
          profile_id: student.profile_id || studentId,
          enrolment_no: student.enrolment_no || '26STU108',
          full_name: student.full_name,
          email: student.email,
          phone: student.phone || '',
          batch_id: 'batch-cse-6a',
          batch_label: student.batch_label || '2026 Cohort',
          department_id: 'dept-cse',
          department_code: student.department_code || 'CSE',
          current_semester: student.current_semester || 6,
          attendance_pct: student.attendance_pct ?? 85,
          cgpa: student.cgpa ?? 8.0,
          sgpa: student.sgpa ?? 8.0,
          fee_status: 'paid',
          mentor_id: mentorId,
          mentor_name: resolvedName,
          guardian_name: 'Registered Guardian',
        },
      ];
    } else {
      nextStudents = students;
    }

    const nextProfiles = profiles.map((p) =>
      p.id === studentId || (student && p.id === student.profile_id)
        ? { ...p, mentor_id: mentorId, mentor_name: resolvedName }
        : p
    );

    const nextRequests = mentorRequests.map((r) =>
      r.student_id === studentId || (student && r.enrolment_no === student.enrolment_no)
        ? { ...r, status: 'approved' as const, mentor_id: mentorId, mentor_name: resolvedName }
        : r
    );

    setStudents(nextStudents);
    setProfiles(nextProfiles);
    setMentorRequests(nextRequests);
    void syncStateToJsonDatabase({ students: nextStudents, profiles: nextProfiles, mentorRequests: nextRequests });
    appendAuditLog('MENTOR_ASSIGNED', 'mentor', studentId, { mentor_id: mentorId, mentor_name: resolvedName, student: student?.full_name });

    try {
      await fetch('/api/portal/reassign-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          mentorId,
          mentorName: resolvedName,
          assignedBy: currentProfile.full_name,
        }),
      });
    } catch (err) {
      console.error('Reassign mentor failed', err);
    }
    showToast(`Assigned mentor ${resolvedName} to student.`);
  }, [allCollegeStudents, students, profiles, mentorRequests, currentProfile.full_name, syncStateToJsonDatabase, appendAuditLog, showToast]);

  const handleSaveTeacher = useCallback(async (teacherData: Partial<Profile> & { full_name: string; email: string }) => {
    try {
      const emailLower = teacherData.email.trim().toLowerCase();
      const existing = profiles.find(
        (p) => p.id === teacherData.id || p.email.toLowerCase() === emailLower || (teacherData.identifier_no && p.identifier_no === teacherData.identifier_no)
      );
      let nextProfiles: Profile[];
      if (existing) {
        nextProfiles = profiles.map((p) =>
          p.id === existing.id
            ? { ...p, ...teacherData, updated_at: new Date().toISOString() }
            : p
        );
      } else {
        const newTeacher: Profile = {
          id: teacherData.id || `tch-${Date.now()}`,
          role: 'faculty',
          full_name: teacherData.full_name,
          display_name: teacherData.full_name,
          first_name: teacherData.full_name.split(' ')[0],
          last_name: teacherData.full_name.split(' ').slice(1).join(' '),
          username: teacherData.identifier_no ? teacherData.identifier_no.toLowerCase() : teacherData.full_name.toLowerCase().replace(/\s+/g, '.'),
          email: teacherData.email.trim(),
          phone: teacherData.phone || '',
          status: (teacherData.status as any) || 'active',
          totp_enabled: false,
          college_code: currentProfile.college_code,
          college_name: currentProfile.college_name,
          identifier_no: teacherData.identifier_no || `TCH-${Math.floor(100 + Math.random() * 900)}`,
          department: teacherData.department || 'General Academics',
          designation: (teacherData as any).designation || 'Faculty Instructor',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        nextProfiles = [newTeacher, ...profiles];
      }
      setProfiles(nextProfiles);
      void syncStateToJsonDatabase({ profiles: nextProfiles });
      appendAuditLog('TEACHER_SAVED', 'profiles', teacherData.id || 'new', { name: teacherData.full_name, email: teacherData.email });
      showToast(`Teacher ${teacherData.full_name} saved successfully.`);
      return true;
    } catch (err) {
      console.error('Failed to save teacher', err);
      showToast('Failed to save teacher.');
      return false;
    }
  }, [profiles, currentProfile.college_code, currentProfile.college_name, appendAuditLog, syncStateToJsonDatabase, showToast]);

  const handleRequestMentor = useCallback(async (mentorId: string, mentorName: string, notes?: string) => {
    const student = allCollegeStudents.find((s) => s.profile_id === currentProfile.id || s.id === currentProfile.id) || {
      id: currentProfile.id,
      full_name: currentProfile.full_name,
      enrolment_no: currentProfile.identifier_no || 'N/A',
      college_code: currentProfile.college_code || '',
    };
    try {
      const res = await fetch('/api/portal/mentor-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.full_name,
          enrolmentNo: student.enrolment_no,
          mentorId,
          mentorName,
          collegeCode: currentProfile.college_code || '',
          notes,
        }),
      });
      const data = await res.json();
      if (data.request) {
        setMentorRequests((prev) => [data.request, ...prev.filter((r) => r.id !== data.request.id)]);
      }
      showToast(`Mentorship request submitted to ${mentorName}.`);
    } catch (err) {
      console.error('Mentor request failed', err);
      showToast('Failed to submit mentor request');
    }
  }, [allCollegeStudents, currentProfile, showToast]);

  const handleSaveSubject = useCallback(async (sub: Partial<Subject> & { code: string; name: string }) => {
    try {
      const res = await fetch('/api/portal/subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: { ...sub, college_code: currentProfile.college_code } }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save subject');
        return false;
      }
      if (data.subject) {
        setSubjects((prev) => [data.subject, ...prev.filter((s) => s.id !== data.subject.id)]);
      }
      showToast(`Subject ${sub.code} saved successfully.`);
      return true;
    } catch (err) {
      console.error('Subject save failed', err);
      showToast('Error saving subject');
      return false;
    }
  }, [currentProfile.college_code, showToast]);

  const handleRequestCorrection = useCallback((r: Omit<AttendanceCorrectionRequest, 'id' | 'status' | 'created_at'>) => setCorrections(prev => [{ ...r, id: `c-${Date.now()}`, status: 'pending', created_at: new Date().toISOString() } as AttendanceCorrectionRequest, ...prev]), []);
  const handleReviewCorrection = useCallback((id: string, d: 'approved' | 'rejected') => setCorrections(prev => prev.map(c => c.id === id ? { ...c, status: d } : c)), []);
  const handleAddMentorMeeting = useCallback((m: Omit<MentorMeeting, 'id'>) => setMentorMeetings(prev => [{ ...m, id: `mm-${Date.now()}` } as MentorMeeting, ...prev]), []);
  
  const handleCreateNotice = useCallback((t: string, b: string, c: NoticeItem['category'], s: NoticeItem['audience_scope'], tar: string) => {
    const newNotice: NoticeItem = {
      id: `n-${Date.now()}`,
      title: t,
      body: b,
      category: c,
      audience_scope: s,
      audience_target: tar,
      college_code: currentProfile.college_code,
      college_name: currentProfile.college_name,
      publish_at: new Date().toISOString(),
      created_by_name: currentProfile.full_name,
      created_by_role: currentProfile.role,
      read_count: 0,
      total_target_count: 50,
      is_read: false,
      is_public: true,
      pinned: false,
    };
    const nextNotices = [newNotice, ...notices];
    setNotices(nextNotices);
    appendAuditLog('NOTICE_PUBLISHED', 'notices', newNotice.id, { title: t, scope: s, target: tar });
    void syncStateToJsonDatabase({ notices: nextNotices });
    showToast(`Circular "${t}" published to ${tar}.`);
  }, [currentProfile.college_code, currentProfile.college_name, currentProfile.full_name, currentProfile.role, notices, appendAuditLog, syncStateToJsonDatabase, showToast]);
  
  const handleCreateAssignment = useCallback((a: Omit<AssignmentItem, 'id' | 'submitted'>) => {
    const newAssignment = { ...a, id: `a-${Date.now()}`, submitted: false } as AssignmentItem;
    const next = [newAssignment, ...assignments];
    setAssignments(next);
    void syncStateToJsonDatabase({ assignments: next });
    showToast('Assignment created successfully.');
  }, [assignments, syncStateToJsonDatabase, showToast]);

  const handleResolveTicket = useCallback((id: string, res: string) => {
    const nextTickets = tickets.map(t => t.id === id ? { ...t, status: 'resolved' as const, resolution_note: res } : t);
    setTickets(nextTickets);
    appendAuditLog('TICKET_RESOLVED', 'helpdesk', id, { resolution: res });
    void syncStateToJsonDatabase({ tickets: nextTickets });
    showToast('Ticket marked as resolved.');
  }, [tickets, appendAuditLog, syncStateToJsonDatabase, showToast]);
  
  const handleVerifyPendingStudent = useCallback((id: string, decision: 'active' | 'suspended' = 'active') => {
    const nextProfiles = profiles.map(p => {
      if (p.id === id) {
        return { ...p, status: decision as AccountStatus };
      }
      return p;
    });
    setProfiles(nextProfiles);
    appendAuditLog('STUDENT_APPROVAL', 'profile', id, { decision, approved_by: currentProfile.full_name });

    void fetch('/api/portal/verify-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: id, status: decision, reviewer: currentProfile.full_name }),
    }).catch(err => console.error('Server verify-student failed', err));

    void syncStateToJsonDatabase({ profiles: nextProfiles });
    showToast(`Student registration request ${decision === 'active' ? 'Approved' : 'Rejected'}.`);
  }, [profiles, appendAuditLog, currentProfile.full_name, syncStateToJsonDatabase, showToast]);

  const handleInviteUser = useCallback((e: string, f: string, r: UserRole) => {
    const pid = `p-${Date.now()}`;
    const newP = { id: pid, role: r, full_name: f, email: e, status: 'active' as const, college_code: currentProfile.college_code || '', college_name: currentProfile.college_name || '' } as Profile;
    const nextProfiles = [newP, ...profiles];
    setProfiles(nextProfiles);
    void syncStateToJsonDatabase({ profiles: nextProfiles });
  }, [currentProfile.college_code, currentProfile.college_name, profiles, syncStateToJsonDatabase]);
  
  const lastActionTimestampRef = useRef<number>(0);

  const handleAddFeeStructure = useCallback((s: Omit<FeeStructure, 'id'>) => {
    const now = Date.now();
    if (now - lastActionTimestampRef.current < 400) return; // 400ms debounce guard
    lastActionTimestampRef.current = now;

    const titleClean = (s.title || '').trim().toLowerCase();
    const existingIndex = feeStructures.findIndex(
      (item) => item && (item.title || '').trim().toLowerCase() === titleClean && item.category === s.category
    );
    let next: FeeStructure[];
    if (existingIndex >= 0) {
      next = [...feeStructures];
      next[existingIndex] = { ...next[existingIndex], ...s };
    } else {
      next = [{ ...s, id: `f-${Date.now()}` } as FeeStructure, ...feeStructures];
    }
    setFeeStructures(next);
    void syncStateToJsonDatabase({ feeStructures: next });
  }, [feeStructures, syncStateToJsonDatabase]);

  const handleAssignFeeToStudent = useCallback((a: Omit<FeeAssignment, 'id'>) => {
    const now = Date.now();
    if (now - lastActionTimestampRef.current < 400) return;
    lastActionTimestampRef.current = now;

    const titleClean = (a.title || '').trim().toLowerCase();
    const existingIndex = feeAssignments.findIndex((item) => {
      if (!item) return false;
      const isSameStudent =
        (a.student_id && item.student_id === a.student_id) ||
        (a.enrolment_no && item.enrolment_no && item.enrolment_no === a.enrolment_no) ||
        (a.student_name && item.student_name && item.student_name === a.student_name);

      const isSameStructure =
        (a.structure_id && item.structure_id && item.structure_id === a.structure_id) ||
        (item.title || '').trim().toLowerCase() === titleClean;

      return isSameStudent && isSameStructure;
    });

    let next: FeeAssignment[];
    if (existingIndex >= 0) {
      next = [...feeAssignments];
      const existing = next[existingIndex];
      next[existingIndex] = {
        ...existing,
        ...a,
        id: existing.id,
        paid_paise: Math.max(existing.paid_paise || 0, a.paid_paise || 0),
      };
    } else {
      next = [{ ...a, id: `fa-${Date.now()}` } as FeeAssignment, ...feeAssignments];
    }
    setFeeAssignments(next);
    void syncStateToJsonDatabase({ feeAssignments: next });
  }, [feeAssignments, syncStateToJsonDatabase]);

  const handleRunFeeNotificationAudit = useCallback(() => {
    const result = evaluateAndGenerateFeeNotifications({
      feeAssignments,
      students: allCollegeStudents,
      profiles,
      payments,
      existingNotices: notices,
      existingLogs: feeNotificationLogs,
      triggerSource: 'organizer_manual_trigger',
    });

    const nextNotices = result.newNotices.length > 0 ? [...result.newNotices, ...notices] : notices;
    const nextLogs = result.newLogs.length > 0 ? [...result.newLogs, ...feeNotificationLogs] : feeNotificationLogs;
    const nextAudit = result.auditEntries.length > 0 ? [...result.auditEntries, ...auditLogs] : auditLogs;

    if (result.newNotices.length > 0) setNotices(nextNotices);
    if (result.newLogs.length > 0) setFeeNotificationLogs(nextLogs);
    if (result.auditEntries.length > 0) setAuditLogs(nextAudit);

    void syncStateToJsonDatabase({
      notices: nextNotices,
      feeNotificationLogs: nextLogs,
      auditLogs: nextAudit,
    });

    showToast(
      `Fee Audit Complete: Processed ${result.summary.processedCount} fees, dispatched ${result.summary.newEmailLogsCount} automated email reminder(s) & in-portal alert(s).`
    );
    return result;
  }, [feeAssignments, allCollegeStudents, profiles, payments, notices, feeNotificationLogs, auditLogs, syncStateToJsonDatabase, showToast]);

  const handleRecordPayment = useCallback((aid: string, am: number, mo: PaymentRecord['mode'], ref: string) => {
    const now = Date.now();
    if (now - lastActionTimestampRef.current < 400) return;
    lastActionTimestampRef.current = now;

    const assignment = feeAssignments.find(a => a.id === aid);
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      assignment_id: aid,
      student_id: assignment?.student_id || 'unknown',
      student_name: assignment?.student_name || 'Unknown Student',
      enrolment_no: assignment?.enrolment_no || 'N/A',
      fee_title: assignment?.title || 'Fee Payment',
      amount_paise: am,
      mode: mo,
      reference: ref,
      receipt_no: `RCPT-${Date.now().toString().slice(-6)}`,
      recorded_by_name: currentProfile.full_name,
      created_at: new Date().toISOString()
    };

    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);

    const updatedAssignments = feeAssignments.map(a => {
      if (a.id !== aid && !(assignment && a.student_id === assignment.student_id && a.title === assignment.title)) return a;
      const updatedPaidPaise = (a.paid_paise || 0) + am;
      const netPrincipal = a.amount_paise - a.concession_paise;
      const isPaid = updatedPaidPaise >= netPrincipal;
      return {
        ...a,
        paid_paise: updatedPaidPaise,
        status: isPaid ? ('paid' as const) : updatedPaidPaise > 0 ? ('partially_paid' as const) : a.status
      };
    });
    setFeeAssignments(updatedAssignments);

    const notifResult = evaluateAndGenerateFeeNotifications({
      feeAssignments: updatedAssignments,
      students: allCollegeStudents,
      profiles,
      payments: updatedPayments,
      existingNotices: notices,
      existingLogs: feeNotificationLogs,
      triggerSource: 'payment_event',
      specificAssignmentId: aid,
    });

    const nextNotices = notifResult.newNotices.length > 0 ? [...notifResult.newNotices, ...notices] : notices;
    const nextLogs = notifResult.newLogs.length > 0 ? [...notifResult.newLogs, ...feeNotificationLogs] : feeNotificationLogs;
    const nextAudit = notifResult.auditEntries.length > 0 ? [...notifResult.auditEntries, ...auditLogs] : auditLogs;

    if (notifResult.newNotices.length > 0) setNotices(nextNotices);
    if (notifResult.newLogs.length > 0) setFeeNotificationLogs(nextLogs);
    if (notifResult.auditEntries.length > 0) setAuditLogs(nextAudit);

    void syncStateToJsonDatabase({
      payments: updatedPayments,
      feeAssignments: updatedAssignments,
      notices: nextNotices,
      feeNotificationLogs: nextLogs,
      auditLogs: nextAudit,
    });
  }, [feeAssignments, payments, allCollegeStudents, profiles, notices, feeNotificationLogs, auditLogs, currentProfile.full_name, syncStateToJsonDatabase]);
  const handleReversePayment = useCallback((id: string, r: string) => {
    const target = payments.find(p => p.id === id);
    if (!target) return;

    const updatedPayments = payments.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: 'reversed' as const,
          reversal_reason: r || 'Administrative reversal',
        };
      }
      return p;
    });

    const updatedAssignments = feeAssignments.map(a => {
      if (a.id === target.assignment_id || (target.student_id === a.student_id && target.fee_title === a.title)) {
        const remainingPaid = Math.max(0, (a.paid_paise || 0) - target.amount_paise);
        const netPrincipal = a.amount_paise - a.concession_paise;
        const isPaid = remainingPaid >= netPrincipal;
        return {
          ...a,
          paid_paise: remainingPaid,
          status: isPaid ? ('paid' as const) : remainingPaid > 0 ? ('partially_paid' as const) : ('pending' as const),
        };
      }
      return a;
    });

    setPayments(updatedPayments);
    setFeeAssignments(updatedAssignments);
    appendAuditLog('FEE_PAYMENT_REVERSED', 'payments', id, {
      amount_paise: target.amount_paise,
      reason: r,
      by: currentProfile.full_name,
    });

    void syncStateToJsonDatabase({
      payments: updatedPayments,
      feeAssignments: updatedAssignments,
    });
    showToast(`Payment ${target.receipt_no} reversed. Outstanding balance restored.`);
  }, [payments, feeAssignments, appendAuditLog, currentProfile.full_name, syncStateToJsonDatabase, showToast]);
  
  const handleUpdateSettings = useCallback((p: Partial<SystemSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...p };
      void syncStateToJsonDatabase({ settings: next });
      return next;
    });
  }, [syncStateToJsonDatabase]);

  const handleDeactivateCollegeCode = useCallback((c: string) => {
    setValidCollegeCodes(prev => {
      const next = prev.filter(v => v.code !== c);
      void syncStateToJsonDatabase({ validCollegeCodes: next, deletedCollegeCodes: [c] });
      return next;
    });
  }, [syncStateToJsonDatabase]);

  const handleAddSubject = useCallback((s: Omit<Subject, 'id'>) => {
    const newSubject: Subject = { ...s, id: `s-${Date.now()}` };
    const nextSubjects = [newSubject, ...subjects];
    setSubjects(nextSubjects);
    appendAuditLog('SUBJECT_ADDED', 'curriculum', newSubject.id, { code: newSubject.code, name: newSubject.name });
    void syncStateToJsonDatabase({ subjects: nextSubjects });
    showToast(`Added subject ${newSubject.code} · ${newSubject.name}`);
  }, [subjects, appendAuditLog, syncStateToJsonDatabase, showToast]);

  const handleAddTimetableSlot = useCallback((s: Omit<TimetableSlot, 'id'>) => {
    const conflict = timetable.some(t => 
      t.weekday === s.weekday && 
      t.period === s.period && 
      (t.subject_code === s.subject_code || t.room === s.room || t.faculty_id === s.faculty_id)
    );
    if (conflict) {
      showToast('Timetable conflict: Slot already occupied for that period/room/faculty.');
      return;
    }
    const newSlot: TimetableSlot = { ...s, id: `tt-${Date.now()}` };
    const nextTimetable = [newSlot, ...timetable];
    setTimetable(nextTimetable);
    appendAuditLog('TIMETABLE_ADDED', 'timetable', newSlot.id, { weekday: newSlot.weekday, period: newSlot.period, subject: newSlot.subject_code });
    
    void fetch('/api/portal/timetable-slot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot: newSlot }),
    }).catch(err => console.error('Server timetable add failed', err));

    void syncStateToJsonDatabase({ timetable: nextTimetable });
    showToast(`Scheduled ${newSlot.subject_code} for Period ${newSlot.period}`);
  }, [timetable, appendAuditLog, syncStateToJsonDatabase, showToast]);

  const handleDeleteTimetableSlot = useCallback((id: string) => {
    const nextTimetable = timetable.filter(t => t.id !== id);
    setTimetable(nextTimetable);
    appendAuditLog('TIMETABLE_DELETED', 'timetable', id, {});

    void fetch('/api/portal/delete-timetable-slot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(err => console.error('Server timetable delete failed', err));

    void syncStateToJsonDatabase({ timetable: nextTimetable });
    showToast('Timetable slot removed');
  }, [timetable, appendAuditLog, syncStateToJsonDatabase, showToast]);

  const handleSaveExamination = useCallback(async (exam: Examination) => {
    setExaminations(prev => [exam, ...prev.filter(e => e.id !== exam.id)]);
    appendAuditLog('EXAM_CREATED', 'examinations', exam.id, { name: exam.name, course: exam.course_name });
    try {
      await fetch('/api/portal/examination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam }),
      });
    } catch (err) {
      console.error('Failed to persist exam', err);
    }
    showToast(`Examination "${exam.name}" saved successfully.`);
  }, [appendAuditLog, showToast]);

  const handlePublishExamination = useCallback(async (id: string, published: boolean) => {
    setExaminations(prev => prev.map(e => e.id === id ? { ...e, is_published: published, status: published ? 'published' : 'draft' } : e));
    appendAuditLog('EXAM_PUBLISHED', 'examinations', id, { published });
    try {
      await fetch('/api/portal/publish-examination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, published }),
      });
    } catch (err) {
      console.error('Failed to publish exam', err);
    }
    showToast(`Examination results ${published ? 'published' : 'unpublished'}.`);
  }, [appendAuditLog, showToast]);

  const handleSaveGradeCards = useCallback(async (cards: StudentGradeCard[]) => {
    setGradeCards(prev => {
      const cardMap = new Map(prev.map(c => [c.id, c]));
      cards.forEach(c => cardMap.set(c.id, c));
      return Array.from(cardMap.values());
    });
    appendAuditLog('GRADE_CARDS_SAVED', 'examinations', 'bulk', { count: cards.length });
    try {
      await fetch('/api/portal/grade-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeCards: cards }),
      });
    } catch (err) {
      console.error('Failed to save grade cards', err);
    }
    showToast(`Generated and saved ${cards.length} grade cards.`);
  }, [appendAuditLog, showToast]);

  const handleBookMentorSlot = useCallback((date: string, concern: string) => {
    const newMeeting: MentorMeeting = {
      id: `mm-${Date.now()}`,
      mentor_id: 'fac-1',
      student_id: currentProfile.id,
      student_name: currentProfile.full_name,
      date: date || new Date().toISOString().slice(0, 10),
      private_notes: 'Booked via Student Portal',
      shared_summary: concern || 'Academic advising and course progress review',
      action_items: 'Review core course completion and attendance margin',
    };
    const nextMeetings = [newMeeting, ...mentorMeetings];
    setMentorMeetings(nextMeetings);
    appendAuditLog('MENTOR_BOOKING', 'mentor', newMeeting.id, {
      student: currentProfile.full_name,
      date: newMeeting.date,
      concern,
    });
    void syncStateToJsonDatabase({ mentorMeetings: nextMeetings });
    showToast('Mentoring slot booked successfully.');
  }, [currentProfile.id, currentProfile.full_name, mentorMeetings, appendAuditLog, syncStateToJsonDatabase, showToast]);

  // Real-time automatic unlock notification when student account is approved by organizer
  const previousStatusRef = useRef(currentProfile.status);
  useEffect(() => {
    if (previousStatusRef.current === 'pending' && currentProfile.status === 'active') {
      showToast('🎉 Your student account has been approved by your College Organizer! Welcome to the portal.');
    }
    previousStatusRef.current = currentProfile.status;
  }, [currentProfile.status, showToast]);

  return (
    <div className="site-container min-h-screen w-full overflow-x-hidden bg-paper text-ink">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            <LandingPage onOpenAuth={(m, r) => { setAuthMode(m); if (r) setAuthRoleOption(r); setView('auth'); window.scrollTo(0,0); }} onQuickRoleLogin={(r) => { setAuthMode('login'); setAuthRoleOption(r === 'student' ? 'student' : r === 'faculty' ? 'faculty' : 'admin'); setView('auth'); window.scrollTo(0,0); }} onOpenDesignSystem={() => { setView('design'); window.scrollTo(0,0); }} isDark={isDark} onToggleTheme={toggleTheme} />
          </motion.div>
        )}
        {view === 'design' && (
          <motion.div key="design" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            <DesignSystemShowcase isDark={isDark} onToggleTheme={toggleTheme} onBackHome={() => setView('landing')} />
          </motion.div>
        )}
        {view === 'auth' && (
          <motion.div key="auth" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            <AuthScreen initialMode={authMode} initialRoleOption={authRoleOption} profiles={profiles} validCollegeCodes={validCollegeCodes} onRegisterCollegeCode={handleRegisterCollegeCode} onRefreshFromJson={fetchFromJsonDatabase} currentTabId={currentTabId} onBackToLanding={() => setView('landing')} onAuthenticateUser={(p) => handleAuthenticateUser(p.id, p.role)} onCreateAndAuthenticateUser={handleCreateAndAuthenticateUser} onRecordAuditEvent={(action, metadata) => appendAuditLog(action, 'auth.ui', 'global', metadata)} isDark={isDark} onToggleTheme={toggleTheme} />
          </motion.div>
        )}
        {view === 'portal' && (
          <motion.div key={`portal-${currentTabId}-${activeRole}-${currentProfile.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {(!hasInitialFetchCompleted && (authenticatedProfileId && !profiles.some(p => p.id === authenticatedProfileId))) ? (
              <div className="flex h-screen w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
                  <div className="font-editorial text-lg font-bold">Restoring Authenticated Session...</div>
                  <div className="text-xs text-muted font-mono">Restoring user identity and live permissions</div>
                </div>
              </div>
            ) : (
              <PortalShell currentProfile={currentProfile} activeNav={activeNav} unauthorizedAttemptRoute={unauthorizedAttemptRoute} onSelectNav={setActiveNav} onAttemptUnauthorizedRoute={setUnauthorizedAttemptRoute} onSwitchRole={handleSwitchRole} onSignOut={handleSignOut} onOpenDesignSystem={() => setView('design')} isDark={isDark} onToggleTheme={toggleTheme} notices={notices} onMarkNoticeRead={handleMarkNoticeRead} students={allCollegeStudents}>
                {activeNav === 'profile' && !(currentProfile.role === 'student' && currentProfile.status !== 'active') ? (
                  <ProfileManagementView profile={currentProfile} onUpdateProfile={handleUpdateCurrentProfile} onCreateNewProfile={handleCreateNewProfile} isDark={isDark} onToggleTheme={toggleTheme} onToast={showToast} />
                ) : activeNav === 'results' ? (
                  <ExaminationsAndGradeCardsModule
                    role={activeRole}
                    currentProfile={currentProfile}
                    students={allCollegeStudents}
                    examinations={examinations}
                    gradeCards={gradeCards}
                    subjects={subjects}
                    onSaveExamination={handleSaveExamination}
                    onPublishExamination={handlePublishExamination}
                    onSaveGradeCards={handleSaveGradeCards}
                    onToast={showToast}
                  />
                ) : (
                  <>
                    {(activeRole === 'student' || activeRole === 'parent') && (
                      <StudentAndParentModule role={activeRole} activeNav={activeNav} onNavigate={setActiveNav} profile={currentProfile} onUpdateProfile={handleUpdateCurrentProfile} students={allCollegeStudents} subjects={subjects} timetable={timetable} feeAssignments={feeAssignments} payments={payments} notices={notices} onMarkNoticeRead={handleMarkNoticeRead} mentorMeetings={mentorMeetings} onBookMentorSlot={handleBookMentorSlot} leaveRequests={leaveRequests} onSubmitLeave={handleSubmitLeave} onCancelLeave={handleCancelLeave} tickets={tickets} onCreateTicket={handleCreateTicket} assignments={assignments} onSubmitAssignment={handleSubmitAssignment} settings={settings} validCollegeCodes={validCollegeCodes} feeNotificationLogs={feeNotificationLogs} attendanceSessions={attendanceSessions} mentorRequests={mentorRequests} onRequestMentor={handleRequestMentor} onToast={showToast} onRefresh={fetchFromJsonDatabase} onRecordPayment={handleRecordPayment} />
                    )}
                    {(activeRole === 'faculty' || activeRole === 'hod') && (
                      <FacultyAndHodModule role={activeRole} profile={currentProfile} activeNav={activeNav} onNavigate={setActiveNav} students={allCollegeStudents} onReassignMentor={handleReassignMentor} mentorRequests={mentorRequests} facultyList={SEED_FACULTY} subjects={subjects} attendanceSessions={attendanceSessions} onSaveAttendanceSession={handleSaveAttendanceSession} onCreateAttendanceSession={handleSaveAttendanceSession} onUpdateSubjectMarks={handleUpdateSubjectMarks} onAddTimetableSlot={handleAddTimetableSlot} corrections={corrections} onRequestCorrection={handleRequestCorrection} onReviewCorrection={handleReviewCorrection} leaveRequests={leaveRequests} onDecideLeave={handleDecideLeave} mentorMeetings={mentorMeetings} onAddMentorMeeting={handleAddMentorMeeting} notices={notices} onCreateNotice={handleCreateNotice} timetable={timetable} assignments={assignments} onCreateAssignment={handleCreateAssignment} tickets={tickets} onResolveTicket={handleResolveTicket} onToast={showToast} />
                    )}
                    {activeRole === 'admin' ? (
                      <AdminPlatformWorkspace
                        currentProfile={currentProfile}
                        profiles={profiles}
                        students={allCollegeStudents}
                        attendanceSessions={attendanceSessions}
                        feeAssignments={feeAssignments}
                        payments={payments}
                        leaveRequests={leaveRequests}
                        tickets={tickets}
                        auditLogs={auditLogs}
                        validCollegeCodes={validCollegeCodes}
                        examinations={examinations}
                        gradeCards={gradeCards}
                        timetable={timetable}
                        onVerifyPendingStudent={handleVerifyPendingStudent}
                        onToast={showToast}
                        onRefresh={fetchFromJsonDatabase}
                      />
                    ) : (activeRole === 'accounts' || activeRole === 'super_admin') ? (
                      <AccountsAndAdminModule role={activeRole} activeNav={activeNav} onNavigate={setActiveNav} currentProfile={currentProfile} profiles={profiles} onVerifyPendingStudent={handleVerifyPendingStudent} onInviteUser={handleInviteUser} onUpdateAnyProfile={handleUpdateAnyProfile} onSaveTeacher={handleSaveTeacher} students={allCollegeStudents} onUpdateStudentRecord={handleUpdateStudentRecord} feeStructures={feeStructures} onAddFeeStructure={handleAddFeeStructure} feeAssignments={feeAssignments} onAssignFeeToStudent={handleAssignFeeToStudent} onRecordPayment={handleRecordPayment} payments={payments} onReversePayment={handleReversePayment} notices={notices} onMarkNoticeRead={handleMarkNoticeRead} onCreateNotice={handleCreateNotice} tickets={tickets} onResolveTicket={handleResolveTicket} auditLogs={auditLogs} feeNotificationLogs={feeNotificationLogs} onRunFeeNotificationAudit={handleRunFeeNotificationAudit} settings={settings} onUpdateSettings={handleUpdateSettings} validCollegeCodes={validCollegeCodes} onRegisterCollegeCode={handleRegisterCollegeCode} onDeactivateCollegeCode={handleDeactivateCollegeCode} subjects={subjects} onAddSubject={handleAddSubject} onSaveSubject={handleSaveSubject} mentorRequests={mentorRequests} onReassignMentor={handleReassignMentor} onUpdateSubjectMarks={handleUpdateSubjectMarks} timetable={timetable} onAddTimetableSlot={handleAddTimetableSlot} onDeleteTimetableSlot={handleDeleteTimetableSlot} attendanceSessions={attendanceSessions} onSaveAttendanceSession={handleSaveAttendanceSession} leaveRequests={leaveRequests} onDecideLeave={handleDecideLeave} onToast={showToast} onRefresh={fetchFromJsonDatabase} />
                    ) : null}
                  </>
                )}
              </PortalShell>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {toastMessage && <div role="status" className="fixed bottom-5 right-5 z-50 rounded-[10px] border border-accent bg-surface px-4 py-3 text-xs font-medium text-ink shadow-lg">{toastMessage}</div>}
      <OfflineIndicator />
    </div>
  );
}

export default App;
