import { useState, useMemo } from "react";
import type { Bug, Severity } from "../types";
import { cn } from "../utils/cn";
import { sound } from "../utils/audio";

interface Props {
  bug: Bug;
  onSubmit: (title: string, severity: Severity, steps: string, expected: string, actual: string) => void;
  onCancel: () => void;
}

interface SeverityOption {
  value: Severity;
  label: string;
  badge: string;
  desc: string;
  color: string;
}

const SEVERITY_MATRIX: SeverityOption[] = [
  {
    value: "critical",
    label: "Critical",
    badge: "🔴 Blocker",
    desc: "System crash, security breach, unauthorized access, or loss of data.",
    color: "border-rose-500 bg-rose-500/15 text-rose-300 ring-rose-500/30",
  },
  {
    value: "high",
    label: "High",
    badge: "🟠 Major",
    desc: "Core business feature failed or incorrect financial math without workaround.",
    color: "border-amber-500 bg-amber-500/15 text-amber-300 ring-amber-500/30",
  },
  {
    value: "medium",
    label: "Medium",
    badge: "🟡 Normal",
    desc: "Feature behaves incorrectly, but a reasonable workaround exists.",
    color: "border-sky-500 bg-sky-500/15 text-sky-300 ring-sky-500/30",
  },
  {
    value: "low",
    label: "Low",
    badge: "🟢 Trivial",
    desc: "Minor cosmetic glitch, label typo, or subtle styling defect.",
    color: "border-emerald-500 bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  },
];

export default function BugReportForm({ bug, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(bug.title);
  const [severity, setSeverity] = useState<Severity>(bug.severity);
  const [steps, setSteps] = useState(
    `1. Open the application feature\n2. Enter invalid or boundary test data\n3. Execute the action\n4. Observe unexpected system behavior`
  );
  const [expected, setExpected] = useState("System should validate input and reject invalid action.");
  const [actual, setActual] = useState(bug.description);

  // Real-time QA Quality Score (1 to 5 stars)
  const qualityScore = useMemo(() => {
    let score = 1;
    if (title.trim().length >= 10) score += 1;
    if (steps.trim().length >= 25 && steps.includes("1.")) score += 1;
    if (expected.trim().length >= 15) score += 1;
    if (actual.trim().length >= 15) score += 1;
    return score;
  }, [title, steps, expected, actual]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    onSubmit(title, severity, steps, expected, actual);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl animate-fade-in-up rounded-2xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl">
        {/* Jira-style Ticket Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold">
              🐛
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-sky-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-300 border border-sky-500/30">
                  DEFECT-TICKET
                </span>
                <span className="font-mono text-xs text-slate-500">ID: {bug.id}</span>
              </div>
              <h3 className="text-lg font-bold text-white font-sans mt-0.5">Log Defect Report</h3>
            </div>
          </div>

          {/* Quality Meter */}
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-sans">Report Quality Score</span>
            <div className="flex items-center gap-0.5 mt-0.5" title={`${qualityScore} of 5 quality rating`}>
              {[1, 2, 3, 4, 5].map(star => (
                <span
                  key={star}
                  className={cn("text-xs", star <= qualityScore ? "text-amber-400" : "text-slate-700")}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Issue Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Defect Summary / Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              placeholder="Concise, descriptive summary of what failed"
              required
            />
          </div>

          {/* Severity Matrix Guide */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Severity Impact Level <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Selecting wrong severity incurs a 40% penalty</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SEVERITY_MATRIX.map(s => {
                const isSelected = severity === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSeverity(s.value);
                    }}
                    className={cn(
                      "flex flex-col text-left p-3 rounded-xl border transition-all",
                      isSelected
                        ? cn(s.color, "ring-2 shadow-md")
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{s.badge}</span>
                      <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">{s.label}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-85">{s.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Steps to Reproduce */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Steps to Reproduce (Numbered format) <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setSteps(
                    `1. Navigate to client module\n2. Input trigger values\n3. Click execute/submit button\n4. Verify application defect occurrence`
                  )
                }
                className="text-[10px] text-sky-400 hover:underline"
              >
                Reset Template
              </button>
            </div>
            <textarea
              value={steps}
              onChange={e => setSteps(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none leading-relaxed"
              placeholder="Step-by-step instructions for reproducing the bug..."
              required
            />
          </div>

          {/* Expected vs Actual Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Expected Result <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={expected}
                onChange={e => setExpected(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                placeholder="What should correctly happen according to requirements?"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Actual Observed Result <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={actual}
                onChange={e => setActual(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                placeholder="What malfunctioned or bypassed validation?"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onCancel();
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Discard
            </button>

            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 active:scale-95 flex items-center gap-2"
            >
              <span>Submit to QA Lead</span>
              <span>→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
