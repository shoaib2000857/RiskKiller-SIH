# Frontend Lib Overview (frontend/lib/)

## Purpose
Centralize API access and environment configuration for the frontend.

## API Helpers
- submitIntake(payload): POST /api/v1/intake
- fetchCase(intakeId): GET /api/v1/cases/{id}
- requestSharingPackage(payload): POST /api/v1/share
- createEventStream(onEvent, onError): SSE stream helper

## Environment Variables
- NEXT_PUBLIC_API_BASE_URL
- NEXT_PUBLIC_NODE1_URL
- NEXT_PUBLIC_NODE2_URL
- NEXT_PUBLIC_NODE3_URL
- NEXT_PUBLIC_NODE4_URL

## Design Intent
- Keep components clean by isolating HTTP mechanics.
- Provide a single source of truth for API endpoints.
- Standardize error handling and payload parsing.

## Dependencies
- fetch API
- EventSource
