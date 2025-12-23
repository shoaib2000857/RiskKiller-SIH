# Components Catalog (frontend/components/)

## Purpose
Reusable UI building blocks for analysis, visualization, and control surfaces.

## Core Components
- IntakeForm: structured intake form with metadata, tags, and optional speech input.
- CaseTable: sortable list of recent analyses.
- CaseDetail: case drill-down with summary, graphs, and share workflow.
- EventsFeed: live activity stream powered by SSE events.
- MetricCard: quick stats at a glance.
- Speedometer: composite risk dial visualization.
- RadarChart: stylometric profile visualization.
- HopTraceMap: multi-hop sharing route visualization.
- FederatedBlockchain: ledger state, validation, and sync controls.
- BlockchainGraph: network topology visualization.
- WorldHeatmapLeaflet / WorldHeatmapCanvas: geographic risk visualization.
- ImageAnalyzer: AI-generated image and content moderation analysis.
- ThemeToggle: theme switcher.
- Toast: transient UI alerts.

## Data Dependencies
- Most components consume the API wrappers in frontend/lib/api.js.
- Federated components rely on node URLs and ledger endpoints.
- Map components rely on Leaflet and its heatmap plugin.

## Engineering Focus
- Real-time visualization with auto-refresh.
- Structured information hierarchy for analyst workflows.
- Modular components to keep pages readable and maintainable.

## Dependencies
- react, next
- leaflet, leaflet.heat
- tailwindcss
