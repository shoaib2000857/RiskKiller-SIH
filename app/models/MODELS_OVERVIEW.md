# Models Module Overview (app/models/)

## Purpose
Provide the core intelligence engines for detection, graph analysis, provenance checks, and sharing package creation.

## Detection Engine (detection.py)

### What it does
- Extracts stylometric and behavioral features.
- Runs heuristics to capture urgency, manipulation, and platform risk signals.
- Blends multiple AI signals into a composite score.
- Produces explainable heuristics and anomalies for analyst review.

### Feature highlights
- MATTR for lexical diversity.
- Character entropy for predictability detection.
- Repetition rate and burstiness signals.
- Behavioral risk scoring with CTA and valence cues.

### Outputs
- composite_score
- classification (low-risk, medium-risk, high-risk)
- DetectionBreakdown: stylometric anomalies, heuristics, optional AI metrics

## Graph Intelligence (graph_intel.py)

### What it does
- Maintains an in-memory graph of actors, content, narratives, and regions.
- Produces a summary with clusters, coordination alerts, and propagation chains.
- Optional torch-backed GNN-like scoring projection.

### Outputs
- GraphSummary with node/edge counts, high-risk actors, communities, clusters

## Watermark & Provenance (watermark.py)

### What it does
- Detects embedded watermarks and signature patterns.
- Generates fallback fingerprints when no explicit watermark is present.
- Produces provenance notes for analyst review.

## Sharing Engine (sharing.py)

### What it does
- Creates signed, policy-tagged sharing packages.
- Generates multi-hop trace routes with simulated latency.
- Wraps metadata into an auditable, consistent payload.

### Outputs
- SharingPackage with signature and hop trace

## Dependencies
- networkx, torch (optional)
- hashlib, statistics, re
- app/schemas for typed outputs
