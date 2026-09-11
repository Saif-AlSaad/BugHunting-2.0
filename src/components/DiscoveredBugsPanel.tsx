import type { Mission, Bug, Severity } from "../types";
import { cn } from "../utils/cn";
import { sound } from "../utils/audio";

interface DiscoveredBugsPanelProps {
  mission: Mission;
  discoveredBugs: string[];
  onReport: (bug: Bug) => void;
}

const SEVERITY_STYLES: Record<Severity, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-rose-500/15", text: "text-rose-300", border: "border-rose-500/30" },
  high: { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30" },
  medium: { bg: "bg-sky-500/15", text: "text-sky-300", border: "border-sky-500/30" },
  low: { bg: "bg-slate-500/15", text: "text-slate-300", border: "border-slate-500/30" },
};

export default function DiscoveredBugsPanel({
  mission,
  discoveredBugs,
  onReport,
}: DiscoveredBugsPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐛</span>
          <h3 className="font-bold text-sm text-white font-sans">
            Discovered Defect Queue ({discoveredBugs.length}/{mission.bugs.length})
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {discoveredBugs.length === mission.bugs.length ? "🎉 All bugs discovered!" : "Explore the app to trigger defects"}
        </span>
      </div>

      {discoveredBugs.length === 0 ? (
        <div className="py-6 text-center text-slate-500 text-xs">
          <p>No defects uncovered yet.</p>
          <p className="text-[11px] text-slate-600 mt-1">Interact with form boundaries, negative values, fast clicks, or empty inputs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {discoveredBugs.map(bid => {
            const bug = mission.bugs.find(b => b.id === bid);
            if (!bug) return null;
            const style = SEVERITY_STYLES[bug.severity];

            return (
              <div
                key={bid}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition-all hover:border-slate-700"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.2 text-[10px] font-mono font-bold uppercase border",
                        style.bg,
                        style.text,
                        style.border
                      )}
                    >
                      {bug.severity}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">+{bug.xpReward} XP</span>
                  </div>
                  <h4 className="font-semibold text-xs text-white truncate">{bug.title}</h4>
                </div>

                <button
                  onClick={() => {
                    sound.playClick();
                    onReport(bug);
                  }}
                  className="shrink-0 rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-sky-600/30 transition-all active:scale-95"
                >
                  Draft Ticket
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
