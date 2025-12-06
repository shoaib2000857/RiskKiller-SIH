import { useMemo, useState } from "react";
import Speedometer from "./Speedometer";
import RadarChart from "./RadarChart";

const riskBadgeClasses = {
  "high-risk":
    "border-rose-500/40 bg-rose-500/15 text-rose-200 shadow shadow-rose-500/30",
  "medium-risk":
    "border-amber-500/40 bg-amber-500/15 text-amber-200 shadow shadow-amber-500/30",
  "low-risk":
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 shadow shadow-emerald-500/30",
};

const defaultShareForm = {
  destination: "USA",
  justification: "Trusted cell requesting rapid alerting on hostile narrative.",
  include_personal_data: false,
};

export default function CaseDetail({
  caseData,
  submission,
  onShare,
  sharePending,
  shareOutput,
}) {
  const [formState, setFormState] = useState(defaultShareForm);

  const metadataEntries = useMemo(() => {
    if (!submission?.metadata) return [];
    return Object.entries(submission.metadata).filter(([, value]) => Boolean(value));
  }, [submission]);

  const breakdown = caseData?.breakdown || {};
  const provenance = caseData?.provenance || {};
  const graphSummary = caseData?.graph_summary || {};
  const stylometric = breakdown.stylometric_anomalies || {};
  const heuristics = breakdown.heuristics || [];
  const graphCommunities = graphSummary.communities;
  const gnnClusters = Array.isArray(graphSummary.gnn_clusters)
    ? graphSummary.gnn_clusters
    : [];
  const coordinationAlerts = Array.isArray(graphSummary.coordination_alerts)
    ? graphSummary.coordination_alerts
    : [];
  const propagationChains = Array.isArray(graphSummary.propagation_chains)
    ? graphSummary.propagation_chains
    : [];
  const communitySummaries = useMemo(() => {
    const communities = Array.isArray(graphCommunities) ? graphCommunities : [];
    return communities.map((community) => {
      const entries = [];
      const actors = Array.isArray(community.actors) ? community.actors : [];
      if (actors.length) {
        entries.push({ label: "Actors", value: actors.join(", ") });
      }
      const contentNodes = Array.isArray(community.content)
        ? community.content
        : [];
      if (contentNodes.length) {
        entries.push({ label: "Content", value: contentNodes.join(", ") });
      }
      Object.entries(community || {})
        .filter(([key]) => !["actors", "content"].includes(key))
        .forEach(([key, value]) => {
          if (Array.isArray(value) && value.length) {
            entries.push({
              label: key.replace(/_/g, " "),
              value: value.join(", "),
            });
          } else if (value) {
            entries.push({
              label: key.replace(/_/g, " "),
              value: String(value),
            });
          }
        });
      if (entries.length === 0) {
        entries.push({ label: "Nodes", value: "No entities listed" });
      }
      return entries;
    });
  }, [graphCommunities]);

  if (!caseData) {
    return (
      <aside className="rounded-3xl border border-white/5 bg-slate-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur">
        <h2 className="text-2xl font-semibold text-white">Case intelligence</h2>
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-slate-900/60 px-5 py-12 text-center text-sm text-slate-500">
          Waiting for a selection. Choose an intake from the table to populate this
          panel.
        </div>
      </aside>
    );
  }

  const selectedClass = (caseData.classification || "event").toLowerCase();

  const handleShareSubmit = async (event) => {
    event.preventDefault();
    await onShare({
      ...formState,
      intake_id: caseData.intake_id,
    });
  };

  return (
    <aside className="flex flex-col gap-8 rounded-3xl border border-white/5 bg-slate-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur">
      <header className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-semibold text-white">Case intelligence</h2>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${riskBadgeClasses[selectedClass] || "border-white/10 bg-white/5 text-slate-200"}`}
        >
          {caseData.classification || "Unknown"}
        </span>
      </header>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Intake ID</p>
            <p className="mt-1 font-mono text-xs text-emerald-200" title={caseData.intake_id}>
              {caseData.intake_id}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Composite score
            </p>
            <div className="mt-2">
              {typeof caseData.composite_score === "number" ? (
                <Speedometer value={caseData.composite_score} />
              ) : (
                <p className="text-slate-400 text-sm">n/a</p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Submitted
            </p>
            <p className="mt-1 text-slate-200">
              {caseData.submitted_at
                ? new Date(caseData.submitted_at).toLocaleString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Graph risk actors
            </p>
            <p className="mt-1 text-slate-200">
              {Array.isArray(graphSummary.high_risk_actors) && graphSummary.high_risk_actors.length
                ? graphSummary.high_risk_actors.join(", ")
                : "None flagged"}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Signal breakdown
        </h3>
        <ScoreBar label="Linguistic confidence" value={breakdown.linguistic_score} color="bg-emerald-400" />
        <ScoreBar label="Behavioral risk" value={breakdown.behavioral_score} color="bg-amber-400" />
        <ScoreBar label="AI Detection probability" value={breakdown.ai_probability} color="bg-cyan-400" />
        {breakdown.ollama_risk !== null && breakdown.ollama_risk !== undefined && (
          <ScoreBar label="Ollama Semantic Risk" value={breakdown.ollama_risk} color="bg-purple-400" />
        )}
        {breakdown.model_family && (
          <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Model Family Detected</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fuchsia-300">{breakdown.model_family}</span>
              <span className="text-xs text-slate-400">
                {breakdown.model_family_confidence ? `${(breakdown.model_family_confidence * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            {breakdown.model_family_probabilities && Object.keys(breakdown.model_family_probabilities).length > 0 && (
              <div className="mt-3 space-y-1">
                {Object.entries(breakdown.model_family_probabilities).map(([family, prob]) => (
                  <div key={family} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{family}</span>
                    <span className="font-mono text-slate-300">{(prob * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Stylometric analysis
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Stylometric Anomalies - Left */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Anomalies
            </h4>
            <ul className="space-y-2 text-sm text-slate-200">
              {Object.keys(stylometric).length === 0 ? (
                <li className="text-xs text-slate-500">
                  No stylometric anomalies detected.
                </li>
              ) : (
                Object.entries(stylometric).map(([key, value]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2"
                  >
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-sm text-emerald-200">
                      {typeof value === "number" ? value.toFixed(2) : String(value)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Signal Radar - Right */}
          <div className="flex justify-center items-start">
            <RadarChart breakdown={breakdown} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Triggered heuristics
        </h3>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-emerald-200">
          {heuristics.length === 0 ? (
            <span className="text-xs text-slate-500">
              No heuristics were triggered for this case.
            </span>
          ) : (
            heuristics.map((heuristic) => (
              <span
                key={heuristic}
                className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs"
              >
                {heuristic}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Provenance checks
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-200">
            Watermark: {provenance.watermark_present ? "detected" : "absent"}
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-200">
            Signature: {provenance.signature_valid ? "valid" : "invalid"}
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-200 col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Content fingerprint (SHA-256)</p>
            <p className="mt-1 font-mono text-[11px] break-all text-emerald-200">
              {provenance.content_hash || "—"}
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-1 text-xs text-slate-400">
          {Array.isArray(provenance.validation_notes) &&
          provenance.validation_notes.length ? (
            provenance.validation_notes.map((note, index) => (
              <li key={index}>• {note}</li>
            ))
          ) : (
            <li>• No additional validation notes.</li>
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Graph intelligence snapshot
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm text-slate-200 md:grid-cols-4">
          <StatCard label="Nodes" value={graphSummary.node_count} />
          <StatCard label="Edges" value={graphSummary.edge_count} />
          <StatCard
            label="Communities"
            value={Array.isArray(graphSummary.communities) ? graphSummary.communities.length : 0}
          />
          <StatCard label="GNN clusters" value={gnnClusters.length} />
        </div>
        <div className="mt-4 space-y-2 text-xs text-slate-400">
          {Array.isArray(graphSummary.communities) && graphSummary.communities.length ? (
            graphSummary.communities.map((community, index) => {
              const summary = communitySummaries[index] || [];
              return (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3"
                >
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                    COMMUNITY {index + 1}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-slate-200">
                    {summary.map((entry, entryIndex) => (
                      <p key={`${index}-${entry.label}-${entryIndex}`}>
                        <span className="mr-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                          {entry.label}:
                        </span>
                        <span className="font-mono text-[11px] text-emerald-200">
                          {entry.value}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/50 px-4 py-3 text-xs text-slate-500">
              No community clusters reported for this intake.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          GNN cluster detections
        </h3>
        {gnnClusters.length ? (
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            {gnnClusters.map((cluster) => (
              <article
                key={cluster.cluster_id}
                className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3"
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-slate-500">
                  <span>{cluster.cluster_id}</span>
                  <span className="text-emerald-300">{(cluster.score ?? 0).toFixed(2)}</span>
                </div>
                <div className="mt-3 space-y-1 text-[13px]">
                  {cluster.actors?.length ? (
                    <p>
                      <span className="text-slate-500">Actors:</span>
                      <span className="ml-2 font-mono text-emerald-200">
                        {cluster.actors.join(", ")}
                      </span>
                    </p>
                  ) : null}
                  {cluster.narratives?.length ? (
                    <p>
                      <span className="text-slate-500">Narratives:</span>
                      <span className="ml-2 font-mono text-cyan-200">
                        {cluster.narratives.join(", ")}
                      </span>
                    </p>
                  ) : null}
                  {cluster.content?.length ? (
                    <p>
                      <span className="text-slate-500">Content:</span>
                      <span className="ml-2 font-mono text-amber-200">
                        {cluster.content.join(", ")}
                      </span>
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500">
            No GNN-driven communities have been scored yet for this case.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Cross-platform coordination alerts
        </h3>
        {coordinationAlerts.length ? (
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            {coordinationAlerts.map((alert, index) => (
              <article
                key={`${alert.actor}-${index}`}
                className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-4"
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-slate-500">
                  <span>{alert.actor}</span>
                  <span className="text-rose-200">Risk {(alert.risk ?? 0).toFixed(2)}</span>
                </div>
                <div className="mt-3 space-y-1 text-[13px]">
                  {alert.peer_actors?.length ? (
                    <p>
                      <span className="text-slate-500">Peers:</span>
                      <span className="ml-2 font-mono text-emerald-200">
                        {alert.peer_actors.join(", ")}
                      </span>
                    </p>
                  ) : null}
                  {alert.shared_tags?.length ? (
                    <p>
                      <span className="text-slate-500">Shared narratives:</span>
                      <span className="ml-2 font-mono text-cyan-200">
                        {alert.shared_tags.join(", ")}
                      </span>
                    </p>
                  ) : null}
                  {alert.platforms?.length ? (
                    <p>
                      <span className="text-slate-500">Platforms:</span>
                      <span className="ml-2 font-mono text-amber-200">
                        {alert.platforms.join(", ")}
                      </span>
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500">
            No coordination signals flagged between actors for this intake.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Propagation chains
        </h3>
        {propagationChains.length ? (
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            {propagationChains.map((chain, index) => (
              <article
                key={`${chain.path?.join("-") || "chain"}-${index}`}
                className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-4"
              >
                <p className="font-mono text-[12px] text-emerald-200">
                  {(chain.path || []).join(" → ") || "No path computed"}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-400">
                  <span>Likelihood {(chain.likelihood ?? 0).toFixed(2)}</span>
                  <span>
                    Platforms: <span className="font-mono text-amber-200">{(chain.platforms || []).join(", ") || "n/a"}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500">
            Propagation modelling has not surfaced any cross-actor handoffs.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Submitted payload
        </h3>
        <div className="mt-4 space-y-3 text-sm text-slate-200">
          <p className="rounded-xl border border-white/5 bg-slate-900/60 px-4 py-3 text-slate-100">
            {submission?.text || "Source text not available in this session."}
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
            {metadataEntries.length ? (
              metadataEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2"
                >
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-200">
                    {typeof value === "string" ? value : JSON.stringify(value)}
                  </p>
                </div>
              ))
            ) : (
              <p className="col-span-2 text-xs text-slate-500">
                Metadata was not captured for this intake.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-emerald-200">
            {Array.isArray(submission?.tags) && submission.tags.length ? (
              submission.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500">
                No analyst tags applied.
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Generate sharing package
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Wrap the analysis into a signed package for partner dissemination directly through the API.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleShareSubmit}>
          <label className="flex flex-col gap-2 text-slate-200">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Destination
            </span>
            <select
              value={formState.destination}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  destination: event.target.value,
                }))
              }
              className="input"
            >
              <option value="USA">USA</option>
              <option value="EU">EU</option>
              <option value="IN">IN</option>
              <option value="AUS">AUS</option>
              <option value="FiveEyes">FiveEyes</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-slate-200">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Justification
            </span>
            <textarea
              value={formState.justification}
              rows={2}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  justification: event.target.value,
                }))
              }
              className="input"
            />
          </label>

          <label className="inline-flex items-center gap-3 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={formState.include_personal_data}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  include_personal_data: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-white/20 bg-slate-950 text-emerald-400 focus:ring-emerald-500"
            />
            Include personally identifiable metadata
          </label>

          <button
            type="submit"
            disabled={sharePending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Build package
          </button>
        </form>
        {shareOutput ? (
          <pre className="max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-xs text-slate-300">
            {shareOutput}
          </pre>
        ) : null}
      </section>
    </aside>
  );
}

function ScoreBar({ label, value, color }) {
  const safeValue = typeof value === "number" ? Math.max(0, Math.min(value, 1)) : null;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>
          {safeValue === null ? "n/a" : `${Math.round(safeValue * 100)}%`}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`${color} h-full rounded-full transition-all duration-300`}
          style={{ width: safeValue === null ? "4%" : `${Math.round(safeValue * 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-emerald-200">
        {value ?? "—"}
      </p>
    </div>
  );
}
