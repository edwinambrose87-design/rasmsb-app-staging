# RASMSB Management Ecosystem

Security operations management application for Rashid Azlan Security. The app is built with Next.js, React, TypeScript, Supabase, Google Maps, and QR generation workflows.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth and database
- Google Maps via `@react-google-maps/api`
- QR generation via `qrcode`

## Main Routes

- `/login` - Admin and manager login with email/password, Google OAuth, password reset, and dynamic branding.
- `/dashboard` - Main authenticated operations dashboard.
- `/dashboard/project-directory` - Project/site records, building manager details, maps, geofence settings, and assigned guards.
- `/dashboard/guards` - Guard directory with personnel registration, editing, assignment, and deletion flows.
- `/dashboard/Clocking_Report` - Patrol clocking report view backed by Supabase clocking tables.
- `/dashboard/Clocking_Report/checkpoints` - Master checkpoint creation and QR code downloads.
- `/dashboard/global-branding` - Organization name, logo, theme color, and brightness settings.
- `/mobile` - Guard or fixed-terminal mobile login.
- `/mobile/personal_dashboard` - Guard mobile dashboard with attendance selfie capture.
- `/mobile/company_terminal` - Shared fixed-device terminal patrol flow.

## Supabase Tables Referenced

- `profiles`
- `projects`
- `guards`
- `global_branding`
- `clocking_master_checkpoints`
- `clocking_rounds`
- `device_terminals`
- `guard_attendance`

## Local Development

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

Then run:

```bash
npm run dev
```

The default development script uses Webpack because Turbopack can be memory-heavy on some Windows machines. To test Turbopack manually, run:

```bash
npm run dev:turbo
```

## Verification

```bash
npm run lint
npm run build
```

Both commands currently pass.

## Notes For Future Work

- This project uses Next.js 16. Read `node_modules/next/dist/docs/` before changing framework-sensitive files.
- The request gateway uses `src/proxy.ts`, which is the Next.js 16 replacement for `middleware.ts`.
- Many screens are still prototype-style and use inline styles. Refactor gradually by module rather than rewriting everything at once.
- Several dashboard pages still use sample data and should be connected to Supabase in future passes.
- Regular `<img>` elements are allowed intentionally because the app renders dynamic remote, uploaded, and base64 image sources.
