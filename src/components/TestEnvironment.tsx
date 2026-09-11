import { useCallback } from "react";
import type { Mission, Bug, TestEnvState, ConsoleEntry, NetworkEntry } from "../types";
import { cn } from "../utils/cn";
import { getLevelTheme } from "../game/themes";
import { INITIAL_ENV } from "../game/apps";
import { sound } from "../utils/audio";
import BrowserFrame from "./browser/BrowserFrame";
import DevToolsPanel from "./browser/DevToolsPanel";
import AuthApp from "./apps/AuthApp";
import EcomApp from "./apps/EcomApp";
import BankingApp from "./apps/BankingApp";
import DiscoveredBugsPanel from "./DiscoveredBugsPanel";

interface Props {
  mission: Mission;
  env: TestEnvState;
  discoveredBugs: string[];
  timeLeft: number;
  level: number;
  levelLabel: string;
  hintsUsed: number;
  freeHints: number;
  hintPenalty: number;
  streak: number;
  onStateChange: (fn: (s: TestEnvState) => TestEnvState) => void;
  onBugFound: (bug: Bug) => void;
  onReport: (bug: Bug) => void;
  onRequestHint: () => void;
  onFinish: () => void;
  onOpenConsole: () => void;
  onQuit: () => void;
}

export default function TestEnvironment({
  mission,
  env,
  discoveredBugs,
  timeLeft,
  level,
  levelLabel,
  hintsUsed,
  freeHints,
  hintPenalty,
  streak,
  onStateChange,
  onBugFound,
  onReport,
  onRequestHint,
  onFinish,
  onQuit,
}: Props) {
  const theme = getLevelTheme(level);

  const checkBug = useCallback((bugId: string) => {
    const bug = mission.bugs.find(b => b.id === bugId);
    if (bug && !discoveredBugs.includes(bugId)) {
      sound.playBugDiscovered();
      onBugFound(bug);
    }
  }, [mission, discoveredBugs, onBugFound]);

  const hasBug = (bugId: string) => mission.bugs.some(b => b.id === bugId);

  // Logging helpers for DevTools
  const addConsoleLog = useCallback((log: Omit<ConsoleEntry, "id" | "timestamp">) => {
    const entry: ConsoleEntry = {
      ...log,
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    onStateChange(s => ({
      ...s,
      consoleLogs: [...(s.consoleLogs || []), entry],
    }));
  }, [onStateChange]);

  const addNetworkLog = useCallback((entry: Omit<NetworkEntry, "id" | "timestamp">) => {
    const log: NetworkEntry = {
      ...entry,
      id: `n_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    onStateChange(s => ({
      ...s,
      networkLogs: [...(s.networkLogs || []), log],
    }));
  }, [onStateChange]);

  const handleClearLogs = () => {
    sound.playClick();
    onStateChange(s => ({ ...s, consoleLogs: [], networkLogs: [] }));
  };

  const handleReloadSandbox = () => {
    const fresh = INITIAL_ENV();
    onStateChange(s => ({
      ...fresh,
      viewport: s.viewport,
      consoleOpen: s.consoleOpen,
      activeDevTab: s.activeDevTab,
    }));
    addConsoleLog({ type: "info", message: "Sandbox state reset to initial conditions." });
  };

  const currentUrl =
    mission.id === "login"
      ? "auth.secureauth.internal/login"
      : mission.id === "ecommerce"
      ? "store.shopwave.internal/shop"
      : "portal.neobank.internal/dashboard";

  const errorCount = (env.consoleLogs || []).filter(l => l.type === "error").length;

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-4 sm:px-6 space-y-4">
      {/* Top QA Command Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 px-5 py-3.5 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{mission.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-white font-sans">{mission.title}</h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                {theme.version}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Client: <strong className="text-slate-300">{mission.clientName}</strong> · {mission.sprintName}
            </p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="rounded-lg bg-violet-500/10 border border-violet-500/30 px-3 py-1.5 text-xs font-mono font-bold text-violet-300">
            🎚 Lv.{level} {levelLabel}
          </span>

          {streak >= 3 && (
            <span className="rounded-lg bg-orange-500/15 border border-orange-500/30 px-3 py-1.5 text-xs font-mono font-bold text-orange-300 animate-pulse">
              🔥 Streak x{streak >= 8 ? 2 : streak >= 5 ? 1.5 : 1.2} ({streak})
            </span>
          )}

          <span
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-mono font-bold border",
              timeLeft < 60
                ? "border-rose-500/50 bg-rose-500/20 text-rose-300 animate-pulse"
                : "border-slate-800 bg-slate-950 text-emerald-400"
            )}
          >
            ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </span>

          <span className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs font-mono font-bold text-amber-300">
            🐛 {discoveredBugs.length}/{mission.bugs.length}
          </span>

          <button
            onClick={() => {
              sound.playHint();
              onRequestHint();
            }}
            disabled={discoveredBugs.length === mission.bugs.length}
            title={hintsUsed < freeHints ? `${freeHints - hintsUsed} free hints left` : `Costs ${hintPenalty} XP`}
            className="rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-200 transition-all hover:bg-violet-500/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            💡 Hint {hintsUsed < freeHints ? `(${freeHints - hintsUsed} free)` : `(−${hintPenalty} XP)`}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onFinish();
            }}
            className={cn(
              "rounded-xl px-4 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-md",
              discoveredBugs.length === mission.bugs.length
                ? "bg-emerald-500 text-slate-950 shadow-emerald-500/30 hover:bg-emerald-400"
                : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            )}
          >
            🏁 Finish Mission
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onQuit();
            }}
            className="rounded-xl border border-slate-800 px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-300 hover:border-rose-500/30 transition-colors"
            title="Exit testing"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Client Acceptance Criteria & Goal Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-2">
            <span>📋</span>
            <span>Acceptance Test Criteria:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mission.requirements.map((req, i) => (
              <span key={i} className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs text-amber-200/90">
                • {req}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3.5 flex flex-col justify-center backdrop-blur-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mission Target</span>
          <p className="text-xs font-bold text-sky-300 mt-1">
            {discoveredBugs.length === mission.bugs.length
              ? "All defects found! Submit bug tickets to clear this level."
              : `Find & report all ${mission.bugs.length} defects to unlock Level ${level + 1}.`}
          </p>
        </div>
      </div>

      {/* Main Browser Frame with Active Client App */}
      <BrowserFrame
        url={currentUrl}
        clientName={mission.clientName}
        viewport={env.viewport || "desktop"}
        onViewportChange={vp => onStateChange(s => ({ ...s, viewport: vp }))}
        onReload={handleReloadSandbox}
        consoleOpen={env.consoleOpen}
        onToggleConsole={() => onStateChange(s => ({ ...s, consoleOpen: !s.consoleOpen }))}
        hasErrors={errorCount > 0}
        networkCount={(env.networkLogs || []).length}
      >
        {mission.id === "login" && (
          <AuthApp
            env={env}
            hasBug={hasBug}
            checkBug={checkBug}
            onStateChange={onStateChange}
            addConsoleLog={addConsoleLog}
            addNetworkLog={addNetworkLog}
          />
        )}

        {mission.id === "ecommerce" && (
          <EcomApp
            env={env}
            hasBug={hasBug}
            checkBug={checkBug}
            onStateChange={onStateChange}
            addConsoleLog={addConsoleLog}
            addNetworkLog={addNetworkLog}
          />
        )}

        {mission.id === "banking" && (
          <BankingApp
            env={env}
            hasBug={hasBug}
            checkBug={checkBug}
            onStateChange={onStateChange}
            addConsoleLog={addConsoleLog}
            addNetworkLog={addNetworkLog}
          />
        )}
      </BrowserFrame>

      {/* Dockable QA DevTools (Console, Network, Storage) */}
      <DevToolsPanel
        isOpen={env.consoleOpen}
        onClose={() => onStateChange(s => ({ ...s, consoleOpen: false }))}
        activeTab={env.activeDevTab || "console"}
        onTabChange={tab => onStateChange(s => ({ ...s, activeDevTab: tab }))}
        consoleLogs={env.consoleLogs || []}
        networkLogs={env.networkLogs || []}
        env={env}
        onClearLogs={handleClearLogs}
      />

      {/* Discovered Bugs Queue */}
      <DiscoveredBugsPanel
        mission={mission}
        discoveredBugs={discoveredBugs}
        onReport={onReport}
      />
    </div>
  );
}
