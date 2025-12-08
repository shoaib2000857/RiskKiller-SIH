"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

// Simple equirectangular projection (lon [-180,180], lat [-90,90]) to canvas coords
function project(lat, lon, width, height) {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

export default function WorldHeatmapCanvas({ width = 900, height = 450 }) {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState([]);

  useEffect(() => {
    let intervalId = null;
    async function fetchPoints() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/heatmap/grid`);
        if (!res.ok) return;
        const payload = await res.json();
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.points)
          ? payload.points
          : [];
        setPoints(list);
      } catch {}
    }
    fetchPoints();
    intervalId = setInterval(fetchPoints, 5000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // Background ocean blue
    ctx.fillStyle = "#0033cc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Optional: draw graticule or a simple world mask (kept minimal)
    // Heat rendering
    // Render soft circular gradients for each point, weight by score
    points.forEach((p) => {
      const lat = p.lat ?? p.latitude;
      const lon = p.lon ?? p.longitude;
      const score = Math.max(0, Math.min(100, p.score ?? p.final_risk_score ?? 0));
      if (typeof lat !== "number" || typeof lon !== "number") return;
      const [x, y] = project(lat, lon, canvas.width, canvas.height);
      const radius = 30 + (score / 100) * 40; // 30-70 px
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      // rainbow-ish gradient
      grad.addColorStop(0.0, "rgba(255,0,0,0.85)");
      grad.addColorStop(0.4, "rgba(255,165,0,0.65)");
      grad.addColorStop(0.7, "rgba(255,255,0,0.45)");
      grad.addColorStop(1.0, "rgba(0,0,255,0.0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points, width, height]);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/30">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Global Hotspots</h3>
        <p className="text-xs text-slate-400">Canvas heatmap · updates every 5s</p>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: "100%", height: `${(height / width) * 100}%`, borderRadius: 16 }}
      />
    </div>
  );
}
