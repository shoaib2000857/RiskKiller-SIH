"use client";

export default function RadarChart({ breakdown = {} }) {
  // Extract stylometric anomalies parameters only
  const stylometric = breakdown.stylometric_anomalies || {};
  
  const signals = [
    { label: "Avg Token Length", value: stylometric.avg_token_length || 0 },
    { label: "Type Token Ratio", value: stylometric.type_token_ratio || 0 },
    { label: "Hapax Ratio", value: stylometric.hapax_ratio || 0 },
    { label: "Sentence Length Var", value: stylometric.sentence_length_var || 0 },
    { label: "Burstiness", value: stylometric.burstiness || 0 },
    { label: "Function Word Ratio", value: stylometric.function_word_ratio || 0 },
    { label: "Uppercase Ratio", value: stylometric.uppercase_ratio || 0 },
  ];

  // Normalize values to 0-1 range (clamp to 0-1)
  const normalizedSignals = signals.map(signal => ({
    ...signal,
    value: Math.min(Math.max(signal.value, 0), 1),
  }));

  const size = 280;
  const center = size / 2;
  const radius = 90;
  const levels = 5;

  // Generate angles for 7 points (heptagon)
  const angleSlice = (Math.PI * 2) / normalizedSignals.length;

  // Convert value to coordinates
  const getCoordinates = (value, index) => {
    const angle = angleSlice * index - Math.PI / 2;
    const r = radius * value;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Generate level circles/polygons
  const levelPolygons = Array.from({ length: levels }, (_, levelIndex) => {
    const levelRadius = (radius / levels) * (levelIndex + 1);
    const points = Array.from({ length: normalizedSignals.length }, (_, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = center + levelRadius * Math.cos(angle);
      const y = center + levelRadius * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");

    return (
      <polygon
        key={`level-${levelIndex}`}
        points={points}
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth="1"
      />
    );
  });

  // Generate axis lines (8 for octagon)
  const axisLines = normalizedSignals.map((_, index) => {
    const angle = angleSlice * index - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return (
      <line
        key={`axis-${index}`}
        x1={center}
        y1={center}
        x2={x}
        y2={y}
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1"
      />
    );
  });

  // Generate data octagon
  const polygonPoints = normalizedSignals
    .map((signal, index) => {
      const coords = getCoordinates(signal.value, index);
      return `${coords.x},${coords.y}`;
    })
    .join(" ");

  // Generate labels
  const labels = normalizedSignals.map((signal, index) => {
    const angle = angleSlice * index - Math.PI / 2;
    const labelRadius = radius + 25;
    const x = center + labelRadius * Math.cos(angle);
    const y = center + labelRadius * Math.sin(angle);
    return (
      <text
        key={`label-${index}`}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="10"
        fill="rgba(255, 255, 255, 0.7)"
        className="pointer-events-none"
      >
        {signal.label}
      </text>
    );
  });

  // Generate data points
  const dataPoints = normalizedSignals.map((signal, index) => {
    const coords = getCoordinates(signal.value, index);
    return (
      <circle
        key={`point-${index}`}
        cx={coords.x}
        cy={coords.y}
        r="4"
        fill="rgb(16, 185, 129)"
        stroke="white"
        strokeWidth="2"
      />
    );
  });

  return (
    <div className="flex flex-col items-center gap-3">
      {/* <p className="text-xs uppercase tracking-wide text-slate-400">Stylometric Radar (Heptagon)</p> */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="w-full max-w-md">
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Level polygons */}
        {levelPolygons}

        {/* Axis lines */}
        {axisLines}

        {/* Data polygon (octagon) */}
        <polygon
          points={polygonPoints}
          fill="url(#radarGradient)"
          stroke="rgb(16, 185, 129)"
          strokeWidth="2.5"
          opacity="0.9"
        />

        {/* Data points */}
        {dataPoints}

        {/* Labels */}
        {labels}
      </svg>

      {/* Legend */}
      {/* <div className="mt-3 text-xs space-y-1 max-h-40 overflow-y-auto">
        {normalizedSignals.map((signal, index) => (
          <p key={index} className="text-slate-400">
            <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full mr-2" />
            {signal.label}: {Math.round(signal.value * 100)}%
          </p>
        ))}
      </div> */}
    </div>
  );
}
