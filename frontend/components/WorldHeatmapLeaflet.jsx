"use client";

import { useEffect, useRef } from "react";

// Static sample points across the world [lat, lon, intensity]
const SAMPLE_POINTS = [
  [26.3881,80.1543,10] ,[26.3881,80.1543,10] // Seattle (Low)
];

export default function WorldHeatmapLeaflet() {
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let cleanup = () => {};
    let frameId;
    let waitId;

    const waitForVisibleContainer = () => {
      const el = containerRef.current;
      if (!el) return false;
      const rects = el.getClientRects();
      return rects && rects.length > 0 && el.offsetWidth > 0 && el.offsetHeight > 0;
    };
    async function init() {
      if (mapRef.current) return;
      const containerEl = containerRef.current;
      // Wait for the container to be mounted in the DOM tree
      if (!containerEl || !containerEl.parentNode) return;
      if (!waitForVisibleContainer()) {
        waitId = requestAnimationFrame(() => init().catch(() => {}));
        return;
      }
      const L = (await import("leaflet")).default;
      await import("leaflet.heat");
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
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

      // Defensive: ensure container exists before initializing map
      const map = L.map(containerEl, {
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

      const base = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
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

      setTimeout(() => {
        try { map.invalidateSize(); } catch {}
      }, 0);

      cleanup = () => {
        if (map) {
          map.off();
          map.remove();
        }
        mapRef.current = null;
        heatLayerRef.current = null;
      };
    }
    frameId = requestAnimationFrame(() => {
      init().catch(() => {});
    });
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (waitId) cancelAnimationFrame(waitId);
      cleanup();
    };
  }, []);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/30">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">World Heatmap</h3>
        <p className="text-xs text-slate-400">Blue → Green → Yellow → Red</p>
      </div>
      <div
        ref={containerRef}
        id="world-heatmap-container"
        style={{ height: 520, borderRadius: 16, overflow: "hidden", touchAction: "none", position: "relative", zIndex: 10 }}
        className="w-full"
      />
    </div>
  );
}
