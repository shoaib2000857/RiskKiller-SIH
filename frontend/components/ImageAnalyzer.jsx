"use client";

import { useState } from "react";

export default function ImageAnalyzer() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const featureDefaults = {
    genai: true, // AI-generated detection (default ON)
    nudity: false,
    gore: false,
    offensive: false,
    selfHarm: false,
    text: false,
    qr: false,
    properties: false,
  };

  // Feature toggles configure requested signal set
  const [features, setFeatures] = useState(() => ({ ...featureDefaults }));
  // Snapshot of features applied on the last analysis run
  const [activeFeatures, setActiveFeatures] = useState(() => ({ ...featureDefaults }));

  const toggleFeature = (key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResults(null);
      setError(null);
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setError(null);

    const enabledModels = [];
    if (features.genai) enabledModels.push("genai");
    if (features.nudity) enabledModels.push("nudity-2.1");
    if (features.gore) enabledModels.push("gore-2.0");
    if (features.offensive) enabledModels.push("offensive-2.0");
    if (features.selfHarm) enabledModels.push("self-harm");
    if (features.text) enabledModels.push("text-content");
    if (features.qr) enabledModels.push("qr-content");
    if (features.properties) enabledModels.push("properties");

    if (enabledModels.length === 0) {
      setError("Select at least one detection feature before analyzing.");
      setResults(null);
      setAnalyzing(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("models", enabledModels.join(","));

    try {
      const response = await fetch("http://localhost:8000/api/v1/image/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      setActiveFeatures({ ...features });
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskLevel = (prob) => {
    if (prob >= 0.7) return { label: "HIGH", color: "text-rose-400" };
    if (prob >= 0.4) return { label: "MEDIUM", color: "text-amber-400" };
    return { label: "LOW", color: "text-emerald-400" };
  };

  const offensiveScore = results?.offensive
    ? Math.min(
        1,
        Object.values(results.offensive)
          .filter((val) => typeof val === "number")
          .reduce((sum, val) => sum + val, 0)
      )
    : null;

  const hasPropertiesData = results
    ? results.sharpness !== undefined ||
      results.brightness !== undefined ||
      results.contrast !== undefined ||
      Boolean(results.colors?.dominant) ||
      Boolean(results.media)
    : false;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-6 py-5">
      <header className="mb-5">
        <h2 className="text-2xl font-semibold text-white">Image Content Analyzer</h2>
        <p className="mt-1 text-sm text-slate-400">
          Detect AI-generated images, gore, nudity, offensive content, and more
        </p>
      </header>

      <div className="space-y-4">
        {/* File Upload */}
        <div className="flex items-center gap-4">
          <label
            htmlFor="image-upload"
            className="cursor-pointer rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20"
          >
            Choose Image
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {selectedFile && (
            <span className="text-sm text-slate-400">{selectedFile.name}</span>
          )}
        </div>

        {/* Feature Toggles */}
        <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Detection Features</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* AI Detection - Default ON */}
            <button
              onClick={() => toggleFeature('genai')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                features.genai
                  ? 'border-fuchsia-500/50 bg-fuchsia-500/20 text-fuchsia-300'
                  : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <span className="block">🤖 AI Detection</span>
            </button>

            {/* Nudity */}
            <button
              onClick={() => toggleFeature('nudity')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                features.nudity
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                  : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <span className="block">🚫 Nudity</span>
            </button>

            {/* Gore */}
            <button
              onClick={() => toggleFeature('gore')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                features.gore
                  ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                  : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <span className="block">🩸 Gore</span>
            </button>

            {/* Offensive */}
            <button
              onClick={() => toggleFeature('offensive')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                features.offensive
                  ? 'border-orange-500/50 bg-orange-500/20 text-orange-300'
                  : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <span className="block">⚠️ Offensive</span>
            </button>

            {/* Self-Harm */}
            <button
              onClick={() => toggleFeature('selfHarm')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                features.selfHarm
                  ? 'border-red-500/50 bg-red-500/20 text-red-300'
                  : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <span className="block">💔 Self-Harm</span>
            </button>

            {/* Text */}
            <button
              onClick={() => toggleFeature('text')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                features.text
                  ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                  : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <span className="block">📝 Text</span>
            </button>

            {/* QR Code */}
            <button
              onClick={() => toggleFeature('qr')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                features.qr
                  ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                  : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <span className="block">📱 QR Code</span>
            </button>

            {/* Properties */}
            <button
              onClick={() => toggleFeature('properties')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                features.properties
                  ? 'border-slate-500/50 bg-slate-500/20 text-slate-300'
                  : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <span className="block">ℹ️ Properties</span>
            </button>
          </div>
        </div>

        {/* Image Preview */}
        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 rounded-lg border border-white/10"
            />
          </div>
        )}

        {/* Analyze Button */}
        {selectedFile && (
          <button
            onClick={analyzeImage}
            disabled={analyzing}
            className="rounded-lg bg-gradient-to-r from-green-600 to-blue-600 px-6 py-2.5 font-semibold text-white hover:from-blue-700 hover:to-green-700 disabled:opacity-50"
          >
            {analyzing ? "Analyzing..." : "Analyze Image"}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4 rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <h3 className="text-lg font-semibold text-white">Analysis Results</h3>

            {/* AI Generation Detection */}
            {activeFeatures.genai && results.type?.ai_generated !== undefined && (
              <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-fuchsia-300">
                    AI-Generated Probability
                  </span>
                  <span className={`text-lg font-bold ${getRiskLevel(results.type.ai_generated).color}`}>
                    {(results.type.ai_generated * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500"
                    style={{ width: `${results.type.ai_generated * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Gore Detection */}
            {activeFeatures.gore && results.gore?.prob !== undefined && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-rose-300">Gore Content</span>
                  <span className={`text-lg font-bold ${getRiskLevel(results.gore.prob).color}`}>
                    {(results.gore.prob * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${results.gore.prob * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Nudity Detection */}
            {activeFeatures.nudity && results.nudity && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-300">Nudity Score</span>
                  <span className={`text-lg font-bold ${getRiskLevel(1 - (results.nudity.none || 0)).color}`}>
                    {((1 - (results.nudity.none || 0)) * 100).toFixed(1)}%
                  </span>
                </div>
                {/* Show top categories if risk is present */}
                {(1 - (results.nudity.none || 0)) > 0.01 && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-amber-200/70">
                    {Object.entries(results.nudity)
                      .filter(([key, val]) => key !== 'none' && key !== 'context' && typeof val === 'number' && val > 0.01)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 4)
                      .map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                          <span>{(val * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Offensive Content */}
            {activeFeatures.offensive && offensiveScore !== null && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-300">
                    Offensive Content Score
                  </span>
                  <span className={`text-lg font-bold ${getRiskLevel(offensiveScore).color}`}>
                    {(offensiveScore * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${Math.min(offensiveScore * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Self-Harm Detection */}
            {activeFeatures.selfHarm && results.self_harm?.prob !== undefined && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-300">
                    Self-Harm Content
                  </span>
                  <span className={`text-lg font-bold ${getRiskLevel(results.self_harm.prob).color}`}>
                    {(results.self_harm.prob * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Text Content */}
            {activeFeatures.text && results.text && Object.keys(results.text).length > 0 && (
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
                <span className="text-sm font-medium text-cyan-300">Detected Text Categories</span>
                <div className="mt-2 space-y-1">
                  {Object.entries(results.text).map(([category, matches]) => (
                    matches.length > 0 && (
                      <div key={category} className="text-xs">
                        <span className="text-cyan-200 font-semibold capitalize">{category}: </span>
                        <span className="text-cyan-100/70">{matches.map(m => m.match || m).join(", ")}</span>
                      </div>
                    )
                  ))}
                  {Object.values(results.text).every(arr => arr.length === 0) && (
                    <p className="text-xs text-cyan-200/50 italic">No text issues detected</p>
                  )}
                </div>
              </div>
            )}

            {/* QR Code */}
            {activeFeatures.qr && results.qr && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <span className="text-sm font-medium text-blue-300">QR Code Analysis</span>
                <div className="mt-2 space-y-1">
                   {Object.entries(results.qr).map(([category, matches]) => (
                    matches.length > 0 && (
                      <div key={category} className="text-xs">
                        <span className="text-blue-200 font-semibold capitalize">{category}: </span>
                        <span className="text-blue-100/70">{matches.map(m => m.url || m).join(", ")}</span>
                      </div>
                    )
                  ))}
                  {Object.values(results.qr).every(arr => arr.length === 0) && (
                    <p className="text-xs text-blue-200/50 italic">No QR codes detected</p>
                  )}
                </div>
              </div>
            )}

            {/* Image Properties */}
            {activeFeatures.properties && hasPropertiesData && (
              <div className="rounded-lg border border-slate-500/30 bg-slate-500/10 p-3">
                <span className="text-sm font-medium text-slate-300">Image Properties</span>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  {results.sharpness !== undefined && (
                    <div>Sharpness: <span className="text-slate-300">{(results.sharpness * 100).toFixed(0)}%</span></div>
                  )}
                  {results.brightness !== undefined && (
                    <div>Brightness: <span className="text-slate-300">{(results.brightness * 100).toFixed(0)}%</span></div>
                  )}
                  {results.contrast !== undefined && (
                    <div>Contrast: <span className="text-slate-300">{(results.contrast * 100).toFixed(0)}%</span></div>
                  )}
                  {results.colors?.dominant && (
                    <div className="flex items-center gap-2">
                      Dominant: 
                      <span 
                        className="inline-block h-3 w-3 rounded-full border border-white/20" 
                        style={{ backgroundColor: results.colors.dominant.hex }}
                      />
                      <span className="text-slate-300">{results.colors.dominant.hex}</span>
                    </div>
                  )}
                  {results.media?.width && (
                    <div>Width: <span className="text-slate-300">{results.media.width}px</span></div>
                  )}
                  {results.media?.height && (
                    <div>Height: <span className="text-slate-300">{results.media.height}px</span></div>
                  )}
                  {results.media?.format && (
                    <div>Format: <span className="text-slate-300">{results.media.format}</span></div>
                  )}
                </div>
              </div>
            )}

      
          </div>
        )}
      </div>
    </div>
  );
}
