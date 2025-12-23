# Frontend Lib Overview (frontend/lib/)

Purpose
- Centralize API access patterns and environmental configuration.

What it does
- Defines API base URLs and node endpoints from env.
- Wraps intake submission, case retrieval, and sharing requests.
- Creates SSE event streams for live updates.

Engineering intent
- Single source of truth for service endpoints.
- Thin wrappers to keep components clean and declarative.

Libraries used
- browser fetch API
- EventSource for SSE
