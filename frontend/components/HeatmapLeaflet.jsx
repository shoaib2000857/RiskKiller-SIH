"use client";

import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/api";

export default function HeatmapLeaflet() {
	const mapRef = useRef(null);
	const heatLayerRef = useRef(null);
	const leafletRef = useRef(null);
	const latestMarkerRef = useRef(null);
  const leafletCssRef = useRef(null);

	useEffect(() => {
		let cleanup = () => {};
		let intervalId = null;

		async function init() {
			// Avoid double initialization in dev/fast-refresh
			if (mapRef.current) return;
			// Load Leaflet and plugin dynamically on client
			const L = (await import("leaflet")).default;
			await import("leaflet.heat");
			leafletRef.current = L;

			// Add Leaflet CSS via CDN once
			const existingCss = document.querySelector('link[href*="leaflet@1.9.4/dist/leaflet.css"]');
			if (!existingCss) {
				const link = document.createElement("link");
				link.rel = "stylesheet";
				link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
				document.head.appendChild(link);
				leafletCssRef.current = link;
			}

			// Reset container if Leaflet previously attached
			const existing = L.DomUtil.get("heatmap-container");
			if (existing) {
				if (existing._leaflet_id) existing._leaflet_id = null;
				existing.innerHTML = "";
			}

			// Initialize the map
			const map = L.map("heatmap-container", {
				center: [20.5937, 78.9629], // India centroid
				zoom: 5,
				worldCopyJump: false,
				zoomControl: true,
				attributionControl: false,
			});
			// Constrain panning to India region
			map.setMaxBounds([[6, 68], [37, 97]]);
			mapRef.current = map;

			// Ensure interactions are enabled
			map.dragging.enable();
			map.scrollWheelZoom.enable();
			map.touchZoom.enable();
			map.doubleClickZoom.enable();
			map.boxZoom.enable();
			map.keyboard.enable();

			// Basemap tiles for context
			const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: "&copy; OpenStreetMap contributors",
				maxZoom: 18,
				noWrap: true,
			}).addTo(map);

			// Create heat layer
			const heat = L.heatLayer([], {
				radius: 30,
				blur: 20,
				maxZoom: 17,
				minOpacity: 0.5,
				gradient: {
					0.0: "#00ff80",
					0.5: "#ffd166",
					1.0: "#ff4d4f",
				},
			}).addTo(map);
			heatLayerRef.current = heat;

			// Inject CSS for a pulsing marker
			const styleTag = document.createElement("style");
			styleTag.innerHTML = `
				@keyframes td-pulse {
					0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }
					70% { box-shadow: 0 0 0 18px rgba(16,185,129,0); }
					100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
				}
				.td-pulse-marker {
					width: 14px; height: 14px; border-radius: 50%;
					background: #10b981; border: 2px solid #064e3b;
					animation: td-pulse 1.8s ease-out infinite;
				}
			`;
			document.head.appendChild(styleTag);

			// Legend control
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
						<div style="font-weight:600; margin-bottom:6px; color:#a7f3d0;">Live Fusion Feed</div>
						<div style="display:flex; align-items:center; gap:8px;">
							<span>Low</span>
							<div style="flex:1; height:8px; background: linear-gradient(90deg, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000); border-radius:6px;"></div>
							<span>High</span>
						</div>`;
					return div;
				},
				onRemove: function () {},
			});
			new LegendControl({ position: "bottomleft" }).addTo(map);

			async function refreshHeat() {
				try {
					const res = await fetch(`${API_BASE_URL}/api/v1/heatmap/grid`);
					if (!res.ok) return;
					const payload = await res.json();
					const list = Array.isArray(payload)
						? payload
						: Array.isArray(payload?.points)
						? payload.points
						: [];
					const heatPoints = list
						.filter(
							(p) =>
								typeof (p.lat ?? p.latitude) === "number" &&
								typeof (p.lon ?? p.longitude) === "number"
						)
						.map((p) => [
							p.lat ?? p.latitude,
							p.lon ?? p.longitude,
							Math.max(0, Math.min(1, (p.score ?? p.final_risk_score ?? 0) / 100)),
						]);
					heat.setLatLngs(heatPoints);

					// Show a pulsing marker at the latest point
					const latest = list[list.length - 1];
					if (latest) {
						const lat = latest.lat ?? latest.latitude;
						const lon = latest.lon ?? latest.longitude;
						if (typeof lat === "number" && typeof lon === "number") {
							if (latestMarkerRef.current) {
								latestMarkerRef.current.setLatLng([lat, lon]);
							} else {
								const icon = L.divIcon({ className: "td-pulse-marker" });
								latestMarkerRef.current = L.marker([lat, lon], { icon }).addTo(map);
							}
						}
					}
				} catch (e) {
					// ignore transient errors
				}
			}

			await refreshHeat();
			// Fix sizing after initial render
			setTimeout(() => {
				try { map.invalidateSize(); } catch {}
			}, 0);
			intervalId = setInterval(refreshHeat, 5000);

			cleanup = () => {
				if (intervalId) clearInterval(intervalId);
				if (map) {
					map.off();
					map.remove();
				}
				latestMarkerRef.current = null;
				// Do not strip global Leaflet CSS indiscriminately; only remove our pulse style
				const styleNodes = Array.from(document.querySelectorAll('style'))
					.filter((s) => s.innerHTML.includes('td-pulse'));
				styleNodes.forEach((s) => s.parentElement && s.parentElement.removeChild(s));
			};
		}

		init();
		return () => cleanup();
	}, []);

	return (
		<div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/30">
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-lg font-semibold text-white">Live Fusion Feed</h3>
				<p className="text-xs text-slate-400">Auto-updates every 5 seconds</p>
			</div>
			<div
				id="heatmap-container"
				style={{ height: 480, borderRadius: 16, overflow: "hidden" }}
				className="w-full"
			/>
		</div>
	);
}

