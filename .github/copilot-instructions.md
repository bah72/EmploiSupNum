# Copilot / AI Agent Instructions — SupNum Timetable

Summary
- This is a small Next.js (App Router) TypeScript app that renders an editable weekly timetable in the browser. The single-page UI and most logic live in `app/page.tsx`.

Key files
- Main UI & logic: [app/page.tsx](app/page.tsx)
- App shell / fonts: [app/layout.tsx](app/layout.tsx)
- Small presentational header: [app/components/Header.tsx](app/components/Header.tsx)
- Project scripts: [package.json](package.json)

Architecture & patterns
- The app is client-heavy: `app/page.tsx` begins with `"use client"`. Expect runtime-only DOM APIs and local state (no server endpoints).
- Data source: `MASTER_DB` (in `app/page.tsx`) is the canonical in-file dataset used to seed `assignmentRows`.
- Persistence: state is persisted to `localStorage` using versioned keys: `supnum_rows_v31`, `supnum_schedule_v31`, `supnum_config_v31`. Do NOT rename keys without adding a migration step.
- Schedule key format (important): keys in `schedule` use `w{week}|{group}|{day}|{time}` (e.g. `w1|Groupe 1|Lun|08:15-09:30`). Many helpers and conflict detection depend on this string format.
- Drag & drop: built on `@dnd-kit/core`. Copy-vs-move is detected via `ctrl/meta` during drag (copy creates a new id).
- PDF export: `html-to-image` -> `toPng(element)` then `jspdf` uses the element with id `calendar-capture-zone`.
- Styling: Tailwind CSS and `next/font` (Geist) are used. Grid sizing for the calendar is defined in `gridLayoutClass` inside `app/page.tsx`.

Developer workflows
- Run dev server: `npm run dev` (uses `next dev`).
- Build: `npm run build` then `npm run start` for production serving.
- Lint: `npm run lint` (simple `eslint` invocation).

Conventions & pitfalls to watch for
- Much of the app is contained in a single large component file. When making changes prefer small, local edits rather than wholesale refactors.
- Client-only guard: `if (!isClient) return null;` — avoid server-side access to `window`/`localStorage` without this guard.
- ID generation: course IDs are random strings via `Math.random().toString(36).substr(2, 9)`; other code relies on stable string equality.
- Local dataset reload: `loadFullDataset()` regenerates rows; it prompts via `confirm()` in the browser.
- Conflict detection logic depends on teacher names being stored in `teacher` and split by `/`. Avoid changing this shape silently.

Examples (what to change where)
- Add a time slot or change default weeks: update the initial `config` object in [app/page.tsx](app/page.tsx) (`timeSlots`, `totalWeeks`, `startDate`) or use the in-UI Config tab.
- Change calendar export layout: edit the element with id `calendar-capture-zone` and update the export routine `handleExportPDF()`.
- Customize rooms list: edit `ALL_ROOMS` constant in [app/page.tsx](app/page.tsx).

Integration points / dependencies
- `@dnd-kit/core` for drag/drop — touch carefully around event activator/keyboard modifiers.
- `html-to-image` + `jspdf` for PDF export — tests or changes should verify pixel ratios and background color handling.

When editing or extending
- Keep changes TypeScript-safe; `tsconfig.json` uses `strict: true`.
- Preserve localStorage versions or add a migration function when changing stored shapes.
- Run `npm run dev` to iterate; the UI is interactive and many behaviors are observable only in the browser (drag/drop, export, modals).

Notes for future agents
- There was no existing `.github/copilot-instructions.md` to merge with — this file is newly added.
- If you need deeper testing or CI, note this repo currently has no tests or GitHub workflows; propose adding a minimal `next build` check.

If anything here is unclear or you want more detail (example edits, migration snippets, or a test harness), tell me which area to expand.
