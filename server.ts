import express, { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const DB_DIR = path.resolve(__dirname, 'data');
const DB_FILE_PATH = path.resolve(DB_DIR, 'portal-db.json');

export interface ActiveTabSession {
  tabId: string;
  profileId: string | null;
  fullName: string;
  email: string;
  role: string;
  collegeCode?: string;
  view: string;
  updatedAt: string;
}

export interface PortalDatabaseSchema {
  version: number;
  updatedAt: string;
  profiles: Record<string, unknown>[];
  students: Record<string, unknown>[];
  validCollegeCodes: { code: string; collegeName: string; scope: string; updatedAt?: string }[];
  subjects: Record<string, unknown>[];
  timetable: Record<string, unknown>[];
  attendanceSessions: Record<string, unknown>[];
  corrections: Record<string, unknown>[];
  examinations?: Record<string, unknown>[];
  gradeCards?: Record<string, unknown>[];
  feeStructures: Record<string, unknown>[];
  feeAssignments: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  notices: Record<string, unknown>[];
  mentorMeetings: Record<string, unknown>[];
  mentorRequests?: Record<string, unknown>[];
  leaveRequests: Record<string, unknown>[];
  tickets: Record<string, unknown>[];
  assignments: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  feeNotificationLogs?: Record<string, unknown>[];
  settings: {
    minimum_attendance_pct: number;
    warning_attendance_pct: number;
    block_hall_ticket_on_overdue_fees: boolean;
    results_published: boolean;
    results_publish_date: string;
    default_late_fine_paise_per_day: number;
    require_totp_for_admins: boolean;
  };
  activeSessions: ActiveTabSession[];
}

// Enforce maximum 3 alerts per circular/topic and recipient (initial, follow-up, final)
function deduplicateAndCapNotices(notices: Record<string, unknown>[]): Record<string, unknown>[] {
  const alertCountMap = new Map<string, number>();
  const seenIds = new Set<string>();
  const result: Record<string, unknown>[] = [];

  for (const n of notices) {
    if (!n) continue;
    const id = String(n.id || '');
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const circularKey = String(
      n.circular_id ||
      n.event_key ||
      String(n.title || '').replace(/^\[[^\]]+\]\s*/, '').trim().toLowerCase()
    );
    const targetKey = String(n.audience_target || n.recipient_id || 'all').trim().toLowerCase();
    const groupKey = `${circularKey}::${targetKey}`;

    const currentCount = alertCountMap.get(groupKey) || 0;
    if (currentCount < 3) {
      alertCountMap.set(groupKey, currentCount + 1);
      result.push(n);
    }
  }

  return result;
}

const DEMO_TEACHER_PROFILES: Record<string, unknown>[] = [
  {
    id: "tch-001",
    role: "faculty",
    full_name: "Dr. Amit Sharma",
    display_name: "Dr. Amit Sharma",
    first_name: "Amit",
    last_name: "Sharma",
    username: "amit.sharma",
    email: "amit.sharma@campus.edu",
    phone: "+91 98234 10001",
    identifier_no: "TCH-001",
    employee_id: "TCH-001",
    department: "Computer Science",
    designation: "Associate Professor",
    status: "active",
    totp_enabled: false,
    college_code: "MIT-9O38",
    college_name: "MIT",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "tch-002",
    role: "faculty",
    full_name: "Prof. Priya Patel",
    display_name: "Prof. Priya Patel",
    first_name: "Priya",
    last_name: "Patel",
    username: "priya.patel",
    email: "priya.patel@campus.edu",
    phone: "+91 98234 10002",
    identifier_no: "TCH-002",
    employee_id: "TCH-002",
    department: "Information Technology",
    designation: "Professor & HOD",
    status: "active",
    totp_enabled: false,
    college_code: "MIT-9O38",
    college_name: "MIT",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "tch-003",
    role: "faculty",
    full_name: "Rahul Verma",
    display_name: "Rahul Verma",
    first_name: "Rahul",
    last_name: "Verma",
    username: "rahul.verma",
    email: "rahul.verma@campus.edu",
    phone: "+91 98234 10003",
    identifier_no: "TCH-003",
    employee_id: "TCH-003",
    department: "Mathematics",
    designation: "Assistant Professor",
    status: "active",
    totp_enabled: false,
    college_code: "MIT-9O38",
    college_name: "MIT",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "tch-004",
    role: "faculty",
    full_name: "Neha Singh",
    display_name: "Neha Singh",
    first_name: "Neha",
    last_name: "Singh",
    username: "neha.singh",
    email: "neha.singh@campus.edu",
    phone: "+91 98234 10004",
    identifier_no: "TCH-004",
    employee_id: "TCH-004",
    department: "Electronics",
    designation: "Assistant Professor",
    status: "active",
    totp_enabled: false,
    college_code: "MIT-9O38",
    college_name: "MIT",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "tch-005",
    role: "faculty",
    full_name: "Dr. Arjun Mehta",
    display_name: "Dr. Arjun Mehta",
    first_name: "Arjun",
    last_name: "Mehta",
    username: "arjun.mehta",
    email: "arjun.mehta@campus.edu",
    phone: "+91 98234 10005",
    identifier_no: "TCH-005",
    employee_id: "TCH-005",
    department: "Computer Science",
    designation: "Associate Professor",
    status: "active",
    totp_enabled: false,
    college_code: "MIT-9O38",
    college_name: "MIT",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "tch-006",
    role: "faculty",
    full_name: "Sneha Gupta",
    display_name: "Sneha Gupta",
    first_name: "Sneha",
    last_name: "Gupta",
    username: "sneha.gupta",
    email: "sneha.gupta@campus.edu",
    phone: "+91 98234 10006",
    identifier_no: "TCH-006",
    employee_id: "TCH-006",
    department: "Information Technology",
    designation: "Assistant Professor",
    status: "active",
    totp_enabled: false,
    college_code: "MIT-9O38",
    college_name: "MIT",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "tch-007",
    role: "faculty",
    full_name: "Vikram Rao",
    display_name: "Vikram Rao",
    first_name: "Vikram",
    last_name: "Rao",
    username: "vikram.rao",
    email: "vikram.rao@campus.edu",
    phone: "+91 98234 10007",
    identifier_no: "TCH-007",
    employee_id: "TCH-007",
    department: "Physics",
    designation: "Associate Professor",
    status: "active",
    totp_enabled: false,
    college_code: "MIT-9O38",
    college_name: "MIT",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "tch-008",
    role: "faculty",
    full_name: "Ananya Reddy",
    display_name: "Ananya Reddy",
    first_name: "Ananya",
    last_name: "Reddy",
    username: "ananya.reddy",
    email: "ananya.reddy@campus.edu",
    phone: "+91 98234 10008",
    identifier_no: "TCH-008",
    employee_id: "TCH-008",
    department: "Mathematics",
    designation: "Assistant Professor",
    status: "active",
    totp_enabled: false,
    college_code: "MIT-9O38",
    college_name: "MIT",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "tch-009",
    role: "faculty",
    full_name: "Karan Malhotra",
    display_name: "Karan Malhotra",
    first_name: "Karan",
    last_name: "Malhotra",
    username: "karan.malhotra",
    email: "karan.malhotra@campus.edu",
    phone: "+91 98234 10009",
    identifier_no: "TCH-009",
    employee_id: "TCH-009",
    department: "Electronics",
    designation: "Assistant Professor",
    status: "active",
    totp_enabled: false,
    college_code: "MIT-9O38",
    college_name: "MIT",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "tch-010",
    role: "faculty",
    full_name: "Pooja Desai",
    display_name: "Pooja Desai",
    first_name: "Pooja",
    last_name: "Desai",
    username: "pooja.desai",
    email: "pooja.desai@campus.edu",
    phone: "+91 98234 10010",
    identifier_no: "TCH-010",
    employee_id: "TCH-010",
    department: "English",
    designation: "Senior Lecturer",
    status: "active",
    totp_enabled: false,
    college_code: "MIT-9O38",
    college_name: "MIT",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  }
];

const DEFAULT_DB: PortalDatabaseSchema = {
  version: 1,
  updatedAt: new Date().toISOString(),
  profiles: [
    {
      id: "prof-admin-root",
      role: "admin",
      full_name: "Platform Administrator",
      display_name: "Platform Admin",
      first_name: "Admin",
      last_name: "",
      username: "admin",
      email: "admin@gmail.com",
      phone: "+91 99000 00001",
      status: "active",
      totp_enabled: true,
      college_code: "PLATFORM",
      college_name: "Platform Governance",
      identifier_no: "ADM-001",
      department: "Platform Administration",
      password: "admin@college123",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    },
    ...DEMO_TEACHER_PROFILES
  ],
  students: [],
  validCollegeCodes: [],
  subjects: [],
  timetable: [],
  attendanceSessions: [],
  corrections: [],
  examinations: [],
  gradeCards: [],
  feeStructures: [],
  feeAssignments: [],
  payments: [],
  notices: [],
  mentorMeetings: [],
  mentorRequests: [],
  leaveRequests: [],
  tickets: [],
  assignments: [],
  auditLogs: [],
  settings: {
    minimum_attendance_pct: 75,
    warning_attendance_pct: 80,
    block_hall_ticket_on_overdue_fees: true,
    results_published: true,
    results_publish_date: new Date().toISOString().slice(0, 10),
    default_late_fine_paise_per_day: 2500,
    require_totp_for_admins: true,
  },
  activeSessions: [],
};

// Serialized write mutex so concurrent requests from parallel tabs never collide
let writeLockPromise: Promise<void> = Promise.resolve();

function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const result = writeLockPromise.then(task, task);
  writeLockPromise = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function ensureDbFileExists(): Promise<void> {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    await fs.access(DB_FILE_PATH);
  } catch {
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
  }
}

async function readDbFromFile(): Promise<PortalDatabaseSchema> {
  await ensureDbFileExists();
  try {
    const raw = await fs.readFile(DB_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PortalDatabaseSchema>;
    // Clean up stale tab sessions older than 12 hours
    const cutoff = Date.now() - 1000 * 60 * 60 * 12;
    const activeSessions = Array.isArray(parsed.activeSessions)
      ? parsed.activeSessions.filter((s) => {
          const ts = new Date(s.updatedAt || 0).getTime();
          return !Number.isNaN(ts) && ts > cutoff;
        })
      : [];

    const existingProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    const seenTeacherIds = new Set(
      existingProfiles.map((p) => String(p.identifier_no || p.employee_id || p.id || '').toUpperCase())
    );
    const missingDemoTeachers = DEMO_TEACHER_PROFILES.filter(
      (dt) => !seenTeacherIds.has(String(dt.identifier_no).toUpperCase())
    );
    let resolvedProfiles = missingDemoTeachers.length > 0
      ? [...existingProfiles, ...missingDemoTeachers]
      : existingProfiles;

    const hasAdmin = resolvedProfiles.some(
      (p) => String(p.email || '').toLowerCase() === 'admin@gmail.com' && p.role === 'admin'
    );
    if (!hasAdmin) {
      resolvedProfiles = [DEFAULT_DB.profiles[0], ...resolvedProfiles];
    }

    return {
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      profiles: resolvedProfiles,
      students: Array.isArray(parsed.students) ? parsed.students : [],
      validCollegeCodes: Array.isArray(parsed.validCollegeCodes) ? parsed.validCollegeCodes : [],
      subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
      timetable: Array.isArray(parsed.timetable) ? parsed.timetable : [],
      attendanceSessions: Array.isArray(parsed.attendanceSessions) ? parsed.attendanceSessions : [],
      corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
      examinations: Array.isArray(parsed.examinations) ? parsed.examinations : [],
      gradeCards: Array.isArray(parsed.gradeCards) ? parsed.gradeCards : [],
      feeStructures: Array.isArray(parsed.feeStructures) ? parsed.feeStructures : [],
      feeAssignments: Array.isArray(parsed.feeAssignments) ? parsed.feeAssignments : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      notices: Array.isArray(parsed.notices) ? deduplicateAndCapNotices(parsed.notices) : [],
      mentorMeetings: Array.isArray(parsed.mentorMeetings) ? parsed.mentorMeetings : [],
      mentorRequests: Array.isArray(parsed.mentorRequests) ? parsed.mentorRequests : [],
      leaveRequests: Array.isArray(parsed.leaveRequests) ? parsed.leaveRequests : [],
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      feeNotificationLogs: Array.isArray(parsed.feeNotificationLogs) ? parsed.feeNotificationLogs : [],
      settings: parsed.settings
        ? { ...DEFAULT_DB.settings, ...parsed.settings }
        : DEFAULT_DB.settings,
      activeSessions,
    };
  } catch {
    return { ...DEFAULT_DB, updatedAt: new Date().toISOString() };
  }
}

async function writeDbToFile(db: PortalDatabaseSchema): Promise<PortalDatabaseSchema> {
  await ensureDbFileExists();
  const next: PortalDatabaseSchema = {
    ...db,
    version: (db.version || 1) + 1,
    updatedAt: new Date().toISOString(),
  };

  // 1. Write the unified database
  await fs.writeFile(DB_FILE_PATH, JSON.stringify(next, null, 2), 'utf-8');

  // 2. Write role-separated JSON files into /data for transparent per-role storage
  try {
    const studentsData = {
      version: next.version,
      updatedAt: next.updatedAt,
      role: 'student',
      profiles: next.profiles.filter((p) => p.role === 'student'),
      students: next.students,
      leaveRequests: next.leaveRequests,
      assignments: next.assignments,
      tickets: next.tickets,
    };
    const facultyData = {
      version: next.version,
      updatedAt: next.updatedAt,
      role: 'faculty_and_hod',
      profiles: next.profiles.filter((p) => p.role === 'faculty' || p.role === 'hod'),
      subjects: next.subjects,
      timetable: next.timetable,
      attendanceSessions: next.attendanceSessions,
      corrections: next.corrections,
      mentorMeetings: next.mentorMeetings,
    };
    const accountsData = {
      version: next.version,
      updatedAt: next.updatedAt,
      role: 'accounts',
      feeStructures: next.feeStructures,
      feeAssignments: next.feeAssignments,
      payments: next.payments,
      feeNotificationLogs: next.feeNotificationLogs || [],
    };
    const organizerData = {
      version: next.version,
      updatedAt: next.updatedAt,
      role: 'organizer_and_admin',
      validCollegeCodes: next.validCollegeCodes,
      profiles: next.profiles,
      auditLogs: next.auditLogs,
      settings: next.settings,
    };
    const academicsData = {
      version: next.version,
      updatedAt: next.updatedAt,
      subjects: next.subjects,
      timetable: next.timetable,
      attendanceSessions: next.attendanceSessions,
      corrections: next.corrections,
    };

    await Promise.all([
      fs.writeFile(path.resolve(DB_DIR, 'students.json'), JSON.stringify(studentsData, null, 2), 'utf-8'),
      fs.writeFile(path.resolve(DB_DIR, 'faculty.json'), JSON.stringify(facultyData, null, 2), 'utf-8'),
      fs.writeFile(path.resolve(DB_DIR, 'accounts.json'), JSON.stringify(accountsData, null, 2), 'utf-8'),
      fs.writeFile(path.resolve(DB_DIR, 'organizer.json'), JSON.stringify(organizerData, null, 2), 'utf-8'),
      fs.writeFile(path.resolve(DB_DIR, 'academics.json'), JSON.stringify(academicsData, null, 2), 'utf-8'),
    ]);
  } catch (err) {
    console.error('Failed to write role-specific JSON slices:', err);
  }

  return next;
}

// Merge arrays by 'id' so parallel tabs adding/editing records simultaneously never overwrite each other's new records
function mergeArrayById<T extends Record<string, unknown>>(
  existing: T[],
  incoming: T[],
  deletedIds?: string[]
): T[] {
  const deletedSet = new Set(deletedIds || []);
  const map = new Map<string, T>();

  // Put incoming items first to preserve newest ordering at top
  for (const item of incoming) {
    const id = String(item.id || '');
    if (id && !deletedSet.has(id)) {
      map.set(id, item);
    }
  }

  // Keep any existing items created by other parallel tabs that aren't in incoming yet
  for (const item of existing) {
    const id = String(item.id || '');
    if (id && !deletedSet.has(id) && !map.has(id)) {
      map.set(id, item);
    } else if (id && !deletedSet.has(id) && map.has(id)) {
      // Merge fields with incoming taking precedence
      map.set(id, { ...item, ...map.get(id)! });
    }
  }

  return Array.from(map.values());
}

function mergeCollegeCodes(
  existing: { code: string; collegeName: string; scope: string }[],
  incoming: { code: string; collegeName: string; scope: string }[],
  deletedCodes?: string[]
): { code: string; collegeName: string; scope: string }[] {
  const deletedSet = new Set((deletedCodes || []).map((c) => c.toUpperCase()));
  const map = new Map<string, { code: string; collegeName: string; scope: string }>();

  for (const item of incoming) {
    if (!item || !item.code) continue;
    const key = item.code.trim().toUpperCase();
    if (key && !deletedSet.has(key)) {
      map.set(key, { ...item, code: key });
    }
  }

  for (const item of existing) {
    if (!item || !item.code) continue;
    const key = item.code.trim().toUpperCase();
    if (key && !deletedSet.has(key) && !map.has(key)) {
      map.set(key, { ...item, code: key });
    }
  }

  return Array.from(map.values());
}

// Connected SSE Clients for Real-Time Parallel Tab Synchronization
interface SseClient {
  id: string;
  res: Response;
}

const sseClients = new Set<SseClient>();

function broadcastDatabaseUpdate(db: PortalDatabaseSchema, sourceTabId?: string) {
  const payload = JSON.stringify({
    type: 'db:updated',
    sourceTabId: sourceTabId || null,
    db,
  });

  for (const client of sseClients) {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function startServer() {
  await ensureDbFileExists();

  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // 1. GET /api/db — Retrieve & load all information from /data/portal-db.json
  app.get('/api/db', async (_req: Request, res: Response) => {
    try {
      const db = await readDbFromFile();
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        filePath: '/data/portal-db.json',
        db,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to read JSON database',
      });
    }
  });

  // 2. GET /api/db/export — Download raw /data/portal-db.json
  app.get('/api/db/export', async (_req: Request, res: Response) => {
    try {
      const db = await readDbFromFile();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="portal-db.json"');
      res.send(JSON.stringify(db, null, 2));
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to export JSON database',
      });
    }
  });

  // 2.1 GET /api/db/slice/:role — Fetch role-separated JSON file
  app.get('/api/db/slice/:role', async (req: Request, res: Response) => {
    try {
      const role = String(req.params.role || '').toLowerCase();
      const filename = `${role}.json`;
      const slicePath = path.resolve(DB_DIR, filename);
      const exists = await fs.access(slicePath).then(() => true).catch(() => false);
      if (!exists) {
        return res.status(404).json({ ok: false, error: `Role database slice ${filename} not found` });
      }
      const raw = await fs.readFile(slicePath, 'utf-8');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(raw);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to read role slice',
      });
    }
  });

  // 3. GET /api/db/stream — Real-time Server-Sent Events (SSE) stream for parallel tabs
  app.get('/api/db/stream', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const client: SseClient = { id: clientId, res };
    sseClients.add(client);

    // Send initial state immediately on connect
    const initialDb = await readDbFromFile();
    res.write(
      `data: ${JSON.stringify({
        type: 'db:init',
        sourceTabId: null,
        db: initialDb,
      })}\n\n`
    );

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(client);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(client);
    });
  });

  // 4. POST /api/db/sync — Non-colliding merge update into /data/portal-db.json
  app.post('/api/db/sync', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const sourceTabId = typeof body.tabId === 'string' ? body.tabId : undefined;
      const deletedIds: string[] = Array.isArray(body.deletedIds) ? body.deletedIds : [];
      const deletedCollegeCodes: string[] = Array.isArray(body.deletedCollegeCodes)
        ? body.deletedCollegeCodes
        : [];

      const updatedDb = await withWriteLock(async () => {
        const current = await readDbFromFile();

        const next: PortalDatabaseSchema = {
          ...current,
          profiles: Array.isArray(body.profiles)
            ? mergeArrayById(current.profiles, body.profiles, deletedIds)
            : current.profiles,
          students: Array.isArray(body.students)
            ? mergeArrayById(current.students, body.students, deletedIds)
            : current.students,
          validCollegeCodes: Array.isArray(body.validCollegeCodes)
            ? mergeCollegeCodes(
                current.validCollegeCodes,
                body.validCollegeCodes,
                deletedCollegeCodes
              )
            : deletedCollegeCodes.length > 0
              ? current.validCollegeCodes.filter(
                  (c) => !deletedCollegeCodes.includes(c.code.toUpperCase())
                )
              : current.validCollegeCodes,
          subjects: Array.isArray(body.subjects)
            ? mergeArrayById(current.subjects, body.subjects, deletedIds)
            : current.subjects,
          timetable: Array.isArray(body.timetable)
            ? mergeArrayById(current.timetable, body.timetable, deletedIds)
            : current.timetable,
          attendanceSessions: Array.isArray(body.attendanceSessions)
            ? mergeArrayById(current.attendanceSessions, body.attendanceSessions, deletedIds)
            : current.attendanceSessions,
          corrections: Array.isArray(body.corrections)
            ? mergeArrayById(current.corrections, body.corrections, deletedIds)
            : current.corrections,
          examinations: Array.isArray(body.examinations)
            ? mergeArrayById(current.examinations || [], body.examinations, deletedIds)
            : (deletedIds.length > 0 ? (current.examinations || []).filter(e => !deletedIds.includes(String(e.id))) : current.examinations || []),
          gradeCards: Array.isArray(body.gradeCards)
            ? mergeArrayById(current.gradeCards || [], body.gradeCards, deletedIds)
            : (deletedIds.length > 0 ? (current.gradeCards || []).filter(g => !deletedIds.includes(String(g.id))) : current.gradeCards || []),
          feeStructures: Array.isArray(body.feeStructures)
            ? mergeArrayById(current.feeStructures, body.feeStructures, deletedIds)
            : current.feeStructures,
          feeAssignments: Array.isArray(body.feeAssignments)
            ? mergeArrayById(current.feeAssignments, body.feeAssignments, deletedIds)
            : current.feeAssignments,
          payments: Array.isArray(body.payments)
            ? mergeArrayById(current.payments, body.payments, deletedIds)
            : current.payments,
          notices: Array.isArray(body.notices)
            ? deduplicateAndCapNotices(mergeArrayById(current.notices, body.notices, deletedIds))
            : deduplicateAndCapNotices(current.notices),
          mentorMeetings: Array.isArray(body.mentorMeetings)
            ? mergeArrayById(current.mentorMeetings, body.mentorMeetings, deletedIds)
            : current.mentorMeetings,
          mentorRequests: Array.isArray(body.mentorRequests)
            ? mergeArrayById(current.mentorRequests || [], body.mentorRequests, deletedIds)
            : current.mentorRequests || [],
          leaveRequests: Array.isArray(body.leaveRequests)
            ? mergeArrayById(current.leaveRequests, body.leaveRequests, deletedIds)
            : current.leaveRequests,
          tickets: Array.isArray(body.tickets)
            ? mergeArrayById(current.tickets, body.tickets, deletedIds)
            : current.tickets,
          assignments: Array.isArray(body.assignments)
            ? mergeArrayById(current.assignments, body.assignments, deletedIds)
            : current.assignments,
          auditLogs: Array.isArray(body.auditLogs)
            ? mergeArrayById(current.auditLogs, body.auditLogs, deletedIds).slice(0, 500)
            : current.auditLogs,
          feeNotificationLogs: Array.isArray(body.feeNotificationLogs)
            ? mergeArrayById(current.feeNotificationLogs || [], body.feeNotificationLogs, deletedIds)
            : current.feeNotificationLogs || [],
          settings: body.settings ? { ...current.settings, ...body.settings } : current.settings,
          activeSessions: current.activeSessions,
        };

        // If tab session metadata is included, update only that tab's session entry
        if (body.tabSession && typeof body.tabSession.tabId === 'string') {
          const ts: ActiveTabSession = {
            tabId: body.tabSession.tabId,
            profileId: body.tabSession.profileId || null,
            fullName: body.tabSession.fullName || 'Guest',
            email: body.tabSession.email || '',
            role: body.tabSession.role || 'visitor',
            collegeCode: body.tabSession.collegeCode,
            view: body.tabSession.view || 'landing',
            updatedAt: new Date().toISOString(),
          };
          next.activeSessions = [
            ts,
            ...current.activeSessions.filter((s) => s.tabId !== ts.tabId),
          ].slice(0, 30);
        }

        return writeDbToFile(next);
      });

      broadcastDatabaseUpdate(updatedDb, sourceTabId);

      res.json({
        ok: true,
        filePath: '/data/portal-db.json',
        db: updatedDb,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to sync JSON database',
      });
    }
  });

  // 5. POST /api/db/replace — Replace or import full JSON database
  app.post('/api/db/replace', async (req: Request, res: Response) => {
    try {
      const incoming = req.body?.db || req.body || {};
      const sourceTabId = typeof req.body?.tabId === 'string' ? req.body.tabId : undefined;

      const updatedDb = await withWriteLock(async () => {
        const current = await readDbFromFile();
        const next: PortalDatabaseSchema = {
          version: (current.version || 1) + 1,
          updatedAt: new Date().toISOString(),
          profiles: Array.isArray(incoming.profiles) ? incoming.profiles : [],
          students: Array.isArray(incoming.students) ? incoming.students : [],
          validCollegeCodes: Array.isArray(incoming.validCollegeCodes)
            ? incoming.validCollegeCodes
            : [],
          subjects: Array.isArray(incoming.subjects) ? incoming.subjects : current.subjects,
          timetable: Array.isArray(incoming.timetable) ? incoming.timetable : current.timetable,
          attendanceSessions: Array.isArray(incoming.attendanceSessions)
            ? incoming.attendanceSessions
            : [],
          corrections: Array.isArray(incoming.corrections) ? incoming.corrections : [],
          feeStructures: Array.isArray(incoming.feeStructures) ? incoming.feeStructures : [],
          feeAssignments: Array.isArray(incoming.feeAssignments) ? incoming.feeAssignments : [],
          payments: Array.isArray(incoming.payments) ? incoming.payments : [],
          notices: Array.isArray(incoming.notices) ? incoming.notices : [],
          mentorMeetings: Array.isArray(incoming.mentorMeetings) ? incoming.mentorMeetings : [],
          leaveRequests: Array.isArray(incoming.leaveRequests) ? incoming.leaveRequests : [],
          tickets: Array.isArray(incoming.tickets) ? incoming.tickets : [],
          assignments: Array.isArray(incoming.assignments) ? incoming.assignments : [],
          auditLogs: Array.isArray(incoming.auditLogs) ? incoming.auditLogs : [],
          settings: incoming.settings
            ? { ...DEFAULT_DB.settings, ...incoming.settings }
            : current.settings,
          activeSessions: current.activeSessions,
        };
        return writeDbToFile(next);
      });

      broadcastDatabaseUpdate(updatedDb, sourceTabId);

      res.json({
        ok: true,
        filePath: '/data/portal-db.json',
        db: updatedDb,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to replace JSON database',
      });
    }
  });

  // 6. POST /api/db/session — Register/update a single browser tab's isolated session
  app.post('/api/db/session', async (req: Request, res: Response) => {
    try {
      const tabSession = req.body;
      if (!tabSession || typeof tabSession.tabId !== 'string') {
        res.status(400).json({ ok: false, error: 'tabId is required' });
        return;
      }

      const updatedDb = await withWriteLock(async () => {
        const current = await readDbFromFile();
        const entry: ActiveTabSession = {
          tabId: tabSession.tabId,
          profileId: tabSession.profileId || null,
          fullName: tabSession.fullName || 'Visitor',
          email: tabSession.email || '',
          role: tabSession.role || 'visitor',
          collegeCode: tabSession.collegeCode,
          view: tabSession.view || 'landing',
          updatedAt: new Date().toISOString(),
        };
        const next: PortalDatabaseSchema = {
          ...current,
          activeSessions: [
            entry,
            ...current.activeSessions.filter((s) => s.tabId !== entry.tabId),
          ].slice(0, 30),
        };
        return writeDbToFile(next);
      });

      broadcastDatabaseUpdate(updatedDb, tabSession.tabId);
      res.json({ ok: true, activeSessions: updatedDb.activeSessions });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to update tab session',
      });
    }
  });

  // 7. POST /api/auth/admin-login — Dedicated Admin Authentication
  app.post('/api/auth/admin-login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPassword = String(password || '');

      if (cleanEmail === 'admin@gmail.com' && cleanPassword === 'admin@college123') {
        const db = await readDbFromFile();
        let adminProf = db.profiles.find(
          (p) => String(p.email || '').toLowerCase() === 'admin@gmail.com' && p.role === 'admin'
        );

        if (!adminProf) {
          adminProf = {
            id: 'prof-admin-root',
            role: 'admin',
            full_name: 'Platform Administrator',
            display_name: 'Platform Admin',
            first_name: 'Admin',
            last_name: '',
            username: 'admin',
            email: 'admin@gmail.com',
            phone: '+91 99000 00001',
            status: 'active',
            totp_enabled: true,
            college_code: 'PLATFORM',
            college_name: 'Platform Governance',
            identifier_no: 'ADM-001',
            department: 'Platform Administration',
            password: 'admin@college123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const authLog = {
            id: `aud-adm-login-${Date.now()}`,
            actor_id: adminProf!.id,
            actor_name: adminProf!.full_name,
            actor_email: adminProf!.email,
            actor_role: 'admin',
            college_code: 'PLATFORM',
            action: 'AUTH_ADMIN_SIGNIN_SUCCESS',
            entity: 'auth.sessions',
            entity_id: adminProf!.id,
            metadata: { method: 'password', ip: req.ip || '127.0.0.1', user_agent: req.headers['user-agent'] },
            ip: req.ip || '127.0.0.1',
            created_at: new Date().toISOString(),
          };

          await withWriteLock(async () => {
            const cur = await readDbFromFile();
            cur.profiles = [adminProf!, ...cur.profiles.filter((p) => p.id !== 'prof-admin-root')];
            cur.auditLogs = [authLog, ...(cur.auditLogs || [])];
            return writeDbToFile(cur);
          });
        }

        return res.json({
          ok: true,
          success: true,
          profile: adminProf,
          token: `token-adm-${Date.now()}`,
        });
      }

      await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const failedLog = {
          id: `aud-adm-fail-${Date.now()}`,
          actor_id: 'anonymous',
          actor_name: 'Unauthenticated Actor',
          actor_email: cleanEmail,
          actor_role: 'unauthenticated',
          college_code: 'PLATFORM',
          action: 'AUTH_FAILED_LOGIN_ATTEMPT',
          entity: 'auth.sessions',
          entity_id: cleanEmail,
          metadata: { ip: req.ip || '127.0.0.1', reason: 'Invalid administrative credentials provided' },
          ip: req.ip || '127.0.0.1',
          created_at: new Date().toISOString(),
        };
        cur.auditLogs = [failedLog, ...(cur.auditLogs || [])];
        return writeDbToFile(cur);
      });

      return res.status(401).json({
        ok: false,
        error: 'Invalid Administrator credentials. Please enter admin@gmail.com and admin@college123.',
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Admin authentication failed',
      });
    }
  });

  // 8. POST /api/portal/register-student — Real-Time Atomic Student Registration
  app.post('/api/portal/register-student', async (req: Request, res: Response) => {
    try {
      const raw = req.body || {};
      const profile = raw.profile || raw;
      const student = raw.student;
      const tabId = raw.tabId;
      if (!profile || !profile.email || !profile.full_name) {
        return res.status(400).json({ ok: false, error: 'Full name and email are required' });
      }

      if (!profile.id) {
        profile.id = `prof-student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      }

      const cleanCode = (profile.college_code || '').trim().toUpperCase();
      let createdProfile: any = null;
      let createdStudent: any = null;

      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();

        // 1. Matched College Name lookup
        const codeMatch = cur.validCollegeCodes.find(
          (c) => (c.code || '').trim().toUpperCase() === cleanCode
        );
        const resolvedCollegeName = codeMatch?.collegeName || profile.college_name || 'Institution Workspace';

        const newProfile = {
          ...profile,
          role: 'student',
          status: 'pending', // Guarantee pending status
          college_code: cleanCode,
          college_name: resolvedCollegeName,
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        createdProfile = newProfile;

        const newStudent = student || {
          id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          profile_id: newProfile.id,
          full_name: newProfile.full_name,
          email: newProfile.email,
          phone: newProfile.phone || '',
          enrolment_no: newProfile.identifier_no || `26STU${100 + cur.students.length}`,
          batch_id: 'batch-2026',
          batch_label: 'B.Tech 2026 Cohort',
          department_id: 'dept-cse',
          department_code: newProfile.department || 'CSE',
          current_semester: 1,
          guardian_name: 'Registered Guardian',
          attendance_pct: 0,
          cgpa: 0,
          sgpa: 0,
          fee_status: 'pending',
          college_code: cleanCode,
          college_name: resolvedCollegeName,
          status: 'pending',
        };
        createdStudent = newStudent;

        // Notification for the Organizer
        const notice = {
          id: `notif-appr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: `[APPROVAL REQUIRED] New Student: ${newProfile.full_name}`,
          body: `Student ${newProfile.full_name} (${newProfile.email}, Roll: ${newStudent.enrolment_no}) registered with college code ${cleanCode}. Please approve or reject in the Organizer workspace.`,
          category: 'Urgent',
          audience_scope: 'role',
          audience_target: 'super_admin',
          college_code: cleanCode,
          college_name: resolvedCollegeName,
          is_public: false,
          pinned: true,
          publish_at: new Date().toISOString(),
          created_by_name: 'Student Registration Gate',
          created_by_role: 'System',
          read_count: 0,
          total_target_count: 1,
          is_read: false,
        };

        const audit = {
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          actor_id: newProfile.id,
          actor_name: newProfile.full_name,
          actor_role: 'student',
          action: 'STUDENT_REGISTRATION',
          entity: 'profiles',
          entity_id: newProfile.id,
          college_code: cleanCode,
          metadata: { college_code: cleanCode, email: newProfile.email, status: 'pending' },
          ip: '10.24.118.42',
          created_at: new Date().toISOString(),
        };

        const nextProfiles = [newProfile, ...cur.profiles.filter((p) => p.id !== newProfile.id && p.email !== newProfile.email)];
        const nextStudents = [newStudent, ...cur.students.filter((s) => s.id !== newStudent.id && s.profile_id !== newProfile.id)];
        const nextNotices = [notice, ...cur.notices];
        const nextAudit = [audit, ...cur.auditLogs].slice(0, 500);

        return writeDbToFile({
          ...cur,
          profiles: nextProfiles,
          students: nextStudents,
          notices: nextNotices,
          auditLogs: nextAudit,
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, profile: createdProfile, student: createdStudent, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Registration failed' });
    }
  });

  // 9. POST /api/portal/verify-student — Approve or Reject Student
  app.post('/api/portal/verify-student', async (req: Request, res: Response) => {
    try {
      const { profileId, studentId, status, remarks, reviewerName, reviewerId, tabId } = req.body || {};
      const targetId = profileId || studentId;
      if (!targetId || !status) {
        return res.status(400).json({ ok: false, error: 'profileId or studentId and status are required' });
      }

      let updatedProfile: any = null;
      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        let target = cur.profiles.find((p) => p.id === targetId || p.email === targetId);
        if (!target) {
          const stu = cur.students.find((s) => s.id === targetId || s.profile_id === targetId);
          if (stu) target = cur.profiles.find((p) => p.id === stu.profile_id);
        }
        if (!target) return cur;

        const actualProfileId = target.id;
        const nextProfiles = cur.profiles.map((p) => {
          if (p.id === actualProfileId) {
            const up = { ...p, status, updated_at: new Date().toISOString() };
            updatedProfile = up;
            return up;
          }
          return p;
        });

        const nextStudents = cur.students.map((s) =>
          s.profile_id === actualProfileId || s.id === targetId || (target && target.email && s.email === target.email)
            ? {
                ...s,
                status,
                verification_status: status === 'active' ? ('verified' as const) : ('rejected' as const),
                updated_at: new Date().toISOString(),
              }
            : s
        );

        const audit = {
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          actor_id: reviewerId || 'organizer',
          actor_name: reviewerName || 'College Organizer',
          actor_role: 'super_admin',
          action: status === 'active' ? 'STUDENT_APPROVAL' : 'STUDENT_REJECTION',
          entity: 'profile',
          entity_id: actualProfileId,
          college_code: target.college_code,
          metadata: { status, remarks: remarks || '', student: target.full_name },
          ip: '10.24.118.42',
          created_at: new Date().toISOString(),
        };

        const notice = {
          id: `notif-dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: status === 'active' ? 'Student Account Approved' : 'Registration Application Update',
          body: status === 'active'
            ? `Your student registration for ${target.college_name || 'your college'} has been officially approved! You have full access to classes, attendance, timetable, examinations, and fee records.`
            : `Your student registration was rejected or suspended. Remarks: ${remarks || 'Contact college administration.'}`,
          category: 'Academic',
          audience_scope: 'role',
          audience_target: actualProfileId,
          college_code: target.college_code,
          college_name: target.college_name,
          is_public: false,
          pinned: true,
          publish_at: new Date().toISOString(),
          created_by_name: reviewerName || 'College Organizer',
          created_by_role: 'Organizer',
          read_count: 0,
          total_target_count: 1,
          is_read: false,
        };

        return writeDbToFile({
          ...cur,
          profiles: nextProfiles,
          students: nextStudents,
          auditLogs: [audit, ...cur.auditLogs].slice(0, 500),
          notices: deduplicateAndCapNotices([notice, ...cur.notices]),
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, profile: updatedProfile, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Verification failed' });
    }
  });

  // 10. POST /api/portal/timetable-slot — Save Timetable Slot
  app.post('/api/portal/timetable-slot', async (req: Request, res: Response) => {
    try {
      const { slot, tabId } = req.body || {};
      if (!slot || !slot.subject_code || !slot.weekday || !slot.period) {
        return res.status(400).json({ ok: false, error: 'Incomplete timetable slot fields' });
      }

      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const slotId = slot.id || `tt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const cleanSlot = { ...slot, id: slotId };

        // Replace if slot already exists with same weekday and period in this batch/room
        const filtered = cur.timetable.filter(
          (t) =>
            t.id !== cleanSlot.id &&
            !(
              t.weekday === cleanSlot.weekday &&
              t.period === cleanSlot.period &&
              (t.room === cleanSlot.room || t.batch_id === cleanSlot.batch_id)
            )
        );

        return writeDbToFile({
          ...cur,
          timetable: [cleanSlot, ...filtered],
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to save timetable slot' });
    }
  });

  // 11. POST /api/portal/delete-timetable-slot — Permanently Remove Slot
  app.post('/api/portal/delete-timetable-slot', async (req: Request, res: Response) => {
    try {
      const { id, tabId } = req.body || {};
      if (!id) return res.status(400).json({ ok: false, error: 'Slot id is required' });

      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        return writeDbToFile({
          ...cur,
          timetable: cur.timetable.filter((t) => t.id !== id),
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to delete slot' });
    }
  });

  // 12. POST /api/portal/attendance-session — Record and Recalculate Attendance
  app.post('/api/portal/attendance-session', async (req: Request, res: Response) => {
    try {
      const { session, tabId } = req.body || {};
      if (!session || !session.subject_code || !session.date) {
        return res.status(400).json({ ok: false, error: 'Session data is incomplete' });
      }

      let savedSession: any = null;
      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const sessionId = session.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const cleanSession = { ...session, id: sessionId };
        savedSession = cleanSession;

        // Prevent duplicate session on same date, subject, period
        const filteredSessions = cur.attendanceSessions.filter(
          (s) =>
            s.id !== cleanSession.id &&
            !(
              s.date === cleanSession.date &&
              s.subject_code === cleanSession.subject_code &&
              s.period === cleanSession.period
            )
        );
        const allSessions = [cleanSession, ...filteredSessions];

        // Recalculate each student's attendance percentage from actual saved attendance records
        const nextStudents = cur.students.map((stu) => {
          let totalCount = 0;
          let presentCount = 0;

          for (const s of allSessions) {
            const status = (s.records as Record<string, string>)?.[String(stu.id)] ||
              (s.records as Record<string, string>)?.[String(stu.profile_id)];
            if (status) {
              totalCount += 1;
              if (status === 'Present' || status === 'On Duty') {
                presentCount += 1;
              } else if (status === 'Late') {
                presentCount += 0.5;
              }
            }
          }

          if (totalCount > 0) {
            const calculatedPct = Math.round((presentCount / totalCount) * 100);
            return { ...stu, attendance_pct: calculatedPct };
          }
          return stu;
        });

        return writeDbToFile({
          ...cur,
          attendanceSessions: allSessions,
          students: nextStudents,
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, session: savedSession, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to record attendance' });
    }
  });

  // 13. POST /api/portal/examination — Create or Update Examination
  app.post('/api/portal/examination', async (req: Request, res: Response) => {
    try {
      const raw = req.body?.examination || req.body?.exam || req.body || {};
      const tabId = req.body?.tabId;
      const examName = raw.name || raw.title;
      if (!raw || !examName) {
        return res.status(400).json({ ok: false, error: 'Examination name/title is required' });
      }

      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const examId = raw.id || `exam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const cleanExam = {
          ...raw,
          id: examId,
          name: examName,
          title: examName,
          subject_code: raw.subject_code || raw.subject || 'CS601',
          subject_name: raw.subject_name || raw.subject || 'Academic Examination',
          is_published: raw.is_published !== undefined ? Boolean(raw.is_published) : raw.status === 'published',
          status: (raw.is_published || raw.status === 'published') ? 'published' : 'draft',
          created_at: raw.created_at || new Date().toISOString(),
        };
        const existing = cur.examinations || [];
        const nextExams = [cleanExam, ...existing.filter((e) => e.id !== cleanExam.id)];

        return writeDbToFile({
          ...cur,
          examinations: nextExams,
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to create examination' });
    }
  });

  // 14. POST /api/portal/grade-cards — Save Student Marks & Grade Cards
  app.post('/api/portal/grade-cards', async (req: Request, res: Response) => {
    try {
      const { gradeCards, tabId } = req.body || {};
      if (!Array.isArray(gradeCards) || gradeCards.length === 0) {
        return res.status(400).json({ ok: false, error: 'Grade cards array required' });
      }

      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const existing = cur.gradeCards || [];
        const incomingIds = new Set(gradeCards.map((g) => g.id));
        const filtered = existing.filter((g) => !incomingIds.has(g.id));
        const nextGradeCards = [...gradeCards, ...filtered];

        return writeDbToFile({
          ...cur,
          gradeCards: nextGradeCards,
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to save grade cards' });
    }
  });

  // 15. POST /api/portal/publish-examination — Publish Exam & Grade Cards
  app.post('/api/portal/publish-examination', async (req: Request, res: Response) => {
    try {
      const examId = req.body?.examId || req.body?.id;
      const rawPub = req.body?.is_published !== undefined ? req.body.is_published : (req.body?.published !== undefined ? req.body.published : req.body?.status);
      const is_published = rawPub === true || rawPub === 'true' || rawPub === 'published';
      const tabId = req.body?.tabId;
      if (!examId) return res.status(400).json({ ok: false, error: 'examId or id required' });

      let savedExam: any = null;
      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const nextExams = (cur.examinations || []).map((e) =>
          e.id === examId ? { ...e, is_published, status: is_published ? ('published' as const) : ('draft' as const), published_at: is_published ? new Date().toISOString() : undefined } : e
        );
        const nextGradeCards = (cur.gradeCards || []).map((g) =>
          g.exam_id === examId || (g as any).examination_id === examId ? { ...g, is_published, published: is_published, status: is_published ? 'published' : 'draft', published_at: is_published ? new Date().toISOString() : undefined } : g
        );

        const examObj = nextExams.find((e) => e.id === examId);
        savedExam = examObj;
        let nextNotices = cur.notices;

        if (is_published && examObj) {
          const pubNotice = {
            id: `notif-exam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: `[EXAM RESULTS PUBLISHED] ${examObj.name || examObj.title || 'Semester Results'}`,
            body: `Examination results and official grade cards for ${examObj.subject_name || examObj.subject_code} have been reviewed and published. Students can view and download grade cards from the Results portal.`,
            category: 'Exam',
            audience_scope: 'college',
            audience_target: examObj.college_code,
            college_code: examObj.college_code,
            is_public: true,
            pinned: true,
            publish_at: new Date().toISOString(),
            created_by_name: examObj.created_by_name || 'Academic Controller',
            created_by_role: 'faculty',
            read_count: 0,
            total_target_count: 50,
            is_read: false,
          };
          nextNotices = deduplicateAndCapNotices([pubNotice, ...cur.notices]);
        }

        return writeDbToFile({
          ...cur,
          examinations: nextExams,
          gradeCards: nextGradeCards,
          notices: nextNotices,
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, exam: savedExam, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to publish results' });
    }
  });

  // 16. POST /api/portal/record-payment — Atomic Idempotent Payment
  app.post('/api/portal/record-payment', async (req: Request, res: Response) => {
    try {
      const { payment, tabId } = req.body || {};
      if (!payment || !payment.assignment_id || !payment.amount_paise) {
        return res.status(400).json({ ok: false, error: 'Payment details incomplete' });
      }

      let savedPayment: any = null;
      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();

        // 1. Duplicate check (same assignment_id, amount, and within last 8 seconds)
        const nowMs = Date.now();
        const duplicate = cur.payments.find((p) => {
          const isSameAssignment = p.assignment_id === payment.assignment_id;
          const isSameAmount = p.amount_paise === payment.amount_paise;
          const pCreatedAt = p.created_at ? String(p.created_at) : '';
          const isRecent = pCreatedAt ? nowMs - new Date(pCreatedAt).getTime() < 8000 : false;
          return isSameAssignment && isSameAmount && isRecent;
        });
        if (duplicate) {
          savedPayment = duplicate;
          return cur; // Idempotent return without duplicate
        }

        const receiptNo = payment.receipt_no || `RCPT-${Math.floor(100000 + Math.random() * 900000)}`;
        const cleanPayment = {
          ...payment,
          id: payment.id || `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          receipt_no: receiptNo,
          created_at: payment.created_at || new Date().toISOString(),
        };
        savedPayment = cleanPayment;

        // 2. Update FeeAssignment paid_paise and status
        const nextAssignments = cur.feeAssignments.map((a) => {
          if (a.id === cleanPayment.assignment_id) {
            const nextPaid = Number(a.paid_paise || 0) + Number(cleanPayment.amount_paise);
            const totalDue = Number(a.amount_paise || 0) - Number(a.concession_paise || 0);
            const nextStatus = nextPaid >= totalDue ? 'paid' : 'partial';
            return {
              ...a,
              paid_paise: nextPaid,
              status: nextStatus,
            };
          }
          return a;
        });

        // 3. Create fee notification for student
        const feeNotice = {
          id: `notif-fee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: `[PAYMENT ACKNOWLEDGMENT] Receipt ${receiptNo}`,
          body: `Payment of ₹${(cleanPayment.amount_paise / 100).toLocaleString('en-IN')} for ${cleanPayment.fee_title || 'College Fees'} has been verified. Download your receipt from the Student Fee Ledger.`,
          category: 'Fees',
          audience_scope: 'role',
          audience_target: cleanPayment.student_id,
          college_code: cleanPayment.college_code,
          is_public: false,
          pinned: false,
          publish_at: new Date().toISOString(),
          created_by_name: 'Accounts Bursar Office',
          created_by_role: 'accounts',
          read_count: 0,
          total_target_count: 1,
          is_read: false,
        };

        return writeDbToFile({
          ...cur,
          payments: [cleanPayment, ...cur.payments],
          feeAssignments: nextAssignments,
          notices: [feeNotice, ...cur.notices],
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, payment: savedPayment, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to record payment' });
    }
  });

  // 17. POST /api/portal/leave-request & /api/portal/decide-leave
  app.post('/api/portal/leave-request', async (req: Request, res: Response) => {
    try {
      const raw = req.body?.leaveRequest || req.body?.leave || req.body || {};
      const tabId = req.body?.tabId;
      if (!raw || (!raw.applicant_profile_id && !raw.applicant_id && !raw.applicant_name)) {
        return res.status(400).json({ ok: false, error: 'Leave request details incomplete' });
      }

      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const leaveId = raw.id || `l-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const cleanLeave = {
          ...raw,
          id: leaveId,
          applicant_name: raw.applicant_name || 'Student Applicant',
          status: raw.status || 'Pending Mentor',
          created_at: raw.created_at || new Date().toISOString(),
        };

        return writeDbToFile({
          ...cur,
          leaveRequests: [cleanLeave, ...cur.leaveRequests.filter((l) => l.id !== cleanLeave.id)],
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to submit leave' });
    }
  });

  app.post('/api/portal/decide-leave', async (req: Request, res: Response) => {
    try {
      const leaveId = req.body?.leaveId || req.body?.id;
      const decision = req.body?.decision;
      const reviewerRemarks = req.body?.reviewerRemarks || req.body?.remarks || req.body?.comment || '';
      const reviewerName = req.body?.reviewerName || req.body?.reviewer || req.body?.deciderName || 'Advisor';
      const step = req.body?.step || 'mentor';
      const tabId = req.body?.tabId;
      if (!leaveId || !decision) {
        return res.status(400).json({ ok: false, error: 'leaveId and decision required' });
      }

      let updatedLeave: any = null;
      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const target = cur.leaveRequests.find((l) => l.id === leaveId);
        if (!target) return cur;

        const nextStatus = decision === 'approved' ? 'Approved' : 'Rejected';
        const nextLeaves = cur.leaveRequests.map((l) => {
          if (l.id === leaveId) {
            const nextL = {
              ...l,
              status: nextStatus,
              reviewer_remarks: reviewerRemarks,
              rejection_reason: decision === 'rejected' ? reviewerRemarks : l.rejection_reason,
              approvals: [
                ...(Array.isArray(l.approvals) ? l.approvals : []),
                {
                  step,
                  approver_name: reviewerName,
                  decision,
                  comment: reviewerRemarks,
                  decided_at: new Date().toISOString(),
                },
              ],
            };
            updatedLeave = nextL;
            return nextL;
          }
          return l;
        });

        const notice = {
          id: `notif-leave-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: `Leave Request ${nextStatus}: ${target.type || 'Academic'} Leave`,
          body: `Your leave request for ${target.from_date || target.dates_label || 'requested dates'} has been ${nextStatus.toLowerCase()} by ${reviewerName}. Remarks: ${reviewerRemarks || 'Processed'}.`,
          category: 'Academic',
          audience_scope: 'role',
          audience_target: target.applicant_profile_id || target.applicant_id,
          college_code: target.college_code,
          is_public: false,
          pinned: false,
          publish_at: new Date().toISOString(),
          created_by_name: reviewerName,
          created_by_role: 'faculty',
          read_count: 0,
          total_target_count: 1,
          is_read: false,
        };

        return writeDbToFile({
          ...cur,
          leaveRequests: nextLeaves,
          notices: [notice, ...cur.notices],
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, leave: updatedLeave, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to decide leave' });
    }
  });

  // 18. POST /api/portal/ticket & /api/portal/ticket-reply
  app.post('/api/portal/ticket', async (req: Request, res: Response) => {
    try {
      const { ticket, tabId } = req.body || {};
      if (!ticket || !ticket.subject || !ticket.body) {
        return res.status(400).json({ ok: false, error: 'Ticket details incomplete' });
      }

      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const ticketId = ticket.id || `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const cleanTicket = {
          ...ticket,
          id: ticketId,
          status: ticket.status || 'open',
          created_at: ticket.created_at || new Date().toISOString(),
        };

        return writeDbToFile({
          ...cur,
          tickets: [cleanTicket, ...cur.tickets.filter((t) => t.id !== cleanTicket.id)],
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to create ticket' });
    }
  });

  app.post('/api/portal/ticket-reply', async (req: Request, res: Response) => {
    try {
      const { ticketId, reply, status, tabId } = req.body || {};
      if (!ticketId || !reply || !reply.message) {
        return res.status(400).json({ ok: false, error: 'ticketId and reply required' });
      }

      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const nextTickets = cur.tickets.map((t) => {
          if (t.id === ticketId) {
            const replies = Array.isArray(t.replies) ? t.replies : [];
            return {
              ...t,
              status: status || t.status,
              resolution_note: status === 'resolved' ? reply.message : t.resolution_note,
              updated_at: new Date().toISOString(),
              replies: [...replies, { ...reply, id: `rpl-${Date.now()}`, created_at: new Date().toISOString() }],
            };
          }
          return t;
        });

        return writeDbToFile({
          ...cur,
          tickets: nextTickets,
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to reply to ticket' });
    }
  });

  // 19. POST /api/portal/update-profile — Atomic Profile Update
  app.post('/api/portal/update-profile', async (req: Request, res: Response) => {
    try {
      const { id, patch, tabId } = req.body || {};
      if (!id || !patch) return res.status(400).json({ ok: false, error: 'id and patch required' });

      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const nextProfiles = cur.profiles.map((p) => (p.id === id ? { ...p, ...patch, updated_at: new Date().toISOString() } : p));
        const nextStudents = cur.students.map((s) =>
          s.profile_id === id
            ? {
                ...s,
                full_name: patch.full_name || s.full_name,
                email: patch.email || s.email,
                phone: patch.phone || s.phone,
                enrolment_no: patch.identifier_no || s.enrolment_no,
                department_code: patch.department || s.department_code,
              }
            : s
        );

        return writeDbToFile({
          ...cur,
          profiles: nextProfiles,
          students: nextStudents,
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to update profile' });
    }
  });

  // 20. POST /api/portal/update-settings — Atomic System Thresholds
  app.post('/api/portal/update-settings', async (req: Request, res: Response) => {
    try {
      const { settings, tabId } = req.body || {};
      if (!settings) return res.status(400).json({ ok: false, error: 'settings required' });

      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        return writeDbToFile({
          ...cur,
          settings: { ...cur.settings, ...settings },
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to update settings' });
    }
  });

  // 21. POST /api/portal/subject — Create or Edit Subject
  app.post('/api/portal/subject', async (req: Request, res: Response) => {
    try {
      const raw = req.body?.subject || req.body || {};
      const tabId = req.body?.tabId;
      const subName = (raw.name || '').trim();
      const subCode = (raw.code || '').trim().toUpperCase();
      if (!subName || !subCode) {
        return res.status(400).json({ ok: false, error: 'Subject code and subject name are required' });
      }

      const preCur = await readDbFromFile();
      const subId = raw.id || `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const cleanSub = {
        ...raw,
        id: subId,
        code: subCode,
        name: subName,
        credits: Number(raw.credits) || 3,
        semester: Number(raw.semester) || 1,
        college_code: (raw.college_code || '').trim().toUpperCase(),
        status: raw.status || 'active',
        updated_at: new Date().toISOString(),
      };

      const duplicate = (preCur.subjects || []).find(
        (s: any) =>
          s.id !== subId &&
          (s.code || '').trim().toUpperCase() === subCode &&
          (s.college_code || '').trim().toUpperCase() === cleanSub.college_code
      );
      if (duplicate && !raw.id) {
        return res.status(400).json({ ok: false, error: `Subject with code ${subCode} already exists in this college.` });
      }

      let savedSubject: any = cleanSub;
      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const filtered = (cur.subjects || []).filter((s: any) => s.id !== subId);
        return writeDbToFile({
          ...cur,
          subjects: [cleanSub, ...filtered],
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, subject: savedSubject, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to save subject' });
    }
  });

  // 22. POST /api/portal/mentor-request — Student Submits Mentoring Request
  app.post('/api/portal/mentor-request', async (req: Request, res: Response) => {
    try {
      const { studentId, studentName, mentorId, mentorName, notes, collegeCode, tabId } = req.body || {};
      if (!studentId || !mentorId) {
        return res.status(400).json({ ok: false, error: 'studentId and mentorId are required' });
      }

      let savedReq: any = null;
      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const reqId = `mrq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newReq = {
          id: reqId,
          student_id: studentId,
          student_name: studentName || 'Student',
          mentor_id: mentorId,
          mentor_name: mentorName || 'Faculty Mentor',
          notes: notes || '',
          college_code: collegeCode || '',
          status: 'pending',
          created_at: new Date().toISOString(),
        };
        savedReq = newReq;

        const existingRequests = (cur.mentorRequests || []).filter(
          (r: any) => !(r.student_id === studentId && r.status === 'pending')
        );

        return writeDbToFile({
          ...cur,
          mentorRequests: [newReq, ...existingRequests],
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, request: savedReq, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to submit mentor request' });
    }
  });

  // 23. POST /api/portal/reassign-mentor — Assign or Confirm Mentor
  app.post('/api/portal/reassign-mentor', async (req: Request, res: Response) => {
    try {
      const { studentId, mentorId, mentorName, decision, tabId } = req.body || {};
      if (!studentId || !mentorId) {
        return res.status(400).json({ ok: false, error: 'studentId and mentorId required' });
      }

      let savedStudent: any = null;
      const updatedDb = await withWriteLock(async () => {
        const cur = await readDbFromFile();
        const nextStudents = cur.students.map((s: any) =>
          s.id === studentId || s.profile_id === studentId
            ? { ...s, mentor_id: mentorId, mentor_name: mentorName || s.mentor_name, updated_at: new Date().toISOString() }
            : s
        );

        const nextRequests = (cur.mentorRequests || []).map((r: any) =>
          r.student_id === studentId
            ? { ...r, status: decision === 'rejected' ? 'rejected' : 'approved', updated_at: new Date().toISOString() }
            : r
        );

        savedStudent = nextStudents.find((s: any) => s.id === studentId || s.profile_id === studentId);

        const stu = cur.students.find((s: any) => s.id === studentId || s.profile_id === studentId);
        const notice = {
          id: `notif-mnt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: `Faculty Mentor Assigned: ${mentorName || mentorId}`,
          body: `You have been officially assigned to faculty advisor ${mentorName || mentorId}. You can schedule mentoring sessions and review academic advising notes in the Mentor tab.`,
          category: 'Academic',
          audience_scope: 'role',
          audience_target: stu?.profile_id || studentId,
          college_code: stu?.college_code || '',
          is_public: false,
          pinned: false,
          publish_at: new Date().toISOString(),
          created_by_name: 'College Administration',
          created_by_role: 'Organizer',
          read_count: 0,
          total_target_count: 1,
          is_read: false,
        };

        return writeDbToFile({
          ...cur,
          students: nextStudents,
          mentorRequests: nextRequests,
          notices: deduplicateAndCapNotices([notice, ...cur.notices]),
        });
      });

      broadcastDatabaseUpdate(updatedDb, tabId);
      return res.json({ ok: true, student: savedStudent, db: updatedDb });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to reassign mentor' });
    }
  });

  // Mount Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Campus Portal JSON Server + Vite running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
