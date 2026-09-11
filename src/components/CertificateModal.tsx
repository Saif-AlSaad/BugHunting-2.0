import type { PlayerProfile } from "../types";
import { sound } from "../utils/audio";

interface Props {
  profile: PlayerProfile;
  totalXP: number;
  onClose: () => void;
}

export default function CertificateModal({ profile, totalXP, onClose }: Props) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl animate-fade-in-up rounded-3xl border-4 border-amber-400/40 bg-gradient-to-b from-[#0e1628] to-[#080d1a] p-8 text-center shadow-2xl ring-1 ring-amber-400/20">
        {/* Certificate Frame Accents */}
        <div className="absolute top-4 left-4 h-6 w-6 border-t-2 border-l-2 border-amber-400/60" />
        <div className="absolute top-4 right-4 h-6 w-6 border-t-2 border-r-2 border-amber-400/60" />
        <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-amber-400/60" />
        <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-amber-400/60" />

        {/* Header */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/40 text-3xl mb-3 shadow-lg shadow-amber-500/20">
          📜
        </div>

        <p className="text-xs font-mono tracking-[0.3em] uppercase text-amber-400 font-bold">
          Bug Hunter 2.0 QA Academy
        </p>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-wide mt-2">
          Certificate of Competence
        </h1>

        <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto italic font-serif">
          This document certifies that the named candidate has demonstrated proficiency in exploratory software testing, boundary value analysis, security defect detection, and structured Jira triage.
        </p>

        {/* Candidate & Rank */}
        <div className="my-6 py-4 border-y border-amber-400/20">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block">
            Candidate Honor
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-300 font-sans tracking-tight mt-1">
            {profile.rank}
          </h2>
          <p className="text-xs text-sky-300 font-mono mt-1">
            {totalXP.toLocaleString()} Verified XP Earned
          </p>
        </div>

        {/* Metrics Table */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center my-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
            <span className="text-lg font-mono font-bold text-emerald-400">{profile.bugsFound}</span>
            <p className="text-[9px] uppercase font-mono text-slate-400 tracking-wider">Defects Discovered</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
            <span className="text-lg font-mono font-bold text-rose-400">{profile.bugsCritical}</span>
            <p className="text-[9px] uppercase font-mono text-slate-400 tracking-wider">Critical Blockers</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
            <span className="text-lg font-mono font-bold text-amber-400">{profile.accuracy}%</span>
            <p className="text-[9px] uppercase font-mono text-slate-400 tracking-wider">Reporting Accuracy</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
            <span className="text-lg font-mono font-bold text-sky-400">Lv.{profile.highestUnlockedLevel}</span>
            <p className="text-[9px] uppercase font-mono text-slate-400 tracking-wider">Highest Frontier</p>
          </div>
        </div>

        {/* Footer Seal & Signature */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800 pt-4 text-xs font-mono text-slate-400">
          <div className="text-left">
            <span className="block text-[10px] text-slate-500">Date Issued:</span>
            <span className="text-slate-300 font-medium">{currentDate}</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-300">
            <span>🛡️</span>
            <span className="font-bold tracking-wider uppercase">Verified QA Signature</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 text-xs transition-colors shadow-lg shadow-amber-500/20"
          >
            🖨️ Print / Save PDF
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-6 py-2.5 text-xs transition-colors"
          >
            Close Certificate
          </button>
        </div>
      </div>
    </div>
  );
}
