"use client";

import { useEffect, useRef } from "react";

// Static sample points across the world [lat, lon, intensity]
const SAMPLE_POINTS = [
  // North America
  [40.7128, -74.0060, 0.2], // New York (Low)
  [34.0522, -118.2437, 0.6], // Los Angeles (Medium)
  [41.8781, -87.6298, 0.4], // Chicago (Medium)
  [29.7604, -95.3698, 0.3], // Houston (Low)
  [49.2827, -123.1207, 0.5], // Vancouver (Medium)
  // South America
  [-23.5505, -46.6333, 0.7], // São Paulo (High)
  [-34.6037, -58.3816, 0.4], // Buenos Aires (Medium)
  [-12.0464, -77.0428, 0.3], // Lima (Low)
  [4.7110, -74.0721, 0.5], // Bogotá (Medium)
  // Europe
  [51.5074, -0.1278, 0.6], // London (Medium)
  [48.8566, 2.3522, 0.7], // Paris (High)
  [52.5200, 13.4050, 0.5], // Berlin (Medium)
  [41.9028, 12.4964, 0.4], // Rome (Medium)
  [40.4168, -3.7038, 0.3], // Madrid (Low)
  // Africa
  [-26.2041, 28.0473, 0.5], // Johannesburg (Medium)
  [6.5244, 3.3792, 0.4], // Lagos (Medium)
  [30.0444, 31.2357, 0.6], // Cairo (Medium)
  [-1.2921, 36.8219, 0.3], // Nairobi (Low)
  [14.7167, -17.4677, 0.2], // Dakar (Low)
  // Asia
  [35.6762, 139.6503, 0.8], // Tokyo (Very High)
  [31.2304, 121.4737, 0.7], // Shanghai (High)
  [28.6139, 77.2090, 0.6], // Delhi (Medium)
  [19.0760, 72.8777, 0.5], // Mumbai (Medium)
  [13.0827, 80.2707, 0.4], // Chennai (Medium)
  [1.3521, 103.8198, 0.5], // Singapore (Medium)
  [3.1390, 101.6869, 0.3], // Kuala Lumpur (Low)
  [39.9042, 116.4074, 0.6], // Beijing (Medium)
  // Middle East
  [25.2048, 55.2708, 0.5], // Dubai (Medium)
  [24.7136, 46.6753, 0.4], // Riyadh (Medium)
  [33.3152, 44.3661, 0.3], // Baghdad (Low)
  // Oceania
  [-33.8688, 151.2093, 0.5], // Sydney (Medium)
  [-37.8136, 144.9631, 0.4], // Melbourne (Medium)
  [-36.8485, 174.7633, 0.3], // Auckland (Low)
  // Additional spread
  [55.7558, 37.6173, 0.4], // Moscow (Medium)
  [50.0755, 14.4378, 0.3], // Prague (Low)
  [60.1699, 24.9384, 0.2], // Helsinki (Low)
  [35.1796, 129.0756, 0.6], // Busan (Medium)
  [23.1291, 113.2644, 0.5], // Guangzhou (Medium)
  [22.3964, 114.1095, 0.6], // Hong Kong (Medium)
  [10.8231, 106.6297, 0.4], // Ho Chi Minh City (Medium)
  [13.7563, 100.5018, 0.5], // Bangkok (Medium)
  [-22.9068, -43.1729, 0.5], // Rio de Janeiro (Medium)
  [-8.0476, -34.8770, 0.3], // Recife (Low)
  [-2.1631, -79.9001, 0.3], // Guayaquil (Low)
  [43.6532, -79.3832, 0.4], // Toronto (Medium)
  [45.5017, -73.5673, 0.3], // Montreal (Low)
  [32.7767, -96.7970, 0.4], // Dallas (Medium)
  [47.6062, -122.3321, 0.3], // Seattle (Low)
];

export default function WorldHeatmapLeaflet() {
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);

  useEffect(() => {
    let cleanup = () => {};
    async function init() {
      if (mapRef.current) return;
      const L = (await import("leaflet")).default;
      await import("leaflet.heat");
      // Inject Leaflet CSS only once
      const existingCss = document.querySelector('link[href*="leaflet@1.9.4/dist/leaflet.css"]');
      if (!existingCss) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Reset container if needed
      const existing = L.DomUtil.get("world-heatmap-container");
      if (existing) {
        // Reset any previous Leaflet instance and clear DOM to avoid ghost maps
        if (existing._leaflet_id) existing._leaflet_id = null;
        existing.innerHTML = "";
      }

      const map = L.map("world-heatmap-container", {
        center: [20, 0],
        zoom: 2,
        worldCopyJump: false, // keep a single world copy
        inertia: true,
        zoomControl: true,
      });
      // Constrain to single-world bounds while allowing pan/zoom
      map.setMinZoom(1);
      map.setMaxBounds([[-85, -180], [85, 180]]);
      if (typeof map.setMaxBoundsViscosity === 'function') {
        map.setMaxBoundsViscosity?.(0.8);
      }
      // Ensure all interactions are enabled
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      // Ensure pane allows events
      const container = map.getContainer();
      if (container) {
        container.style.pointerEvents = "auto";
      }
      mapRef.current = map;

      const base = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
        noWrap: true, // prevent repeated worlds
      });
      base.addTo(map);

      const heat = L.heatLayer([], {
        radius: 40,
        blur: 30,
        maxZoom: 17,
        minOpacity: 0.6,
        gradient: {
          0.0: "#0000ff",  // Blue (Low)
          0.33: "#00ff00", // Green (Medium)
          0.66: "#ffff00", // Yellow (High)
          1.0: "#ff0000",  // Red (Very High)
        },
      }).addTo(map);
      heatLayerRef.current = heat;

      // Legend
      const LegendControl = L.Control.extend({
        onAdd: function () {
          const div = L.DomUtil.create("div", "leaflet-control legend");
          div.style.background = "rgba(15,23,42,0.85)";
          div.style.padding = "8px 10px";
          div.style.borderRadius = "10px";
          div.style.color = "#e2e8f0";
          div.style.fontSize = "12px";
          div.style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
          div.innerHTML = `
            <div style="font-weight:600; margin-bottom:6px; color:#a7f3d0;">Intensity Legend</div>
            <div style="display:grid; grid-template-columns: auto 1fr; gap:6px;">
              <span>Blue</span><span>= Low</span>
              <span>Green</span><span>= Medium</span>
              <span>Yellow</span><span>= High</span>
              <span>Red</span><span>= Very High</span>
            </div>`;
          return div;
        },
        onRemove: function () {},
      });
      new LegendControl({ position: "bottomleft" }).addTo(map);

      // Load sample points
      heat.setLatLngs(SAMPLE_POINTS);

      cleanup = () => {
        if (map) {
          map.off();
          map.remove();
        }
        mapRef.current = null;
        heatLayerRef.current = null;
      };
    }
    init();
    return () => cleanup();
  }, []);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/30">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">World Heatmap</h3>
        <p className="text-xs text-slate-400">Blue → Green → Yellow → Red</p>
      </div>
      <div
        id="world-heatmap-container"
        style={{ height: 520, borderRadius: 16, overflow: "hidden", touchAction: "none", position: "relative", zIndex: 10 }}
        className="w-full"
      />
    </div>
  );
}
