# 🎓 College Setu — Modern Institutional Campus & ERP Portal

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React 19](https://img.shields.io/badge/React-19.0.1-61dafb.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.3-38b2ac.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase Postgres](https://img.shields.io/badge/Database-Supabase_RLS-3ecf8e.svg?logo=supabase)](https://supabase.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-ff69b4.svg)](https://web.dev/progressive-web-apps/)
[![GitHub Repository](https://img.shields.io/badge/GitHub-College__Setu-181717.svg?logo=github)](https://github.com/Praveen-Suthar-08/College_Setu.git)

**Repository Link:**  
🔗 **(https://github.com/Praveen-Suthar-08/College_Setu_ERP-Portal.git)**

<p align="center">
  <em>"Education is the sacred bridge between aspiration and achievement. College Setu provides the resilient digital infrastructure that unifies students, faculty, parents, and administrative leadership in pursuit of academic excellence."</em>
</p>

</div>

---

## 📖 Table of Contents

- [Overview & Vision](#-overview--vision)
- [Key Architectural Highlights](#-key-architectural-highlights)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Deep-Dive Feature Modules](#-deep-dive-feature-modules)
  - [1. Rapid Attendance Engine & Session Lock](#1-rapid-attendance-engine--session-lock)
  - [2. Integer-Paise Financial Engine & Fee Management](#2-integer-paise-financial-engine--fee-management)
  - [3. Academic Timetable, Exams & Result Cards](#3-academic-timetable-exams--result-cards)
  - [4. Multi-Tier Leave Escalation Workflow](#4-multi-tier-leave-escalation-workflow)
  - [5. Faculty Mentoring & Student Support Registry](#5-faculty-mentoring--student-support-registry)
  - [6. Targeted Notice Circulars with Read Receipts](#6-targeted-notice-circulars-with-read-receipts)
  - [7. Coursework, Labs & Grievance Helpdesk](#7-coursework-labs--grievance-helpdesk)
  - [8. Security, TOTP & Step-Up Audit Trail](#8-security-totp--step-up-audit-trail)
- [Design Tokens & Institutional Aesthetics](#-design-tokens--institutional-aesthetics)
- [Technology Stack Matrix](#-technology-stack-matrix)
- [Project Directory Structure](#-project-directory-structure)
- [Database Schema & Data Models](#-database-schema--data-models)
- [Installation & Quick Start](#-installation--quick-start)
- [Environment Variables Configuration](#-environment-variables-configuration)
- [Multi-Tab Session Isolation Engine](#-multi-tab-session-isolation-engine)
- [Production Deployment Guide](#-production-deployment-guide)
- [Contributing & Code Standards](#-contributing--code-standards)
- [Authors & Acknowledgments](#-authors--acknowledgments)
- [License](#-license)

---

## 🏛️ Overview & Vision

**College Setu** (*"Setu"* meaning *Bridge* in Sanskrit) is an enterprise-grade, high-performance Campus Management & Enterprise Resource Planning (ERP) platform engineered specifically for modern universities, colleges, and polytechnic institutes.

Designed to replace fragmented spreadsheets, slow legacy portals, and paper trails, College Setu provides a unified, real-time operating system that connects all stakeholders under strict role-based access control and high institutional security standards.

### Core Problems College Setu Solves:
1. **Attendance Latency & Proxy Logging**: Traditional portals require 15–20 minutes to take attendance. College Setu's high-speed batch grid processes a class of 60 students in under 60 seconds with strict 24-hour cryptographic locking.
2. **Financial Drift & Floating-Point Rounding**: Tuition, hostel, lab, and examination fees are calculated in immutable integer paise (1 INR = 100 paise), eliminating rounding discrepancies with tamper-proof numbered receipts and reversal-only ledgers.
3. **Disjointed Communication**: Circulars, exam notifications, and urgent campus alerts feature audience targeting (by department, semester, role) with verifiable student/parent read receipts.
4. **Parental Disconnect**: Parents gain a real-time, read-only window into attendance warnings, semester fee ledgers, and academic progress with seamless multi-child switching.

---

## ⚡ Key Architectural Highlights

- **Dual-Mode Persistence Architecture**:
  - **Cloud-Native Mode**: PostgreSQL database with Supabase Row-Level Security (RLS) enforcing default-deny multi-tenant isolation.
  - **Local/Self-Hosted Engine**: Zero-setup file-backed JSON database engine (`data/portal-db.json`) with auto-reconciliation, automated backups, and instant developer seed data.
- **Client-Side PDF Generation**: High-fidelity vector generation of Fee Receipts, Examination Hall Tickets with QR codes, and Semester Grade Cards via `jspdf` without server bottlenecks.
- **Progressive Web App (PWA)**: Full offline service worker caching, instant app-shell delivery, and installability on Android, iOS, Windows, and macOS.
- **Multi-Tab Session Isolation**: Independent tab IDs prevent cross-tab state pollution when an administrator tests faculty or student roles simultaneously.
- **Editorial Typography & Visual Hierarchy**: Built with Google's display serif `Fraunces`, UI workhorse `DM Sans`, and tabular numeral monospace `JetBrains Mono`.

---

## 👥 Role-Based Access Control (RBAC)

College Setu provides eight specialized, granularly gated workspace roles:

```
                                  ┌─────────────────────────────┐
                                  │      Super Administrator    │
                                  │   (System-wide Governance)  │
                                  └──────────────┬──────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   │                                                           │
     ┌─────────────▼─────────────┐                               ┌─────────────▼─────────────┐
     │    College Administrator  │                               │      Accounts Officer     │
     │ (Admissions, Users, Code) │                               │  (Fee Ledgers & Receipts) │
     └─────────────┬─────────────┘                               └─────────────┬─────────────┘
                   │                                                           │
     ┌─────────────┴─────────────┐                                             │
     │                           │                                             │
┌────▼────┐                 ┌────▼────┐                                        │
│   HOD   │                 │ Faculty │                                        │
└────┬────┘                 └────┬────┘                                        │
     │                           │                                             │
     └─────────────┬─────────────┘                                             │
                   │                                                           │
     ┌─────────────┴─────────────┐                                             │
     │                           │                                             │
┌────▼──────────┐           ┌────▼──────────┐                                  │
│    Student    │◄──────────┤ Parent/Family │◄─────────────────────────────────┘
└───────────────┘           └───────────────┘
```

| Role | Access Scope & Key Responsibilities |
| :--- | :--- |
| **Super Admin** | System settings, cross-college workspace registry, emergency maintenance modes, append-only security audit log export with step-up verification. |
| **College Admin** | Student verification queue, faculty onboarding, bulk CSV user imports with pre-flight dry runs, institutional notice broadcasts, grievance ticket resolution. |
| **HOD (Head of Dept)** | Departmental performance heatmap, attendance shortfall escalation, faculty mentor rebalancing, leave approvals (>3 days / exam periods), session unlock overrides. |
| **Faculty / Mentor** | Rapid attendance register (<60s per session), continuous internal assessment (CIA) grading, student mentor diary (private vs shared notes), meeting scheduling. |
| **Accounts Officer** | Fee structure creator, semester quota assignment, concession/scholarship allocation, cash/UPI/DD payment reconciliation, immutable receipt generation. |
| **Student** | Live attendance tracker with margin calculator ("How many classes can I miss/need to attend?"), SGPA/CGPA result analytics, fee payment portal, hall ticket download. |
| **Parent / Guardian** | Read-only transparent portal, single-use student link codes, multi-child switcher, direct semester fee clearing, circular read confirmations. |
| **Librarian / Staff** | Institutional catalog resources, book reservation status, student clearance verification. |

---

## 🔍 Deep-Dive Feature Modules

### 1. Rapid Attendance Engine & Session Lock
- **Sub-Minute Batch Entry**: Faculty can mark attendance for an entire classroom with single-tap toggle presets (`Mark All Present`, `Toggle Absentees`).
- **24-Hour Immutable Lock**: Once an attendance session is submitted, it automatically locks after 24 hours to prevent unauthorized retrospective alteration.
- **Formal HOD Correction Pipeline**: Any post-lock revision requires an auditable justification request sent to the Head of Department with full delta logging.
- **Safe Attendance Margin Calculator**: Students see exact mathematical indicators:
  $$\text{Margin} = \left\lfloor \frac{\text{Attended} - (\text{Total} \times \text{Threshold})}{1 - \text{Threshold}} \right\rfloor$$
  instantly informing them whether they can afford an absence or how many consecutive lectures they must attend to regain hall ticket eligibility.

### 2. Integer-Paise Financial Engine & Fee Management
- **Zero Rounding Drift**: All monetary operations are calculated and stored in integer paise:
  $$\text{Amount (Paise)} = \text{Amount (INR)} \times 100$$
- **Comprehensive Structure Builder**: Configurable semester fee heads (Tuition, Laboratory, Library, Sports, Examination, Hostel, Campus Infrastructure).
- **Scholarship & Concession Engine**: Merit-based, sports quota, and economic concession credits are deducted before net invoice generation.
- **Numbered Receipts**: Cryptographically sequentially numbered receipts (`REC-2026-XXXX`) generated directly in PDF format with institution seal and timestamp.
- **Reversal-Only Bookkeeping**: In accordance with GAAP institutional practices, erroneous transactions cannot be deleted; they must be balanced by an authorized reversal journal entry.

### 3. Academic Timetable, Exams & Result Cards
- **Dynamic Weekly Timetable**: Day-by-day slot view with lecture halls, laboratory identifiers, and faculty designations.
- **Grade Cards with Credit-Weighting**: Automated calculation of Semester Grade Point Average (SGPA) and Cumulative Grade Point Average (CGPA):
  $$\text{SGPA} = \frac{\sum (\text{Course Credit} \times \text{Grade Point})}{\sum \text{Course Credits}}$$
- **Automated Hall Ticket Generation**: Verifies minimum attendance threshold (default 75%) and fee clearance before allowing vector PDF download with security barcode.

### 4. Multi-Tier Leave Escalation Workflow
- **Rules-Based Auto-Routing**:
  - Leave duration $\le 3$ days (non-exam period) $\rightarrow$ Routed directly to designated **Faculty Mentor**.
  - Leave duration $> 3$ days or falling within an **Examination Window** $\rightarrow$ Automatically escalated to the **Head of Department (HOD)**.
- **Document Attachment Support**: Medical certificates, conference acceptance letters, and guardian consent slips can be attached.
- **Full State Machine**: Tracked from `Draft` $\rightarrow$ `Pending Mentor` $\rightarrow$ `Pending HOD` $\rightarrow$ `Approved` / `Rejected` with historical comments.

### 5. Faculty Mentoring & Student Support Registry
- **Confidential Mentoring Records**: Faculty mentors can record session notes with granular visibility flags:
  - `Shared`: Visible to the student and guardian for goal tracking.
  - `Private Mentor-Only`: Restricted to faculty and HOD for sensitive student pastoral care.
- **Slot Booking**: Direct appointment scheduling for academic advising, career guidance, or project reviews.

### 6. Targeted Notice Circulars with Read Receipts
- **Multi-Vector Targeting**: Broadcast circulars across specific roles (`Students`, `Faculty`, `Parents`, `Staff`), specific departments, or specific semester cohorts.
- **Verifiable Read Receipts**: Displays exact percentage of targeted recipients who have acknowledged and opened the circular.
- **Categorization**: Urgent Alerts, Academic Deadlines, Fee Reminders, Holiday Announcements, and Extracurricular Events.

### 7. Coursework, Labs & Grievance Helpdesk
- **Lab & Coursework Submissions**: Track assignment deadlines, upload statuses, and faculty marks with rubric breakdowns.
- **Institutional Helpdesk**: Anonymous or named grievance ticketing categorized into Infrastructure, Academic, Harassment, Fee Ledger, or Technical Support with SLA countdowns.

### 8. Security, TOTP & Step-Up Audit Trail
- **Brute-Force Protection**: Automatic account lock after 5 consecutive failed login attempts.
- **Password Hygiene**: Zod-enforced complexity with common-password blocklist matching.
- **Mandatory Staff TOTP**: Time-based One-Time Password two-factor authentication challenge for all administrative and faculty profiles.
- **Step-Up Verification for Audit Logs**: Exporting CSV audit logs requires the operator to re-authenticate with their password, preventing terminal hijacking.

---

## 🎨 Design Tokens & Institutional Aesthetics

College Setu employs a purpose-built editorial theme inspired by classical academia and modern Scandinavian typography:

| Token Name | Light Mode Hex | Dark Mode Hex | Institutional Purpose |
| :--- | :--- | :--- | :--- |
| `--ink` | `#0E1A2B` | `#EEF1F5` | Primary headlines, dark contrast cards, executive headers |
| `--paper` | `#F6F4EF` | `#0B1220` | Architectural warm canvas, off-white foundation |
| `--surface` | `#FFFFFF` | `#121B2D` | High-clarity cards, modal dialogs, data table backgrounds |
| `--line` | `#E3DFD6` | `#223048` | Hairline dividers, subtle borders, table grids |
| `--accent` | `#1F4AB8` | `#6C93F0` | Primary navigational callouts, active links, focus rings |
| `--brass` | `#B07D1E` | `#D9A441` | Institutional crests, honors badges, academic distinctions |
| `--success` | `#1E7A4C` | `#4CC38A` | Attendance present, fees settled, leaves approved |
| `--warning` | `#B7791F` | `#E5B04A` | Attendance warning zone, pending approvals, due soon |
| `--danger` | `#B3261E` | `#F0716A` | Critical attendance shortage, fee overdue, rejected status |

---

## 🛠️ Technology Stack Matrix

```text
┌────────────────────────────────────────────────────────────────────────┐
│                               FRONTEND                                 │
│  React 19  │  TypeScript  │  Vite  │  Tailwind CSS v4  │  Motion       │
│  Lucide Icons  │  Recharts Data Viz  │  jsPDF  │  Vite PWA Plugin      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                             BACKEND & API                              │
│  Express.js API Router  │  tsx Execution Engine  │  Zod Schema Guards   │
│  Multi-Tab Session Sync Engine  │  Automated Data Healing & Backup     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                         DATABASE & PERSISTENCE                         │
│  Supabase Postgres with RLS  │  Local JSON DB  │  Immutability Triggers│
└────────────────────────────────────────────────────────────────────────┘
```

- **Frontend Core**: React 19, TypeScript, Vite, `@tailwindcss/vite`
- **Animation & Transitions**: `motion` (Framer Motion v12)
- **Vector Documents**: `jspdf` for client-side cryptographic-grade PDF exports
- **Charts & Telemetry**: `recharts`, `d3`
- **Data Validation**: `zod`
- **Icons**: `lucide-react` (uniform 1.75 stroke width, zero distracting emojis)
- **Backend Server**: Node.js, Express, `tsx`
- **AI Integration**: `@google/genai` (Google Gemini API ready)

---

## 📂 Project Directory Structure

```text
College_Mgmt_Portal/
├── data/
│   └── portal-db.json                    # Auto-seeded local JSON database
├── public/
│   ├── icon.svg                          # Vector institutional brand badge
│   ├── robots.txt                        # Search engine crawling policies
│   └── sitemap.xml                       # Structured URL index
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthModalAndViews.tsx     # Login, TOTP challenge, registration & lockout
│   │   ├── landing/
│   │   │   └── LandingPage.tsx           # 12-section editorial public landing portal
│   │   ├── portal/
│   │   │   ├── academics/
│   │   │   │   └── ExaminationsAndGradeCardsModule.tsx  # Exams, hall tickets & SGPA
│   │   │   ├── AccountsAndAdminModule.tsx# Fee ledger, user management & settings
│   │   │   ├── AdminPlatformWorkspace.tsx# Multi-college workspace switcher
│   │   │   ├── FacultyAndHodModule.tsx   # Fast attendance, marks, mentor diary
│   │   │   ├── PortalShell.tsx           # Master navigation shell & command palette
│   │   │   ├── ProfileManagementView.tsx # Identity, bio, credentials & security
│   │   │   └── StudentAndParentModule.tsx# Student hub, parent link & fee payments
│   │   ├── pwa/
│   │   │   └── PWAInstallButton.tsx      # In-app install banner & offline status
│   │   └── ui/
│   │       └── DesignSystem.tsx          # Design tokens, typography & button library
│   ├── data/
│   │   └── seedData.ts                   # Realistic institutional seed dataset
│   ├── lib/
│   │   └── supabase.ts                   # Supabase client initialization
│   ├── types/
│   │   └── portal.ts                     # TypeScript definitions for all 23 entities
│   ├── utils/
│   │   ├── feeNotificationEngine.ts      # Automated fee alert dispatcher
│   │   ├── finance.ts                    # Integer-paise calculations & tax utils
│   │   └── pdfGenerator.ts               # jsPDF templates for receipts & hall tickets
│   ├── App.tsx                           # Master application controller & routing
│   ├── index.css                         # Tailwind CSS v4 variables & typography
│   └── main.tsx                          # React 19 entry point
├── supabase/
│   ├── functions/
│   │   └── invite-user/index.ts          # Edge function for staff invitations
│   └── migrations/
│       └── 001_campus_portal_schema_and_rls.sql # 23 Postgres tables & RLS policies
├── .env.example                          # Environment variable template
├── .gitignore                            # Production git ignore configuration
├── index.html                            # Master HTML template with fonts
├── metadata.json                         # Project manifest & capability specs
├── package.json                          # Dependencies & build scripts
├── server.ts                             # Full Express backend & local API server
├── tsconfig.json                         # TypeScript strict compiler configuration
└── vite.config.ts                        # Vite & PWA build pipeline configuration
```

---

## 🗄️ Database Schema & Data Models

The system architecture defines **23 strongly-typed tables** in Supabase PostgreSQL (replicated seamlessly in the local JSON database engine):

1. `profiles`: Master identity table with TOTP state, college association, role, and avatar.
2. `colleges`: Multi-campus institutional registry with unique college codes.
3. `departments`: Academic faculties (CSE, ECE, Mechanical, Civil, Management, etc.).
4. `courses_programs`: Degree tracks (B.Tech, M.Tech, BCA, MCA, MBA).
5. `students`: Extended academic record (Roll No, PRN, Semester, CGPA, Mentor ID).
6. `faculty`: Faculty profiles, designations, specializations, and joining dates.
7. `subjects`: Curriculum subjects with lecture/tutorial/practical credits.
8. `timetable_slots`: Day and time mappings for sections, classrooms, and teachers.
9. `attendance_sessions`: Immutable lecture records created by faculty.
10. `attendance_records`: Individual student present/absent/late/on-duty flags.
11. `attendance_corrections`: Formal revision requests submitted to HOD.
12. `fee_structures`: Institutional fee schedules segmented by department/year.
13. `fee_assignments`: Invoices bound to student accounts with net balance in paise.
14. `payments`: Tamper-proof transaction records with mode and gateway references.
15. `scholarships`: Institutional concessions applied against student balances.
16. `examinations`: Scheduled mid-term and semester-end examinations.
17. `grade_cards`: Final course grades, marks earned, and credit point totals.
18. `notices`: Circular announcements with target audience filters.
19. `notice_reads`: Read-receipt tracker tracking view timestamps.
20. `leave_requests`: Student leave submissions with mentor/HOD approval states.
21. `mentor_meetings`: Scheduled guidance sessions and confidential notes.
22. `grievance_tickets`: Helpdesk support cases with status and resolution notes.
23. `audit_logs`: Append-only security audit trail recording IP, actor, and delta.

---

## 🚀 Installation & Quick Start

Follow these simple steps to clone, configure, and launch College Setu on your local development machine:

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Package Manager**: `npm`, `pnpm`, or `bun`
- **Git**: Installed and configured

### 1. Clone the Repository
```bash
git clone [https://github.com/Praveen-Suthar-08/College_Setu.git](https://github.com/Praveen-Suthar-08/College_Setu_ERP-Portal.git)
cd College_Setu
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the sample environment file and configure your keys:
```bash
cp .env.example .env.local
```
*(See [Environment Variables Configuration](#-environment-variables-configuration) below for details).*

### 4. Start the Full-Stack Development Server
```bash
npm run dev
```

The application will start on:
- **Local Application URL**: `http://localhost:8080` (or the port specified in your console)
- **Vite Client HMR**: Running seamlessly through the Express reverse-proxy middleware.

### 5. Production Build
```bash
npm run build
npm run preview
```

---

## ⚙️ Environment Variables Configuration

Create a `.env.local` file in the root directory:

```env
# Server Port Configuration
PORT=8080

# (Optional) Google Gemini API Key for AI features
GEMINI_API_KEY=your_gemini_api_key_here

# (Optional) Supabase Cloud Database Configuration
# Leave blank to automatically use the high-performance local JSON engine
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> [!NOTE]
> When `VITE_SUPABASE_URL` is omitted, College Setu runs fully offline and locally using `data/portal-db.json`. All changes persist across restarts automatically.

---

## 🔄 Multi-Tab Session Isolation Engine

To allow administrators, developers, and QA engineers to test simultaneous interactions between students, faculty, and administrators without cross-tab session overwrites:

- Every browser tab generates a unique `tabId` stored in `sessionStorage`.
- The Express backend coordinates active sessions per tab in `activeSessions`.
- Role-switching in Tab A (e.g., viewing as Student) does **not** log out or displace Tab B (e.g., viewing as HOD).

---

## 🌐 Production Deployment Guide

### Option A: Vercel / Netlify (Frontend)
1. Push your repository to GitHub: `https://github.com/Praveen-Suthar-08/College_Setu.git`.
2. Connect the repository in Vercel or Netlify.
3. Set the build command to `npm run build` and output directory to `dist`.
4. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in environment settings.

### Option B: Docker / Node.js Host (Railway, Render, VPS)
1. Set `PORT=8080` in your host environment.
2. Build and start with:
   ```bash
   npm run build
   node --loader tsx server.ts
   ```
3. Persistent volume mapping can be mounted to `/data` to keep `portal-db.json` safe across container restarts.

### Option C: Supabase Cloud Setup
1. Open your Supabase project's **SQL Editor**.
2. Run the migration script located at [`supabase/migrations/001_campus_portal_schema_and_rls.sql`](supabase/migrations/001_campus_portal_schema_and_rls.sql).
3. Deploy the Edge Function [`supabase/functions/invite-user/index.ts`](supabase/functions/invite-user/index.ts) with your `SUPABASE_SERVICE_ROLE_KEY`.

---

## 🤝 Contributing & Code Standards

We warmly welcome contributions from the open-source community to make College Setu even more powerful!

1. **Fork the Repository**:
   Click the "Fork" button on [GitHub](https://github.com/Praveen-Suthar-08/College_Setu.git).
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-campus-enhancement
   ```
3. **Commit Your Changes**:
   Ensure all TypeScript types validate cleanly with `npm run lint`:
   ```bash
   git commit -m "feat(attendance): add biometric terminal integration hook"
   ```
4. **Push to Your Branch**:
   ```bash
   git push origin feature/amazing-campus-enhancement
   ```
5. **Open a Pull Request**:
   Describe your enhancement, attach relevant screenshots, and reference any open issues.

---

## 👥 Authors & Acknowledgments

- **Lead Architect & Developer**: **Praveen Suthar**
  - GitHub: [@Praveen-Suthar-08](https://github.com/Praveen-Suthar-08)
  - Project Repository: [College_Setu](https://github.com/Praveen-Suthar-08/College_Setu.git)

Special thanks to the open-source community, educational leaders, and campus administrators whose valuable workflows inspired the architecture of this platform.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details. You are free to use, modify, and distribute this software for educational, commercial, and personal institutional projects.

<div align="center">
  <sub>Built with dedication for educational institutions worldwide • <strong>College Setu</strong></sub>
</div>
