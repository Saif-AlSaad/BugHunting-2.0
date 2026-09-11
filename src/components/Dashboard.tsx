import { useState } from "react";
import type { PlayerProfile, BugReport } from "../types";
import { RANKS } from "../types";
import { cn } from "../utils/cn";
import { sound } from "../utils/audio";
import CertificateModal from "./CertificateModal";

interface Props {
  profile: PlayerProfile;
  totalXP: number;
  reports: BugReport[];
  onBack: () => void;
}

export default function Dashboard({ profile, totalXP, reports, onBack }: Props) {
  const [showCertificate, setShowCertificate] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sound.isEnabled());

  const rank = RANKS.filter(r => totalXP >= r.minXP).pop() || RANKS[0];
  const nextRank = RANKS.find(r => totalXP < r.minXP);
  const pctToNext = nextRank ? Math.min(100, Math.max(0, ((totalXP - rank.minXP) / (nextRank.minXP - rank.minXP)) * 100)) : 100;

  const toggleSound = () => {
    const next = sound.toggle();
    setSoundEnabled(next);
  };

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
            QA Performance Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Career statistics, ranking progression, defect accuracy metrics, and credential verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            title="Toggle game sound effects"
          >
            <span>{soundEnabled ? "🔊 Sound On" : "🔇 Sound Muted"}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onBack();
            }}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Rank Progress Card */}
      <div className="mt-6 rounded-3xl border border-sky-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-4xl shadow-lg shadow-sky-500/20">
              {rank.emoji}
            </span>
            <div>
              <span className="text-xs font-mono font-semibold text-sky-400 uppercase tracking-wider">
                Current QA Rank
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white font-sans mt-0.5">
                {rank.name}
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setShowCertificate(true);
            }}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:brightness-110 active:scale-95 flex items-center gap-2"
          >
            <span>📜 View Verified Certificate</span>
          </button>
        </div>

        {nextRank ? (
          <div className="mt-6 border-t border-slate-800/80 pt-5">
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
              <span>{totalXP.toLocaleString()} XP Current</span>
              <span>Next Rank: <strong className="text-sky-300">{nextRank.name}</strong> ({nextRank.minXP.toLocaleString()} XP)</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${pctToNext}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-6 border-t border-slate-800/80 pt-4 text-xs font-mono text-emerald-400 font-bold">
            👑 Maximum Rank Achieved: You are an official Software Testing Legend!
          </div>
        )}
      </div>

      {/* Stats Matrix Grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Bugs Discovered", value: profile.bugsFound, color: "text-emerald-400" },
          { label: "Total XP Earned", value: totalXP.toLocaleString(), color: "text-amber-400" },
          { label: "Reporting Accuracy", value: `${profile.accuracy}%`, color: "text-sky-400" },
          { label: "Critical Blockers", value: profile.bugsCritical, color: "text-rose-400" },
          { label: "Total Test Tickets", value: profile.totalReports, color: "text-violet-400" },
          { label: "False Positives", value: profile.falsePositives, color: "text-slate-400" },
          { label: "Hints Consumed", value: profile.hintsUsed, color: "text-violet-300" },
          { label: "Career Frontier", value: `Lv.${profile.highestUnlockedLevel}/100`, color: "text-fuchsia-400" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-md backdrop-blur-md">
            <p className={cn("text-2xl font-black font-mono", s.color)}>{s.value}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Triage Logs */}
      {reports.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold text-white mb-3 font-sans">Recent Defect Triage Submissions</h3>
          <div className="space-y-2">
            {reports.slice(-5).reverse().map((r, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn("font-bold", r.valid ? "text-emerald-400" : "text-rose-400")}>
                    {r.valid ? "✓ ACCEPTED" : "✗ REJECTED"}
                  </span>
                  <span className="font-semibold text-white">{r.title}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className={r.valid ? "text-emerald-400" : "text-rose-400"}>
                    {r.valid ? `+${r.score} XP` : "Penalized"}
                  </span>
                  <span className="text-slate-500 text-[10px]">{new Date(r.submittedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificate && (
        <CertificateModal
          profile={profile}
          totalXP={totalXP}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
}
