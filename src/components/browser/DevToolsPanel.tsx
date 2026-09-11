import { useState } from "react";
import type { ConsoleEntry, NetworkEntry, TestEnvState } from "../../types";
import { cn } from "../../utils/cn";
import { sound } from "../../utils/audio";

interface DevToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "console" | "network" | "storage";
  onTabChange: (tab: "console" | "network" | "storage") => void;
  consoleLogs: ConsoleEntry[];
  networkLogs: NetworkEntry[];
  env: TestEnvState;
  onClearLogs: () => void;
}

export default function DevToolsPanel({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  consoleLogs,
  networkLogs,
  env,
  onClearLogs,
}: DevToolsPanelProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkEntry | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  if (!isOpen) return null;

  const filteredConsole = consoleLogs.filter(log => {
    if (filterType === "all") return true;
    return log.type === filterType;
  });

  const errorCount = consoleLogs.filter(l => l.type === "error").length;
  const warnCount = consoleLogs.filter(l => l.type === "warn").length;

  return (
    <div className="border-t border-slate-700/80 bg-slate-950 font-mono text-xs text-slate-300 shadow-2xl animate-fade-in-up">
      {/* DevTools Tab Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-bold text-sky-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span>DevTools</span>
          </span>

          <div className="ml-2 flex items-center gap-1 rounded bg-slate-950/60 p-0.5 border border-slate-800">
            <button
              onClick={() => {
                sound.playClick();
                onTabChange("console");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors",
                activeTab === "console" ? "bg-sky-500/20 text-sky-300 font-bold" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <span>Console</span>
              {errorCount > 0 && (
                <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] text-rose-300 font-bold border border-rose-500/40">
                  {errorCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onTabChange("network");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors",
                activeTab === "network" ? "bg-sky-500/20 text-sky-300 font-bold" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <span>Network</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400">
                {networkLogs.length}
              </span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onTabChange("storage");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors",
                activeTab === "storage" ? "bg-sky-500/20 text-sky-300 font-bold" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <span>Storage</span>
            </button>
          </div>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-2">
          {activeTab === "console" && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterType("all")}
                className={cn("px-1.5 py-0.5 rounded text-[10px]", filterType === "all" ? "bg-slate-700 text-white" : "text-slate-400")}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("error")}
                className={cn("px-1.5 py-0.5 rounded text-[10px]", filterType === "error" ? "bg-rose-500/30 text-rose-300" : "text-rose-400/70")}
              >
                Errors ({errorCount})
              </button>
              <button
                onClick={() => setFilterType("warn")}
                className={cn("px-1.5 py-0.5 rounded text-[10px]", filterType === "warn" ? "bg-amber-500/30 text-amber-300" : "text-amber-400/70")}
              >
                Warns ({warnCount})
              </button>
            </div>
          )}

          <button
            onClick={onClearLogs}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-rose-300 transition-colors"
            title="Clear logs"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Close DevTools"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* DevTools Content Area */}
      <div className="h-56 overflow-y-auto p-3">
        {/* CONSOLE TAB */}
        {activeTab === "console" && (
          <div className="space-y-1">
            {filteredConsole.length === 0 ? (
              <p className="text-slate-500 italic p-2">Console is clear. Trigger app actions to inspect runtime logs.</p>
            ) : (
              filteredConsole.map(log => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-2 rounded px-2 py-1 font-mono text-xs border-l-2",
                    log.type === "error"
                      ? "border-rose-500 bg-rose-500/10 text-rose-200"
                      : log.type === "warn"
                      ? "border-amber-500 bg-amber-500/10 text-amber-200"
                      : log.type === "info"
                      ? "border-sky-500 bg-sky-500/10 text-sky-200"
                      : "border-slate-600 bg-slate-900/50 text-slate-300"
                  )}
                >
                  <span className="text-[10px] opacity-50 shrink-0 select-none">[{log.timestamp}]</span>
                  <span className="shrink-0 font-bold uppercase text-[10px] select-none">
                    {log.type === "error" ? "✖ ERROR" : log.type === "warn" ? "▲ WARN" : "ℹ INFO"}
                  </span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* NETWORK TAB */}
        {activeTab === "network" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
            <div className="overflow-y-auto max-h-48 rounded border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900 sticky top-0 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-1.5">Method</th>
                    <th className="p-1.5">Path</th>
                    <th className="p-1.5">Status</th>
                    <th className="p-1.5">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {networkLogs.slice().reverse().map(entry => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedNetwork(entry)}
                      className={cn(
                        "cursor-pointer hover:bg-slate-800/60 transition-colors",
                        selectedNetwork?.id === entry.id ? "bg-sky-500/15" : ""
                      )}
                    >
                      <td className="p-1.5 font-bold text-sky-400">{entry.method}</td>
                      <td className="p-1.5 truncate max-w-[140px] text-slate-200">{entry.url}</td>
                      <td className="p-1.5">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.2 font-bold text-[10px]",
                            entry.status >= 200 && entry.status < 300
                              ? "bg-emerald-500/20 text-emerald-300"
                              : entry.status >= 400 && entry.status < 500
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-rose-500/20 text-rose-300"
                          )}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-1.5 text-slate-400">{entry.timeMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Network Inspector / Details Pane */}
            <div className="rounded border border-slate-800 bg-slate-900/60 p-3 overflow-y-auto max-h-48 text-[11px]">
              {selectedNetwork ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-sky-300">
                      {selectedNetwork.method} {selectedNetwork.url}
                    </span>
                    <span className="text-slate-400">{selectedNetwork.timestamp}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5 font-semibold">Request Payload:</span>
                    <pre className="rounded bg-slate-950 p-1.5 text-[10px] text-amber-200/90 overflow-x-auto">
                      {selectedNetwork.requestPayload
                        ? JSON.stringify(selectedNetwork.requestPayload, null, 2)
                        : "(Empty payload)"}
                    </pre>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5 font-semibold">Response Body:</span>
                    <pre className="rounded bg-slate-950 p-1.5 text-[10px] text-emerald-300/90 overflow-x-auto">
                      {selectedNetwork.response || "(Empty response)"}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic p-4 text-center">
                  Select a network request from the list to view its payload and headers.
                </p>
              )}
            </div>
          </div>
        )}

        {/* STORAGE TAB */}
        {activeTab === "storage" && (
          <div className="space-y-3">
            <div>
              <h5 className="font-bold text-sky-300 mb-1.5">Local Storage & Cookies</h5>
              <div className="overflow-x-auto rounded border border-slate-800 bg-slate-900/40">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2">Key</th>
                      <th className="p-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    <tr>
                      <td className="p-2 text-sky-300">session_id</td>
                      <td className="p-2 text-slate-300">sess_qa_9824bf190</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-sky-300">auth_user</td>
                      <td className="p-2 text-slate-300">{env.username || "null (guest)"}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-sky-300">cart_count</td>
                      <td className="p-2 text-slate-300">{env.cart.reduce((a, b) => a + b.qty, 0)} items</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-sky-300">coupon_applied</td>
                      <td className="p-2 text-slate-300">{env.couponApplied ? `true (${env.couponCount}x)` : "false"}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-sky-300">wallet_balance</td>
                      <td className="p-2 text-slate-300">${env.balance.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
