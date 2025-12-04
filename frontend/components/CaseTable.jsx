export default function CaseTable({ results, selectedId, onSelect }) {
  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Session analyses</h2>
          <p className="mt-1 text-sm text-slate-400">
            Every intake processed while this dashboard is open. Click a row to
            inspect the full breakdown.
          </p>
        </div>
      </header>
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/5">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Intake ID</th>
              <th className="px-4 py-3 text-left font-medium">
                Classification
              </th>
              <th className="px-4 py-3 text-left font-medium">Composite</th>
              <th className="px-4 py-3 text-left font-medium">Model Family</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-950/40">
            {results.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-slate-500"
                >
                  No intakes analysed yet. Submit a narrative to light up the
                  table.
                </td>
              </tr>
            ) : (
              results.map((result) => {
                const createdAt = result.submitted_at
                  ? new Date(result.submitted_at).toLocaleString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      day: "2-digit",
                      month: "short",
                    })
                  : "—";
                const family = result?.breakdown?.model_family || "—";
                return (
                  <tr
                    key={result.intake_id}
                    data-intake={result.intake_id}
                    className={`cursor-pointer transition hover:bg-slate-800/50 ${
                      selectedId === result.intake_id
                        ? "bg-slate-800/60 ring-1 ring-emerald-500/40"
                        : ""
                    }`}
                    onClick={() => onSelect(result.intake_id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-emerald-200">
                      {result.intake_id}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`badge badge-${
                          (result.classification || "event").toLowerCase()
                        }`}
                      >
                        {result.classification || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-200">
                      {typeof result.composite_score === "number"
                        ? result.composite_score.toFixed(2)
                        : "n/a"}
                    </td>
                    <td className="px-4 py-3 text-xs text-fuchsia-200">
                      {family}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {createdAt}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
