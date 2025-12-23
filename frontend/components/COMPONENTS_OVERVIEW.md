# Components Catalog (frontend/components/)

Purpose
- Reusable UI modules for analysis, visualization, and system controls.

Major components
- IntakeForm: structured narrative intake with speech capture and region hints.
- CaseTable + CaseDetail: triage list and forensic deep-dive panel.
- EventsFeed + Toast: real-time activity stream and status messaging.
- MetricCard + Speedometer + RadarChart: risk metrics and stylometric visualization.
- HopTraceMap: animated route trace for sharing packages.
- FederatedBlockchain + BlockchainGraph: ledger inspection and topology view.
- WorldHeatmapLeaflet + WorldHeatmapCanvas: geographic risk visualization.
- ImageAnalyzer: AI/gore/offensive checks with multi-signal toggles.
- ThemeToggle: UX mode switching for contrast and focus.

Skill signals in the UI layer
- Maps and charts integrated with live data.
- Complex forms with client-side validation and speech support.
- Real-time feedback loops using SSE updates.

Libraries used
- react, next
- leaflet, leaflet.heat
- tailwindcss utilities
