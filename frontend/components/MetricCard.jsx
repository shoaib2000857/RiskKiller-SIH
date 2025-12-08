export default function MetricCard({ label, value, accent, valueClassName }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-lg shadow-emerald-500/10 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.35em] metric-label">
        {label}
      </p>
      <p
        className={`mt-2 font-semibold ${accent || "text-white"} ${
          valueClassName || "text-3xl"
        }`}
        data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {value}
      </p>
    </article>
  );
}
