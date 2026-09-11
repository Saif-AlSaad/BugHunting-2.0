import React from "react";
import { cn } from "../../utils/cn";
import { sound } from "../../utils/audio";

interface BrowserFrameProps {
  url: string;
  clientName: string;
  viewport: "desktop" | "tablet" | "mobile";
  onViewportChange: (vp: "desktop" | "tablet" | "mobile") => void;
  onReload: () => void;
  consoleOpen: boolean;
  onToggleConsole: () => void;
  hasErrors?: boolean;
  networkCount?: number;
  children: React.ReactNode;
}

export default function BrowserFrame({
  url,
  clientName,
  viewport,
  onViewportChange,
  onReload,
  consoleOpen,
  onToggleConsole,
  hasErrors,
  networkCount = 0,
  children,
}: BrowserFrameProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
      {/* Browser Chrome Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-900/90 px-4 py-2.5">
        {/* Left: Window Controls & Nav */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            <button
              disabled
              className="rounded p-1 text-slate-600 transition-colors"
              title="Back (Disabled in sandbox)"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              disabled
              className="rounded p-1 text-slate-600 transition-colors"
              title="Forward (Disabled in sandbox)"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onReload();
              }}
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-sky-300 active:scale-95"
              title="Reload sandbox environment"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Center: Realistic SSL Address Bar */}
        <div className="flex min-w-[220px] flex-1 max-w-xl items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300 shadow-inner">
          <span className="flex items-center gap-1 text-emerald-400 font-medium" title="HTTPS Secure Sandbox">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="hidden text-[10px] sm:inline">https://</span>
          </span>
          <span className="truncate font-mono text-[11px] text-slate-200">{url}</span>
          <span className="ml-auto rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider text-slate-400">
            {clientName}
          </span>
        </div>

        {/* Right: Viewport Mode Switcher & DevTools Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/80 p-0.5 text-xs">
            <button
              onClick={() => {
                sound.playClick();
                onViewportChange("desktop");
              }}
              title="Desktop Viewport (100%)"
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 transition-all",
                viewport === "desktop"
                  ? "bg-sky-500/20 text-sky-300 font-medium shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="hidden md:inline text-[11px]">Desktop</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onViewportChange("tablet");
              }}
              title="Tablet Viewport (768px)"
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 transition-all",
                viewport === "tablet"
                  ? "bg-sky-500/20 text-sky-300 font-medium shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="hidden md:inline text-[11px]">Tablet</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onViewportChange("mobile");
              }}
              title="Mobile Viewport (390px)"
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 transition-all",
                viewport === "mobile"
                  ? "bg-sky-500/20 text-sky-300 font-medium shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="hidden md:inline text-[11px]">Mobile</span>
            </button>
          </div>

          {/* DevTools F12 toggle button */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleConsole();
            }}
            className={cn(
              "relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono font-medium transition-all active:scale-95",
              consoleOpen
                ? "border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600 hover:text-white"
            )}
            title="Toggle QA DevTools (Console & Network)"
          >
            <span>F12 DevTools</span>
            {hasErrors && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
            {networkCount > 0 && !consoleOpen && (
              <span className="rounded bg-sky-500/20 px-1 py-0.2 text-[10px] text-sky-300 font-sans">
                {networkCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Browser Viewport Area */}
      <div className="relative min-h-[500px] flex-1 overflow-x-hidden bg-[#070b14] p-4 sm:p-6 transition-all">
        {viewport === "mobile" ? (
          <div className="device-mobile-frame mx-auto bg-slate-900 shadow-2xl">
            {/* Notch */}
            <div className="h-5 bg-slate-950 flex items-center justify-center">
              <div className="h-3 w-28 rounded-full bg-slate-900 border border-slate-800" />
            </div>
            <div className="p-4">{children}</div>
            {/* Home indicator */}
            <div className="h-4 bg-slate-950 flex items-center justify-center">
              <div className="h-1 w-24 rounded-full bg-slate-700" />
            </div>
          </div>
        ) : viewport === "tablet" ? (
          <div className="device-tablet-frame mx-auto bg-slate-900 shadow-2xl p-6">
            {children}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        )}
      </div>
    </div>
  );
}
