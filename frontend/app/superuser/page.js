"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FederatedBlockchain from "@/components/FederatedBlockchain";
import WorldHeatmapLeaflet from "@/components/WorldHeatmapLeaflet";
import ThemeToggle from "@/components/ThemeToggle";
import SystemMonitor from "@/components/SystemMonitor";
import BlockchainGraph from "@/components/BlockchainGraph";

export default function SuperUserPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen pb-20 overflow-x-hidden bg-slate-950">
      {/* Background glows */}
      <div
        className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl opacity-20"
        style={{ pointerEvents: "none" }}
      />
      <div
        className="absolute -right-44 bottom-[-6rem] h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[160px] opacity-40"
        style={{ pointerEvents: "none" }}
      />

      <header className="relative z-10 border-b border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-slate-900 to-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
              <ThemeToggle />
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2">
                <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-semibold uppercase tracking-[0.35em] text-purple-300">
                  Super User Access
                </span>
              </div>

              <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                System Administration & 
                <span className="text-purple-300"> Federated Control</span>
              </h1>

              <p className="max-w-3xl text-base text-slate-300 md:text-lg">
                Advanced monitoring, blockchain ledger management, and global threat intelligence visualization. Monitor system health, validate distributed nodes, and analyze worldwide threat patterns.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        <div className="space-y-12">
          {/* System Monitoring Panel */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">System Monitoring</h2>
              <p className="mt-1 text-sm text-slate-400">
                Real-time system metrics, API health, and database statistics
              </p>
            </div>
            <SystemMonitor />
          </div>

          {/* Blockchain Network Topology Graph */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">Network Architecture</h2>
              <p className="mt-1 text-sm text-slate-400">
                Dynamic visualization of federated blockchain topology
              </p>
            </div>
            <BlockchainGraph />
          </div>

          {/* Federated Blockchain */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">Federated Blockchain Ledger</h2>
              <p className="mt-1 text-sm text-slate-400">
                Distributed node management, chain validation, and synchronization
              </p>
            </div>
            <FederatedBlockchain />
          </div>

          {/* World Heatmap */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">Regional User Demographics</h2>
              <p className="mt-1 text-sm text-slate-400">
                Global threat distribution and geographic risk analysis
              </p>
            </div>
            <WorldHeatmapLeaflet />
          </div>
        </div>
      </section>
    </main>
  );
}
