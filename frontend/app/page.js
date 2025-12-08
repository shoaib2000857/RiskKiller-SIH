"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MetricCard from "@/components/MetricCard";
import IntakeForm from "@/components/IntakeForm";
import EventsFeed from "@/components/EventsFeed";
import CaseTable from "@/components/CaseTable";
import CaseDetail from "@/components/CaseDetail";
import Toast from "@/components/Toast";
import FederatedBlockchain from "@/components/FederatedBlockchain";
import WorldHeatmapLeaflet from "@/components/WorldHeatmapLeaflet";
import {
  submitIntake,
  fetchCase,
  requestSharingPackage,
  createEventStream,
  API_BASE_URL,
} from "@/lib/api";

export default function HomePage() {
  const [results, setResults] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [events, setEvents] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const [shareOutput, setShareOutput] = useState("");
  const [toast, setToast] = useState({ message: "", tone: "success" });
  const submissionsRef = useRef({});
  const eventControllerRef = useRef(null);

  useEffect(() => {
    const timer = toast.message
      ? setTimeout(() => setToast({ message: "", tone: "success" }), 4200)
      : null;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    if (eventControllerRef.current) return;
    const source = createEventStream(
      async (event) => {
        setEvents((prev) => {
          const next = [event, ...prev];
          return next.slice(0, 20);
        });

        upsertResult({
          intake_id: event.intake_id,
          submitted_at: event.submitted_at,
          classification: event.classification,
          composite_score: event.score,
        });

        try {
          const hydrated = await fetchCase(event.intake_id);
          upsertResult(hydrated);
        } catch (error) {
          console.error("Failed to hydrate case via events stream", error);
        }
      },
      () => {
        setToast({
          message: "Event stream interrupted. Retrying…",
          tone: "error",
        });
        if (eventControllerRef.current) {
          eventControllerRef.current.close();
          eventControllerRef.current = null;
        }
        setTimeout(() => {
          handleEventStream();
        }, 4000);
      }
    );
    eventControllerRef.current = source;
    return () => {
      source.close();
      eventControllerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEventStream = () => {
    if (eventControllerRef.current) return;
    const source = createEventStream(
      async (event) => {
        setEvents((prev) => {
          const next = [event, ...prev];
          return next.slice(0, 20);
        });

        upsertResult({
          intake_id: event.intake_id,
          submitted_at: event.submitted_at,
          classification: event.classification,
          composite_score: event.score,
        });

        try {
          const hydrated = await fetchCase(event.intake_id);
          upsertResult(hydrated);
        } catch (error) {
          console.error("Failed to hydrate case after reconnect", error);
        }
      },
      () => {
        if (eventControllerRef.current) {
          eventControllerRef.current.close();
          eventControllerRef.current = null;
        }
      }
    );
    eventControllerRef.current = source;
  };

  const upsertResult = (result) => {
    if (!result || !result.intake_id) return;
    setResults((previous) => {
      const existingIndex = previous.findIndex(
        (item) => item.intake_id === result.intake_id
      );
      if (existingIndex >= 0) {
        const updated = [...previous];
        updated[existingIndex] = { ...updated[existingIndex], ...result };
        return sortResults(updated);
      }
      return sortResults([result, ...previous]);
    });
  };

  const sortResults = (data) =>
    [...data].sort((a, b) => {
      const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      return dateB - dateA;
    });

  const handleSubmitIntake = async (payload) => {
    try {
      setIsSubmitting(true);
      setShareOutput("");
      const result = await submitIntake(payload);
      submissionsRef.current[result.intake_id] = payload;
      upsertResult(result);
      setSelectedId(result.intake_id);
      setToast({ message: "Narrative analysed successfully.", tone: "success" });
      return true;
    } catch (error) {
      setToast({
        message: `Unable to analyse narrative: ${error.message}`,
        tone: "error",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectCase = async (intakeId) => {
    if (!intakeId) return;
    setSelectedId(intakeId);
    try {
      const hydrated = await fetchCase(intakeId);
      upsertResult(hydrated);
    } catch (error) {
      setToast({
        message: `Unable to fetch case detail: ${error.message}`,
        tone: "error",
      });
    }
  };

  const handleShare = async (payload) => {
    try {
      setSharePending(true);
      const packagePayload = await requestSharingPackage(payload);
      setShareOutput(JSON.stringify(packagePayload, null, 2));
      setToast({ message: "Sharing package generated.", tone: "success" });
    } catch (error) {
      setToast({
        message: error.message || "Unable to generate sharing package.",
        tone: "error",
      });
    } finally {
      setSharePending(false);
    }
  };

  const metrics = useMemo(() => {
    const total = results.length;
    const highRisk = results.filter((result) => {
      const classification = (result.classification || "").toLowerCase();
      return (
        classification.includes("high") ||
        (typeof result.composite_score === "number" &&
          result.composite_score >= 0.7)
      );
    }).length;
    const average =
      total === 0
        ? 0
        : Math.round(
            (results.reduce((acc, result) => {
              if (typeof result.composite_score === "number") {
                return acc + result.composite_score;
              }
              return acc;
            }, 0) /
              total) *
              100
          );
    const lastUpdated = results[0]?.submitted_at
      ? new Date(results[0].submitted_at).toLocaleString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          day: "2-digit",
          month: "short",
        })
      : "—";
    return { total, highRisk, average, lastUpdated };
  }, [results]);

  const selectedCase = results.find((result) => result.intake_id === selectedId);
  const submissionPayload = submissionsRef.current[selectedId] || null;

  return (
    <>
      <main className="relative min-h-screen overflow-hidden pb-20">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-emerald-500/40 blur-3xl opacity-30" style={{ pointerEvents: "none" }} />
        <div className="absolute -right-44 bottom-[-6rem] h-96 w-96 rounded-full bg-cyan-500/30 blur-[160px] opacity-60" style={{ pointerEvents: "none" }} />

        <header className="relative z-10 border-b border-emerald-500/10 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl space-y-4">
                  <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
                    TattvaDrishti Shield
                  </p>
                  <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                    Proactive tradecraft dashboard for{" "}
                    <span className="text-emerald-300">malign influence</span>{" "}
                    detection.
                  </h1>
                  <p className="text-base text-slate-300 md:text-lg">
                    Stream intakes, score narratives, and assemble shareable
                    intelligence packages directly from the FastAPI orchestrator.
                    This standalone Next.js experience highlights the full surface
                    area of your backend.
                  </p>
                </div>
                <div className="space-y-4 text-right text-sm text-slate-300">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">
                      API Base
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-400/80">
                      {API_BASE_URL.replace("http://", "").replace("https://", "")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
                      Endpoints
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-400/80">
                      /api/v1/intake · /api/v1/cases/:id · /api/v1/share ·
                      /api/v1/integrations/threat-intel · /api/v1/integrations/siem
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard label="Analyses Run" value={metrics.total} />
                <MetricCard
                  label="High Risk Flags"
                  value={metrics.highRisk}
                  accent="text-rose-200"
                />
              <MetricCard
                label="Average Score"
                value={`${metrics.average}%`}
                accent="text-amber-200"
              />
              <MetricCard
                label="Last Activity"
                value={metrics.lastUpdated}
                accent="text-slate-200"
                valueClassName="text-lg"
              />
              </div>
            </div>
          </div>
        </header>

        <section className="relative z-10 mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.7fr_1fr]">
            <div className="flex flex-col gap-8">
              <IntakeForm
                onSubmit={handleSubmitIntake}
                isSubmitting={isSubmitting}
                onValidationError={(message) =>
                  setToast({ message, tone: "error" })
                }
              />
              <CaseTable
                results={results}
                selectedId={selectedId}
                onSelect={handleSelectCase}
              />
            </div>
            <EventsFeed events={events} />
          </div>

          <div className="mt-12">
            <WorldHeatmapLeaflet />
          </div>


          <div className="mt-12 grid grid-cols-1 gap-8 xl:grid-cols-[1.4fr]">
            <CaseDetail
              caseData={selectedCase}
              submission={submissionPayload}
              onShare={handleShare}
              sharePending={sharePending}
              shareOutput={shareOutput}
            />
          </div>

          <div className="mt-12">
            <FederatedBlockchain />
          </div>
        </section>
      </main>
      <Toast message={toast.message} tone={toast.tone} />
    </>
  );
}
