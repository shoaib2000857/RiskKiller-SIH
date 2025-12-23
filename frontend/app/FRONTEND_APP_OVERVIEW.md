# Frontend App Router Overview (frontend/app/)

Purpose
- Next.js App Router entry points and page-level layouts.

Pages
- page.js: primary analyst dashboard with intake, events, cases, and sharing.
- simple/page.js: simplified intake flow with lighter UI and focused metrics.
- superuser/page.js: admin-level console for federation, heatmaps, and monitoring.

Supporting files
- layout.js: root shell and metadata.
- globals.css: base styles and Tailwind layers.

Notable design traits
- Multiple UI tiers to demonstrate role-based UX thinking.
- Real-time resilience with reconnect logic for the event stream.
