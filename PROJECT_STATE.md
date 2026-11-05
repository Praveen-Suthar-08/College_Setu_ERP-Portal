# PROJECT_STATE.md — Campus Portal

## 1. Tech Stack (Free Tier Only)
- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS v4 with CSS variables (`--ink`, `--paper`, `--surface`, `--line`, `--accent`, `--brass`, `--success`, `--warning`, `--danger`)
- **Typography**: `Fraunces` (editorial display serif), `DM Sans` (body prose), `JetBrains Mono` (tabular numerals)
- **Icons & Charts**: `lucide-react` (consistent `1.75` stroke width, zero emojis), `recharts`
- **Validation & Forms**: `zod` + controlled accessible form components
- **Database, Auth & RLS**: `@supabase/supabase-js` (`supabase/migrations/001_campus_portal_schema_and_rls.sql` + `supabase/functions/invite-user/index.ts`)
- **PDF Generation**: `jspdf` (client-side Fee Receipts, Semester Report Cards, and Examination Hall Tickets)
- **PWA**: `vite-plugin-pwa` with static-asset-only caching and in-app install prompt (`PWAInstallButton`)

## 2. Folder Structure
```text
/
├── index.html
├── metadata.json
├── package.json
├── PROJECT_STATE.md
├── vite.config.ts
├── public/
│   ├── icon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── supabase/
│   ├── functions/invite-user/index.ts
│   └── migrations/001_campus_portal_schema_and_rls.sql
└── src/
    ├── App.tsx
    ├── index.css
    ├── main.tsx
    ├── components/
    │   ├── auth/AuthModalAndViews.tsx
    │   ├── landing/LandingPage.tsx
    │   ├── portal/
    │   │   ├── AccountsAndAdminModule.tsx
    │   │   ├── FacultyAndHodModule.tsx
    │   │   ├── PortalShell.tsx
    │   │   └── StudentAndParentModule.tsx
    │   ├── pwa/PWAInstallButton.tsx
    │   └── ui/DesignSystem.tsx
    ├── data/seedData.ts
    ├── lib/supabase.ts
    ├── types/portal.ts
    └── utils/
        ├── finance.ts
        └── pdfGenerator.ts
```

## 3. Completed Modules (Prompts 0 through 14)
- [x] **Prompt 0 & 1**: Master Context, Architecture, Role Navigation Contract, and Route Guards
- [x] **Prompt 2**: Design System, Light/Dark CSS Tokens, Typography Scale, Base Components, and `/design` Showcase
- [x] **Prompt 3**: 12-Section Editorial Landing Page with Role Switcher, Sticky Feature Showcase, Count-Up Figures, Dark Ink Security Section, Public Notices, and FAQ Accordion
- [x] **Prompt 4**: Complete Supabase Postgres Schema (23 tables), Immutability Triggers, Default-Deny Row Level Security Policies, Fictional Seed Dataset, and 15-Query Verification Checklist
- [x] **Prompt 5**: Complete Authentication System (Login, Student Pending Sign-Up, Password Strength Meter, Common-Password Blocklist, 5-Attempt Lockout, Staff Invite Acceptance, Mandatory Staff TOTP Challenge)
- [x] **Prompt 6**: Authenticated App Shell, Collapsible Sidebar, Mobile Drawer, Command Palette (`Ctrl/Cmd + K`), and 403 Not Authorised Route Boundary Guard
- [x] **Prompt 7**: Student Module (Dashboard, Attendance Margin Calculator, Credit-Weighted SGPA/CGPA Results, Report Card & Hall Ticket PDFs, Mentor Slot Booking, Shared Notes)
- [x] **Prompt 8**: Faculty Module (60-Student Fast Attendance Grid under 60s, 24-Hour Session Lock, Post-24h HOD Correction Request, Marks Entry Validation, Private vs Shared Mentor Notes)
- [x] **Prompt 9**: Fees Module (Integer-Paise Engine, Unit Tests, Fee Structure Builder, Scholarships, Immutable Numbered Receipts, Reversal-Only Corrections)
- [x] **Prompt 10**: Multi-Step Leave Workflow (`Student -> Mentor -> HOD` for >3 days or exam dates) & Audience-Targeted Notices with Read Receipts
- [x] **Prompt 11**: Parent (Read-Only Child Switcher & Single-Use Link Code), HOD (Department Heatmap, Escalated Leaves, Mentor Rebalancing), Admin (Student Verification Queue, CSV Dry-Run Import, Tickets), and Super Admin (Append-Only Audit Logs with Step-Up Password Export, System Settings)
- [x] **Prompt 12, 13 & 14**: Accessibility, Reduced Motion, Security Audit Verification, and Installable PWA

## 4. Design Tokens
| Token | Light Mode | Dark Mode | Purpose |
| :--- | :--- | :--- | :--- |
| `--ink` | `#0E1A2B` | `#EEF1F5` | Primary text, dark sections |
| `--paper` | `#F6F4EF` | `#0B1220` | Warm off-white page background |
| `--surface` | `#FFFFFF` | `#121B2D` | Cards, tables |
| `--line` | `#E3DFD6` | `#223048` | Hairline borders, dividers |
| `--accent` | `#1F4AB8` | `#6C93F0` | Primary buttons, links, active nav |
| `--brass` | `#B07D1E` | `#D9A441` | Sparing institutional highlight |
| `--success` | `#1E7A4C` | `#4CC38A` | Present, paid, approved |
| `--warning` | `#B7791F` | `#E5B04A` | Late, due soon, pending |
| `--danger` | `#B3261E` | `#F0716A` | Absent, overdue, rejected |

## 5. Production Deployment Checklist
1. Run `supabase/migrations/001_campus_portal_schema_and_rls.sql` in the Supabase SQL Editor.
2. Deploy `supabase/functions/invite-user/index.ts` and configure `SUPABASE_SERVICE_ROLE_KEY` in Supabase Edge Function secrets (never in frontend `.env`).
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting provider (Vercel, Netlify, or Cloudflare Pages).
4. Replace the architectural campus plates in `src/components/ui/DesignSystem.tsx` with the institution's own campus photographs.
