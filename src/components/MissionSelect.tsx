import { useState } from "react";
import { getLevelBandInfo, MAX_LEVEL } from "../game/apps";
import { cn } from "../utils/cn";
import { sound } from "../utils/audio";

interface Props {
  highestUnlockedLevel: number;
  levelStars?: Record<number, number>;
  onSelectLevel: (level: number) => void;
  onBack: () => void;
}

const CHAPTERS = [
  {
    id: 0,
    title: "Chapter 1: Identity & Access Control",
    subtitle: "SecureAuth Corp · Authentication Systems",
    icon: "🔐",
    from: 1,
    to: 34,
    color: "from-sky-500/20 to-indigo-500/20 border-sky-500/30 text-sky-300",
  },
  {
    id: 1,
    title: "Chapter 2: E-Commerce Reliability",
    subtitle: "ShopWave Inc · Cart & Order Logic",
    icon: "🛍️",
    from: 35,
    to: 67,
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300",
  },
  {
    id: 2,
    title: "Chapter 3: High-Frequency Fintech",
    subtitle: "NeoBank Ltd · Financial Ledgers & Security",
    icon: "🏦",
    from: 68,
    to: 100,
    color: "from-amber-500/20 to-rose-500/20 border-amber-500/30 text-amber-300",
  },
];

export default function MissionSelect({
  highestUnlockedLevel,
  levelStars = {},
  onSelectLevel,
  onBack,
}: Props) {
  // Auto-select chapter containing current level
  const initialChapter = CHAPTERS.find(
    c => highestUnlockedLevel >= c.from && highestUnlockedLevel <= c.to
  )?.id ?? 0;

  const [selectedChapter, setSelectedChapter] = useState(initialChapter);
  const currentChapter = CHAPTERS[selectedChapter];

  const chapterLevels = Array.from(
    { length: currentChapter.to - currentChapter.from + 1 },
    (_, i) => currentChapter.from + i
  );

  const chapterClearedCount = chapterLevels.filter(lvl => lvl < highestUnlockedLevel).length;

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
            QA Career Ladder
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            100 progressively challenging sprints across 3 mission chapters. Find defects, submit verified reports, and earn 3 stars.
          </p>
        </div>

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

      {/* Chapter Selection Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        {CHAPTERS.map(ch => {
          const isUnlocked = highestUnlockedLevel >= ch.from;
          const isSelected = selectedChapter === ch.id;
          const chCleared = Array.from(
            { length: ch.to - ch.from + 1 },
            (_, i) => ch.from + i
          ).filter(l => l < highestUnlockedLevel).length;

          return (
            <button
              key={ch.id}
              onClick={() => {
                sound.playClick();
                setSelectedChapter(ch.id);
              }}
              className={cn(
                "flex flex-col text-left p-4 rounded-2xl border transition-all relative overflow-hidden",
                isSelected
                  ? "bg-slate-900 border-sky-400/60 shadow-xl ring-1 ring-sky-400/40"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{ch.icon}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  Lv.{ch.from}–{ch.to}
                </span>
              </div>
              <h3 className="font-bold text-sm text-white">{ch.title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{ch.subtitle}</p>

              <div className="mt-3 flex items-center justify-between text-[11px] font-mono border-t border-slate-800/80 pt-2 text-slate-400">
                <span>Progress:</span>
                <span className="font-bold text-sky-300">
                  {chCleared}/{ch.to - ch.from + 1} Sprints
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Chapter Header & Grid */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentChapter.icon}</span>
            <div>
              <h3 className="font-bold text-base text-white">{currentChapter.title}</h3>
              <p className="text-xs text-slate-400">
                Completed {chapterClearedCount} of {chapterLevels.length} sprints
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs font-mono text-emerald-400 font-semibold">
              Current Rank Frontier: Lv.{highestUnlockedLevel}
            </span>
          </div>
        </div>

        {/* Level Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-11 gap-2.5">
          {chapterLevels.map(lvl => {
            const locked = lvl > highestUnlockedLevel;
            const cleared = lvl < highestUnlockedLevel;
            const current = lvl === highestUnlockedLevel;
            const stars = levelStars[lvl] || (cleared ? 3 : 0);

            return (
              <button
                key={lvl}
                onClick={() => {
                  if (!locked) {
                    sound.playClick();
                    onSelectLevel(lvl);
                  }
                }}
                disabled={locked}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl p-1.5 transition-all text-center",
                  locked
                    ? "cursor-not-allowed bg-slate-950/40 border border-slate-900 text-slate-700"
                    : current
                    ? "bg-gradient-to-tr from-sky-500/25 to-indigo-500/25 border-2 border-sky-400 shadow-lg shadow-sky-500/20 text-white font-black hover:scale-105 active:scale-95"
                    : cleared
                    ? "bg-slate-900/80 border border-emerald-500/30 text-emerald-300 hover:border-emerald-400 active:scale-95"
                    : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                )}
                title={locked ? `Locked: Clear Level ${lvl - 1}` : `Sprint Level ${lvl}`}
              >
                <span className="font-mono text-xs font-bold">{locked ? "🔒" : lvl}</span>

                {/* Stars */}
                {!locked && (
                  <div className="flex items-center gap-0.5 mt-1 text-[8px]">
                    {[1, 2, 3].map(s => (
                      <span key={s} className={s <= stars ? "text-amber-400" : "text-slate-700"}>
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}