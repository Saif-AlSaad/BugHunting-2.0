import { useState, useRef } from "react";
import type { TestEnvState, ConsoleEntry, NetworkEntry } from "../../types";
import { cn } from "../../utils/cn";
import { sound } from "../../utils/audio";

interface BankingAppProps {
  env: TestEnvState;
  hasBug: (id: string) => boolean;
  checkBug: (id: string) => void;
  onStateChange: (fn: (s: TestEnvState) => TestEnvState) => void;
  addConsoleLog: (log: Omit<ConsoleEntry, "id" | "timestamp">) => void;
  addNetworkLog: (entry: Omit<NetworkEntry, "id" | "timestamp">) => void;
}

export default function BankingApp({
  env,
  hasBug,
  checkBug,
  onStateChange,
  addConsoleLog,
  addNetworkLog,
}: BankingAppProps) {
  const [activeTab, setActiveTab] = useState<"transfer" | "deposit" | "history">("transfer");
  const lastActionRef = useRef<{ type: string; time: number; amount: number } | null>(null);

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Running balance calculator
  const runningBalance = (i: number) => {
    let bal = env.balance;
    for (let k = i + 1; k < env.transactions.length; k++) {
      const t = env.transactions[k];
      bal -= t.type === "Transfer Out" || t.type === "Withdrawal" ? t.amount : -t.amount;
    }
    return Math.round(bal * 100) / 100;
  };

  // === TRANSFER ===
  const doTransfer = () => {
    sound.playClick();
    const now = Date.now();
    const prev = lastActionRef.current;
    const dup = hasBug("bank-06") && !!prev && prev.type === "transfer" && now - prev.time < 500;
    const dupAmount = dup && prev ? prev.amount : 0;
    lastActionRef.current = { type: "transfer", time: now, amount: env.transferAmount };

    const negative = env.transferAmount <= 0;
    const overdraft = env.transferAmount > env.balance;
    const emptyTo = env.transferTo.trim() === "";

    if (negative && hasBug("bank-01")) {
      checkBug("bank-01");
      addConsoleLog({
        type: "error",
        message: `[FinancialLogicBug] Negative transfer amount of $${env.transferAmount} processed! Subtraction resulted in balance addition.`,
      });
    }

    if (overdraft && hasBug("bank-02")) {
      checkBug("bank-02");
      addConsoleLog({
        type: "error",
        message: `[OverdraftViolation] Transfer of $${env.transferAmount} exceeds available balance ($${env.balance.toFixed(2)}). Zero-limit check bypassed!`,
      });
    }

    if (emptyTo && hasBug("bank-05")) {
      checkBug("bank-05");
      addConsoleLog({
        type: "error",
        message: `[MissingRecipientException] Wire transfer initiated with blank destination routing account. Funds sent to void.`,
      });
    }

    if (dup) {
      checkBug("bank-06");
      addConsoleLog({
        type: "error",
        message: `[DoubleSpendConcurrency] Double-click within 500ms created duplicate transfer idempotency token collision!`,
      });
    }

    if ((negative && !hasBug("bank-01")) || (overdraft && !hasBug("bank-02")) || (emptyTo && !hasBug("bank-05"))) {
      addNetworkLog({
        method: "POST",
        url: "/api/v1/bank/transfers",
        status: 400,
        timeMs: 25,
        requestPayload: { to: env.transferTo, amount: env.transferAmount },
        response: JSON.stringify({ error: "Transfer rejected due to invalid parameters." }),
      });
      alert("Transfer rejected by banking policy.");
      return;
    }

    const newBalance = env.balance - env.transferAmount - dupAmount;
    const tx = {
      id: env.txIdCounter,
      type: "Transfer Out",
      amount: env.transferAmount,
      desc: `Transfer to ${env.transferTo || "(Unknown Account)"}`,
    };

    addNetworkLog({
      method: "POST",
      url: "/api/v1/bank/transfers",
      status: 200,
      timeMs: 60,
      requestPayload: { to: env.transferTo, amount: env.transferAmount },
      response: JSON.stringify({ txId: `tx_${env.txIdCounter}`, status: "completed", newBalance }),
    });

    onStateChange(s => {
      let txs = [...s.transactions, tx];
      let counter = s.txIdCounter + 1;
      if (dup) {
        txs = [...txs, { ...tx, id: counter, amount: dupAmount }];
        counter += 1;
      }
      return {
        ...s,
        balance: newBalance,
        transferTo: "",
        transferAmount: 0,
        transactions: txs,
        txIdCounter: counter,
      };
    });

    if (hasBug("bank-03") && env.transferAmount > 0) {
      checkBug("bank-03");
      addConsoleLog({
        type: "error",
        message: `[LedgerAuditDiscrepancy] Post-transfer ledger history snapshot failed to reflect current calculated balance.`,
      });
    }
  };

  // === DEPOSIT ===
  const doDeposit = () => {
    sound.playClick();
    const now = Date.now();
    const prev = lastActionRef.current;
    const dup = hasBug("bank-06") && !!prev && prev.type === "deposit" && now - prev.time < 500;
    const dupAmount = dup && prev ? prev.amount : 0;

    const amount = env.depositAmount;
    const exact = Math.round(amount * 100) / 100;
    const processed = hasBug("bank-04") ? Math.floor(amount * 100) / 100 : exact;
    const lost = amount - processed;
    lastActionRef.current = { type: "deposit", time: now, amount: processed };

    if (lost > 0.005) {
      checkBug("bank-04");
      addConsoleLog({
        type: "error",
        message: `[TruncationBug] Decimal fraction lost: $${amount} truncated to $${processed} ($${lost.toFixed(4)} shaved off by integer floor).`,
      });
    }

    if (dup) {
      checkBug("bank-06");
      addConsoleLog({
        type: "error",
        message: `[ConcurrencyGlitch] Fast deposit double-click processed two identical ledger entries simultaneously!`,
      });
    }

    const newBalance = env.balance + processed + dupAmount;
    const tx = { id: env.txIdCounter, type: "Deposit", amount: processed, desc: "Cash & Check Inward Deposit" };

    addNetworkLog({
      method: "POST",
      url: "/api/v1/bank/deposits",
      status: 200,
      timeMs: 40,
      requestPayload: { amount },
      response: JSON.stringify({ txId: `tx_${env.txIdCounter}`, status: "cleared", newBalance }),
    });

    onStateChange(s => {
      let txs = [...s.transactions, tx];
      let counter = s.txIdCounter + 1;
      if (dup) {
        txs = [...txs, { ...tx, id: counter, amount: dupAmount }];
        counter += 1;
      }
      return {
        ...s,
        balance: newBalance,
        depositAmount: 0,
        transactions: txs,
        txIdCounter: counter,
      };
    });
  };

  // === WITHDRAW ===
  const doWithdraw = () => {
    sound.playClick();
    const now = Date.now();
    const prev = lastActionRef.current;
    const dup = hasBug("bank-06") && !!prev && prev.type === "withdraw" && now - prev.time < 500;
    const dupAmount = dup && prev ? prev.amount : 0;
    lastActionRef.current = { type: "withdraw", time: now, amount: env.withdrawAmount };

    if (env.withdrawAmount > env.balance) {
      if (hasBug("bank-02")) {
        checkBug("bank-02");
        addConsoleLog({
          type: "error",
          message: `[OverdraftBreach] ATM withdrawal of $${env.withdrawAmount} permitted despite balance being only $${env.balance.toFixed(2)}.`,
        });
      } else {
        alert("Insufficient balance for withdrawal.");
        return;
      }
    }

    if (dup) checkBug("bank-06");

    const newBalance = env.balance - env.withdrawAmount - dupAmount;
    const tx = { id: env.txIdCounter, type: "Withdrawal", amount: env.withdrawAmount, desc: "ATM Cash Withdrawal" };

    addNetworkLog({
      method: "POST",
      url: "/api/v1/bank/withdrawals",
      status: 200,
      timeMs: 50,
      requestPayload: { amount: env.withdrawAmount },
      response: JSON.stringify({ txId: `tx_${env.txIdCounter}`, newBalance }),
    });

    onStateChange(s => {
      let txs = [...s.transactions, tx];
      let counter = s.txIdCounter + 1;
      if (dup) {
        txs = [...txs, { ...tx, id: counter, amount: dupAmount }];
        counter += 1;
      }
      return {
        ...s,
        balance: newBalance,
        withdrawAmount: 0,
        transactions: txs,
        txIdCounter: counter,
      };
    });
  };

  return (
    <div className="animate-fade-in py-2">
      {/* Top Banner: Available Balance & Virtual Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Balance Card */}
        <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl flex flex-col justify-between backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">NeoBank Account Balance</span>
              <h2 className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 mt-1">{fmt(env.balance)}</h2>
            </div>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300">
              ● Active FDIC
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("transfer");
              }}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                activeTab === "transfer" ? "bg-sky-500 text-white shadow-md shadow-sky-500/30" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              💸 Transfer Funds
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("deposit");
              }}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                activeTab === "deposit" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              📥 Deposit / Withdraw
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("history");
              }}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                activeTab === "history" ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              📜 Statement ({env.transactions.length})
            </button>
          </div>
        </div>

        {/* Realistic Virtual Debit Card */}
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-950 p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs tracking-wider text-white">NEOBANK BLACK</span>
            <span className="text-xl">📡</span>
          </div>

          <div className="my-3">
            <div className="h-6 w-8 rounded bg-gradient-to-tr from-amber-400 to-amber-200 shadow-sm mb-2 opacity-90" />
            <p className="font-mono text-sm tracking-widest text-slate-200">•••• •••• •••• 4821</p>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <div>
              <span className="block text-[8px] uppercase">Cardholder</span>
              <span className="text-white font-semibold">QA TESTER</span>
            </div>
            <div>
              <span className="block text-[8px] uppercase">Expires</span>
              <span className="text-white font-semibold">12/28</span>
            </div>
          </div>
        </div>
      </div>

      {/* TRANSFER TAB */}
      {activeTab === "transfer" && (
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-md">
          <h3 className="text-lg font-bold text-white mb-1">Transfer Money</h3>
          <p className="text-xs text-slate-400 mb-4">Send wire transfers to external accounts or internal members.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Recipient Account Number</label>
              <input
                type="text"
                value={env.transferTo}
                onChange={e => onStateChange(s => ({ ...s, transferTo: e.target.value }))}
                placeholder="e.g. ACC-4910283"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white font-mono focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Amount ($ USD)</label>
              <input
                type="number"
                step="any"
                value={env.transferAmount || ""}
                onChange={e => onStateChange(s => ({ ...s, transferAmount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-base font-mono font-bold text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              {[50, 200, 500, 1000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onStateChange(s => ({ ...s, transferAmount: amt }))}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-mono text-slate-300"
                >
                  +${amt}
                </button>
              ))}
            </div>

            <button
              onClick={doTransfer}
              className="w-full rounded-xl bg-sky-600 hover:bg-sky-500 py-3 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition-all active:scale-[0.99]"
            >
              Send Wire Transfer
            </button>
          </div>
        </div>
      )}

      {/* DEPOSIT / WITHDRAW TAB */}
      {activeTab === "deposit" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Deposit */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-base font-bold text-emerald-300 mb-1">Deposit Funds</h3>
            <p className="text-xs text-slate-400 mb-3">Add capital to your NeoBank account.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Deposit Amount ($)</label>
                <input
                  type="number"
                  step="any"
                  value={env.depositAmount || ""}
                  onChange={e => onStateChange(s => ({ ...s, depositAmount: parseFloat(e.target.value) || 0 }))}
                  placeholder="e.g. 99.99"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button
                onClick={doDeposit}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-all"
              >
                Deposit Funds
              </button>
            </div>
          </div>

          {/* Withdraw */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-base font-bold text-rose-300 mb-1">ATM Withdrawal</h3>
            <p className="text-xs text-slate-400 mb-3">Dispense cash from nearest terminal.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Withdraw Amount ($)</label>
                <input
                  type="number"
                  step="any"
                  value={env.withdrawAmount || ""}
                  onChange={e => onStateChange(s => ({ ...s, withdrawAmount: parseFloat(e.target.value) || 0 }))}
                  placeholder="e.g. 100.00"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-sm text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
              <button
                onClick={doWithdraw}
                className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/25 transition-all"
              >
                Withdraw Cash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION STATEMENT HISTORY */}
      {activeTab === "history" && (
        <div className="max-w-3xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-lg font-bold text-white">Transaction Statement</h3>
            <span className="text-xs font-mono text-slate-400">Total Entries: {env.transactions.length}</span>
          </div>

          {env.transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <span className="text-4xl block mb-2">📜</span>
              <p className="text-sm">No transactions posted yet. Perform a transfer or deposit.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...env.transactions].reverse().map((tx, i) => {
                const idx = env.transactions.length - 1 - i;
                const isDebit = tx.type.includes("Out") || tx.type === "Withdrawal";
                const displayBal = hasBug("bank-03")
                  ? env.balance - tx.amount + (tx.type === "Transfer Out" ? tx.amount : 0)
                  : runningBalance(idx);

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 transition-colors hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl text-base",
                          isDebit ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
                        )}
                      >
                        {isDebit ? "↗" : "↙"}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-xs">{tx.type}</h4>
                        <p className="font-mono text-[10px] text-slate-400">{tx.desc}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={cn("font-mono text-sm font-bold", isDebit ? "text-rose-300" : "text-emerald-300")}>
                        {isDebit ? "-" : "+"}${tx.amount.toFixed(2)}
                      </p>
                      <p className="font-mono text-[10px] text-slate-500">
                        Running Bal: <strong className="text-slate-300">${displayBal.toFixed(2)}</strong>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
