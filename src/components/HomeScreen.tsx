import { useState, useEffect } from "react";
import type { PlayerProfile } from "../types";
import { cn } from "../utils/cn";
import { sound } from "../utils/audio";

interface HomeScreenProps {
  profile: PlayerProfile;
  totalXP: number;
  onStart: () => void;
  onDashboard: () => void;
  onAchievements: () => void;
}

export default function HomeScreen({ profile, totalXP, onStart, onDashboard, onAchievements }: HomeScreenProps) {
  const [loaded, setLoaded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sound.isEnabled());

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  const toggleSound = () => {
    const next = sound.toggle();
    setSoundEnabled(next);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#080c16] px-4 text-center">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#080c16]/70 to-[#080c16]" />

      {/* Top audio quick toggle */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={toggleSound}
          className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 backdrop-blur-md transition-colors"
          title="Toggle Audio"
        >
          {soundEnabled ? "🔊 Sound On" : "🔇 Sound Muted"}
        </button>
      </div>

      <div className="relative z-10 max-w-2xl">
        <div className={cn("transition-all duration-700", loaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0")}>
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-400/30 text-5xl shadow-2xl shadow-sky-500/20">
            🐛
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-sans">
            BUG HUNTER <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">2.0</span>
          </h1>

          <p className="mt-3 text-base sm:text-lg italic text-emerald-400/90 font-serif">
            &ldquo;Everything works perfectly on staging.&rdquo;
          </p>
          <p className="mt-1 text-xs font-mono font-bold tracking-[0.25em] text-amber-400/80 uppercase">
            ── OR DOES IT? ──
          </p>
        </div>

        <p className={cn("mt-6 max-w-lg mx-auto text-sm leading-relaxed text-slate-400 font-sans transition-all duration-700 sm:text-base", loaded ? "translate-y-0 opacity-100 delay-200" : "translate-y-8 opacity-0")}>
          Step into the shoes of a software QA engineer. Probe simulated client applications, test boundary conditions, inspect network requests, file Jira defect tickets, and climb from QA Intern to Bug Hunter Legend.
        </p>

        {totalXP > 0 && (
          <div className={cn("mt-6 inline-flex items-center gap-3 rounded-2xl bg-slate-900/80 px-5 py-2.5 border border-slate-800 shadow-xl backdrop-blur-md transition-all duration-700", loaded ? "translate-y-0 opacity-100 delay-300" : "translate-y-8 opacity-0")}>
            <span className="text-lg">{profile.rank.split(" ")[0]}</span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-sm font-bold text-amber-400">{totalXP.toLocaleString()} XP</span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-sm font-bold text-emerald-400">{profile.bugsFound} bugs</span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-xs text-sky-300">Frontier: Lv.{profile.highestUnlockedLevel}</span>
          </div>
        )}

        <div className={cn("mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center transition-all duration-700", loaded ? "translate-y-0 opacity-100 delay-500" : "translate-y-8 opacity-0")}>
          <button
            onClick={() => {
              sound.playClick();
              onStart();
            }}
            className="w-full max-w-xs rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 px-8 py-3.5 text-sm font-bold tracking-wide text-white shadow-xl shadow-sky-500/25 transition-all hover:brightness-110 active:scale-95 sm:w-auto"
          >
            ▶ Launch QA Ladder
          </button>

          {totalXP > 0 && (
            <>
              <button
                onClick={() => {
                  sound.playClick();
                  onDashboard();
                }}
                className="w-full max-w-xs rounded-2xl border border-slate-700/80 bg-slate-900/80 px-6 py-3.5 text-sm font-semibold tracking-wide text-slate-300 transition-all hover:bg-slate-800 hover:text-white active:scale-95 sm:w-auto"
              >
                📊 Dashboard & Diploma
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  onAchievements();
                }}
                className="w-full max-w-xs rounded-2xl border border-slate-700/80 bg-slate-900/80 px-6 py-3.5 text-sm font-semibold tracking-wide text-slate-300 transition-all hover:bg-slate-800 hover:text-white active:scale-95 sm:w-auto"
              >
                🏆 Achievements
              </button>
            </>
          )}
        </div>

        <p className={cn("mt-8 text-xs font-mono text-slate-500 transition-all duration-700", loaded ? "translate-y-0 opacity-100 delay-700" : "translate-y-8 opacity-0")}>
          Simulate Apps • Inspect DevTools • File Bug Tickets • Earn Credentials
        </p>
      </div>
    </div>
  );
}
