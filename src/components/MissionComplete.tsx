import { useEffect } from "react";
import type { Mission, BugReport } from "../types";
import { cn } from "../utils/cn";
import { sound } from "../utils/audio";

interface Props {
  mission: Mission;
  discoveredCount: number;
  totalBugs: number;
  reports: BugReport[];
  timeUsed: number;
  xpEarned: number;
  accuracy: number;
  level: number;
  hintsUsed: number;
  bestStreak: number;
  levelCleared: boolean;
  leveledUp: boolean;
  onContinue: () => void;
  onHome: () => void;
}

export default function MissionComplete({
  mission,
  discoveredCount,
  totalBugs,
  reports,
  timeUsed,
  xpEarned,
  accuracy,
  level,
  hintsUsed,
  bestStreak,
  levelCleared,
  leveledUp,
  onContinue,
  onHome,
}: Props) {
  const validCount = reports.filter(r => r.valid).length;
  const falseCount = reports.filter(r => !r.valid).length;
  const mins = Math.floor(timeUsed / 60);
  const secs = timeUsed % 60;

  // Star calculation
  const earnedStars = levelCleared
    ? accuracy === 100 && hintsUsed === 0
      ? 3
      : hintsUsed <= 1
      ? 2
      : 1
    : 0;

  useEffect(() => {
    if (levelCleared) {
      sound.playLevelClear();
    } else {
      sound.playReportReject();
    }
  }, [levelCleared]);

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 py-8">
      <div
        className={cn(
          "w-full rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-fade-in-up",
          levelCleared
            ? "border-emerald-500/30 bg-slate-900/95 ring-1 ring-emerald-400/20"
            : "border-rose-500/30 bg-slate-900/95 ring-1 ring-rose-400/20"
        )}
      >
        {/* Header Icon & Title */}
        <div className="text-center">
          <div
            className={cn(
              "mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-xl mb-4",
              levelCleared
                ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/25"
                : "bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-rose-500/25"
            )}
          >
            {levelCleared ? "🏆" : "⚠️"}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
            {levelCleared ? "Sprint Evaluation Complete!" : "Sprint Incomplete"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mission.title} · {mission.clientName} · Sprint Lv.{level}
          </p>

          {/* Star Rating Banner */}
          {levelCleared && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {[1, 2, 3].map(star => (
                <span
                  key={star}
                  className={cn(
                    "text-3xl transition-transform",
                    star <= earnedStars ? "text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-slate-700"
                  )}
                >
                  ★
                </span>
              ))}
            </div>
          )}

          {levelCleared && leveledUp && (
            <div className="mt-3 inline-block rounded-full bg-sky-500/15 border border-sky-400/30 px-4 py-1 text-xs font-bold text-sky-300">
              🔓 Sprint Level {level + 1} Unlocked!
            </div>
          )}

          {!levelCleared && (
            <p className="mt-3 text-xs text-slate-400 max-w-md mx-auto">
              All {totalBugs} planted defects must be discovered and submitted with valid bug reports to pass QA review.
            </p>
          )}
        </div>

        {/* Performance Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-center">
            <p className="text-xl font-black font-mono text-emerald-400">
              {discoveredCount}/{totalBugs}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Bugs Discovered</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-center">
            <p className="text-xl font-black font-mono text-sky-400">{validCount}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Valid Tickets</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-center">
            <p className="text-xl font-black font-mono text-amber-400">{accuracy}%</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">QA Accuracy</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-center">
            <p className="text-xl font-black font-mono text-rose-400">{falseCount}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">False Reports</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-center">
            <p className="text-xl font-black font-mono text-violet-400">{hintsUsed}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Hints Consumed</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-center">
            <p className="text-xl font-black font-mono text-orange-400">🔥 {bestStreak}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Best Streak</p>
          </div>
        </div>

        {/* XP Payout Banner */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div>
            <span className="text-xs text-emerald-300 font-semibold block">Sprint Payout:</span>
            <span className="text-2xl font-black font-mono text-white">+{xpEarned} XP</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Execution Time:</span>
            <span className="text-base font-bold font-mono text-emerald-300">
              {mins}m {secs}s
            </span>
          </div>
        </div>

        {/* Reports Submitted Details */}
        {reports.length > 0 && (
          <div className="mt-5">
            <h4 className="text-xs font-bold text-slate-300 mb-2 font-sans">Submitted Bug Reports:</h4>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {reports.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span>{r.valid ? "✅" : "❌"}</span>
                    <span className="truncate text-slate-200">{r.title}</span>
                  </div>
                  <span className={cn("font-mono font-bold shrink-0", r.valid ? "text-emerald-400" : "text-rose-400")}>
                    {r.valid ? `+${r.score} XP` : "Rejected"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onContinue();
            }}
            className="flex-1 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:brightness-110 active:scale-95"
          >
            {levelCleared ? "Continue to Next Sprint →" : "Retry Level Sprint"}
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onHome();
            }}
            className="rounded-2xl border border-slate-700 bg-slate-800 px-6 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}