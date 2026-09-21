import { useState } from "react";
import type { TestEnvState, ConsoleEntry, NetworkEntry } from "../../types";
import { cn } from "../../utils/cn";
import { sound } from "../../utils/audio";

interface HealthAppProps {
  env: TestEnvState;
  hasBug: (id: string) => boolean;
  checkBug: (id: string) => void;
  onStateChange: (fn: (s: TestEnvState) => TestEnvState) => void;
  addConsoleLog: (log: Omit<ConsoleEntry, "id" | "timestamp">) => void;
  addNetworkLog: (entry: Omit<NetworkEntry, "id" | "timestamp">) => void;
}

export default function HealthApp({
  env,
  hasBug,
  checkBug,
  onStateChange,
  addConsoleLog,
  addNetworkLog,
}: HealthAppProps) {
  const [activeTab, setActiveTab] = useState<"vitals" | "dosage" | "meds" | "audit" | "export">("vitals");
  const [vitalsInput, setVitalsInput] = useState({
    hr: env.heartRateBpm ?? 82,
    systolic: env.bloodPressureSystolic ?? 110,
    diastolic: env.bloodPressureDiastolic ?? 70,
    spo2: env.oxygenSaturation ?? 98,
  });
  const [dosageForm, setDosageForm] = useState({
    drug: "Amoxicillin Oral Suspension",
    weightLbs: env.patientWeightLbs ?? 55,
    dosePerKg: 20, // mg/kg/dose
  });
  const [dosageResult, setDosageResult] = useState<number | null>(null);
  const [dosageCalculatedWeightKg, setDosageCalculatedWeightKg] = useState<number | null>(null);

  const [selectedMed, setSelectedMed] = useState("Warfarin (Coumadin) 5mg");
  const [medFrequency, setMedFrequency] = useState("Once Daily (Oral)");
  const [medSuccessMsg, setMedSuccessMsg] = useState<string | null>(null);
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [breakGlassReason, setBreakGlassReason] = useState("Emergency Code Blue - Patient Cardiac Arrest");
  const [remoteAllergyPending, setRemoteAllergyPending] = useState(true);
  const [showExportData, setShowExportData] = useState(false);

  // === 1. PEDIATRIC DOSAGE CALCULATION (health-01) ===
  const handleCalculateDosage = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();

    const weightLbs = Number(dosageForm.weightLbs);
    const dosePerKg = Number(dosageForm.dosePerKg);

    let weightKg: number;
    let finalMg: number;

    if (hasBug("health-01")) {
      // BUG: Instead of dividing by 2.20462 (lbs -> kg), it multiplies by 2.20462!
      // For a 55 lb child: 55 * 2.20462 = 121.25 kg (instead of 24.95 kg) -> 10x overdose!
      weightKg = Math.round(weightLbs * 2.20462 * 10) / 10;
      finalMg = Math.round(weightKg * dosePerKg);
      checkBug("health-01");

      addConsoleLog({
        type: "error",
        message: `[PediatricSafetyAlert] Unit conversion calculation inverted! Weight factor applied: lbs * 2.20462 = ${weightKg} kg (Expected: ${Math.round((weightLbs / 2.20462) * 10) / 10} kg). Prescribing overdose of ${finalMg} mg!`,
      });

      addNetworkLog({
        method: "POST",
        url: "/api/v1/clinical/calculator/pediatric-dose",
        status: 200,
        timeMs: 42,
        requestPayload: { drug: dosageForm.drug, weightLbs, unit: "lbs", dosePerKg },
        response: JSON.stringify({
          status: "computed",
          calculatedWeightKg: weightKg,
          recommendedDoseMg: finalMg,
          flaggedWarning: false,
        }),
      });
    } else {
      weightKg = Math.round((weightLbs / 2.20462) * 10) / 10;
      finalMg = Math.round(weightKg * dosePerKg);
    }

    setDosageCalculatedWeightKg(weightKg);
    setDosageResult(finalMg);
    onStateChange(s => ({ ...s, calculatedDosageMg: finalMg }));
  };

  // === 2. UNMASKED PHI IN DIAGNOSTIC API (health-02) ===
  const handleSyncDiagnosticBundle = () => {
    sound.playClick();
    setShowExportData(true);

    if (hasBug("health-02")) {
      checkBug("health-02");
      addConsoleLog({
        type: "error",
        message: `[HIPAA Security Violation] Sensitive PHI (Unmasked SSN & Psychiatric notes) transmitted over diagnostic bundle without tokenization.`,
      });

      addNetworkLog({
        method: "GET",
        url: "/api/v1/patient/vitals?patientId=PID-4092&includeHistory=true",
        status: 200,
        timeMs: 65,
        response: JSON.stringify({
          patientId: "PID-4092",
          legalName: "Eleanor Vance",
          dob: "2018-04-12",
          ssn: "921-48-3301", // UNMASKED SSN
          insurancePolicy: "Aetna-PPO-89021948",
          guardianSSN: "921-12-8874",
          psychiatricIntakeNotes: "Confidential intake: patient experiences acute panic in clinical settings. Family custody dispute under protective review.",
          recentVitals: { hr: vitalsInput.hr, bp: `${vitalsInput.systolic}/${vitalsInput.diastolic}`, spo2: vitalsInput.spo2 },
        }),
      });
    } else {
      addNetworkLog({
        method: "GET",
        url: "/api/v1/patient/vitals?patientId=PID-4092",
        status: 200,
        timeMs: 40,
        response: JSON.stringify({
          patientId: "PID-4092",
          legalName: "E*** V***",
          ssn: "***-**-3301",
          recentVitals: { hr: vitalsInput.hr, bp: `${vitalsInput.systolic}/${vitalsInput.diastolic}`, spo2: vitalsInput.spo2 },
        }),
      });
    }
  };

  // === 3. IMPOSSIBLE PHYSIOLOGICAL VITALS (health-03) ===
  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();

    const hr = Number(vitalsInput.hr);
    const sys = Number(vitalsInput.systolic);
    const dia = Number(vitalsInput.diastolic);
    const spo2 = Number(vitalsInput.spo2);

    const isImpossible = hr <= 0 || hr > 280 || sys <= 0 || sys > 350 || dia <= 0 || dia > 220 || spo2 > 100 || spo2 < 20;

    if (isImpossible && hasBug("health-03")) {
      checkBug("health-03");
      addConsoleLog({
        type: "warn",
        message: `[EHRValidationAnomaly] Impossible physiological vital signs accepted by clinical form: HR=${hr} bpm, BP=${sys}/${dia} mmHg, SpO2=${spo2}%. Form validation bypassed!`,
      });

      addNetworkLog({
        method: "POST",
        url: "/api/v1/triage/vitals/record",
        status: 201,
        timeMs: 50,
        requestPayload: { patientId: "PID-4092", hr, systolic: sys, diastolic: dia, spo2 },
        response: JSON.stringify({ success: true, recordedAt: new Date().toISOString(), alertTriggered: false }),
      });

      onStateChange(s => ({
        ...s,
        heartRateBpm: hr,
        bloodPressureSystolic: sys,
        bloodPressureDiastolic: dia,
        oxygenSaturation: spo2,
      }));
      return;
    }

    onStateChange(s => ({
      ...s,
      heartRateBpm: hr,
      bloodPressureSystolic: sys,
      bloodPressureDiastolic: dia,
      oxygenSaturation: spo2,
    }));

    addNetworkLog({
      method: "POST",
      url: "/api/v1/triage/vitals/record",
      status: 200,
      timeMs: 38,
      requestPayload: { patientId: "PID-4092", hr, systolic: sys, diastolic: dia, spo2 },
      response: JSON.stringify({ success: true, status: "Normal clinical range logged" }),
    });
  };

  // === 4. CONCURRENT CHART SAVE OVERWRITE (health-04) ===
  const handleSyncRemoteChart = () => {
    sound.playClick();
    if (hasBug("health-04")) {
      checkBug("health-04");
      // Silently drops allergy without merge conflict warning
      setRemoteAllergyPending(false);
      onStateChange(s => ({ ...s, allergyWarningDismissed: true }));

      addConsoleLog({
        type: "error",
        message: `[ConcurrencyConflict] State desynchronization: Remote update for 'PENICILLIN ANAPHYLAXIS' was dropped due to last-write-wins race condition without record lock.`,
      });

      addNetworkLog({
        method: "PUT",
        url: "/api/v1/patients/PID-4092/chart/sync",
        status: 200,
        timeMs: 44,
        requestPayload: { forceOverwrite: true, clientTimestamp: Date.now() },
        response: JSON.stringify({ status: "merged_unlocked", allergiesOverwritten: true }),
      });
    } else {
      setRemoteAllergyPending(false);
    }
  };

  // === 5. EMERGENCY BREAK-GLASS ACCESS UNLOGGED (health-05) ===
  const handleConfirmBreakGlass = () => {
    sound.playClick();
    setShowBreakGlassModal(false);

    if (hasBug("health-05")) {
      checkBug("health-05");
      // Does NOT write to env.ehrAuditLogs!
      onStateChange(s => ({ ...s, breakGlassActive: true }));

      addConsoleLog({
        type: "error",
        message: `[HIPAA Audit Failure] Emergency Break-Glass protocol accessed for PID-4092 by Dr. Current User, but AUDIT LOG PIPELINE RETURNED 0 RECORDS. Event omitted from compliance trail!`,
      });

      addNetworkLog({
        method: "POST",
        url: "/api/v1/security/break-glass/override",
        status: 200,
        timeMs: 35,
        requestPayload: { patientId: "PID-4092", reason: breakGlassReason, auditLogged: false },
        response: JSON.stringify({ authorized: true, warning: "Audit sync bypass detected" }),
      });
    } else {
      const newEntry = {
        id: `log-${Date.now()}`,
        action: "BREAK_GLASS_ACCESS",
        user: "Attending Physician (MD)",
        timestamp: new Date().toLocaleTimeString(),
        details: `Reason: ${breakGlassReason}`,
      };
      onStateChange(s => ({
        ...s,
        breakGlassActive: true,
        ehrAuditLogs: [...(s.ehrAuditLogs || []), newEntry],
      }));
    }
  };

  // === 6. DRUG CONTRAINDICATION ALERT SUPPRESSED (health-06) ===
  const handleOrderMedication = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();

    // Patient is currently prescribed Heparin IV (Anticoagulant)
    const isAnticoagulantConflict = selectedMed.includes("Warfarin") || selectedMed.includes("Aspirin");

    if (isAnticoagulantConflict && hasBug("health-06")) {
      checkBug("health-06");
      setMedSuccessMsg(`⚠️ Rx Order Placed: ${selectedMed} — Sent to Pharmacy (Warning Suppressed!)`);

      addConsoleLog({
        type: "error",
        message: `[ClinicalSafetyBlocker] Critical Drug-Drug Interaction Check bypassed! Prescribed ${selectedMed} alongside active Heparin IV without hard-stop contraindication modal!`,
      });

      addNetworkLog({
        method: "POST",
        url: "/api/v1/pharmacy/orders/submit",
        status: 200,
        timeMs: 58,
        requestPayload: {
          patientId: "PID-4092",
          drug: selectedMed,
          frequency: medFrequency,
          activeInteractionsIgnored: ["HEPARIN_WARFARIN_HEMORRHAGE_RISK"],
        },
        response: JSON.stringify({ orderId: "RX-88401", status: "DISPENSE_PENDING", alertSuppressed: true }),
      });
      return;
    }

    setMedSuccessMsg(`✓ Rx Order Placed: ${selectedMed} (${medFrequency})`);
  };

  return (
    <div className="space-y-4">
      {/* Patient Inpatient Banner */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 border border-purple-500/40 text-2xl shadow-md shadow-purple-500/20">
              🏥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Eleanor Vance</h3>
                <span className="rounded bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-mono text-purple-300">
                  MRN: #PC-90812
                </span>
                <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  Pediatric Inpatient (PICU 304B)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Age: <strong className="text-slate-200">8 yrs</strong> · Weight:{" "}
                <strong className="text-slate-200">55 lbs (25 kg)</strong> · Attending:{" "}
                <strong className="text-slate-200">Dr. Chen, MD</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setShowBreakGlassModal(true);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95",
                env.breakGlassActive
                  ? "border-rose-500/60 bg-rose-500/20 text-rose-300 shadow-rose-500/20"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 animate-pulse"
              )}
            >
              <span>🚨</span>
              <span>{env.breakGlassActive ? "Emergency Override Active" : "Emergency Break-Glass"}</span>
            </button>
          </div>
        </div>

        {/* Clinical Alert Ticker */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-purple-500/20 pt-2.5 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-rose-200 font-semibold">
            <span>⚠️ Active Inpatient Rx:</span>
            <span className="font-mono text-rose-300">Heparin IV (Continuous Infusion)</span>
          </div>

          {!env.allergyWarningDismissed ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-amber-200">
              <span className="font-bold">⚠️ Allergy Alert:</span>
              <span>Penicillin (Anaphylaxis)</span>
              {remoteAllergyPending && (
                <button
                  onClick={handleSyncRemoteChart}
                  className="ml-2 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30 transition-colors"
                  title="Click to resolve concurrent edit conflict"
                >
                  Sync Remote Chart Changes
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-slate-400 line-through">
              <span>Allergy: Penicillin (Conflict Overwritten)</span>
            </div>
          )}
        </div>
      </div>

      {/* EHR Portal Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
        {[
          { id: "vitals", label: "Triage Vitals Entry", icon: "💓" },
          { id: "dosage", label: "Pediatric Dosage Math", icon: "⚖️" },
          { id: "meds", label: "Medication Orders (Rx)", icon: "💊" },
          { id: "audit", label: "HIPAA Audit Trail", icon: "🛡️" },
          { id: "export", label: "API Diagnostic Bundle", icon: "📦" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              sound.playClick();
              setActiveTab(tab.id as any);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
              activeTab === tab.id
                ? "bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: TRIAGE VITALS (health-03) */}
      {activeTab === "vitals" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-sm text-white">Clinical Triage & Physiological Monitoring</h4>
              <p className="text-xs text-slate-400">
                Record nurse intake vitals. Input validation must strictly reject out-of-range bounds.
              </p>
            </div>
            <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-mono text-xs text-purple-300">
              Live Monitor Active
            </span>
          </div>

          <form onSubmit={handleSaveVitals} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Heart Rate (Normal: 70–120 bpm)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={vitalsInput.hr}
                  onChange={e => setVitalsInput({ ...vitalsInput, hr: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-mono text-white focus:border-purple-400 focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-400">bpm</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Blood Pressure (Systolic / Diastolic)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Sys"
                  value={vitalsInput.systolic}
                  onChange={e => setVitalsInput({ ...vitalsInput, systolic: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-mono text-white focus:border-purple-400 focus:outline-none"
                />
                <span className="text-slate-500">/</span>
                <input
                  type="number"
                  placeholder="Dia"
                  value={vitalsInput.diastolic}
                  onChange={e => setVitalsInput({ ...vitalsInput, diastolic: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-mono text-white focus:border-purple-400 focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-400">mmHg</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Oxygen Saturation SpO2 (Normal: 95–100%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={vitalsInput.spo2}
                  onChange={e => setVitalsInput({ ...vitalsInput, spo2: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-mono text-white focus:border-purple-400 focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-400">%</span>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all active:scale-95"
              >
                Save & Commit Triage Vitals
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PEDIATRIC DOSAGE CALCULATOR (health-01) */}
      {activeTab === "dosage" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-4">
          <div>
            <h4 className="font-bold text-sm text-white">Pediatric Weight-Based Dosage Calculator</h4>
            <p className="text-xs text-slate-400">
              Prescriptions in pediatrics require precise weight conversion ($lbs \div 2.20462 = kg$).
            </p>
          </div>

          <form onSubmit={handleCalculateDosage} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Medication Formula</label>
              <select
                value={dosageForm.drug}
                onChange={e => setDosageForm({ ...dosageForm, drug: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                <option>Amoxicillin Oral Suspension (20 mg/kg/dose)</option>
                <option>Gentamicin IV Pediatric (2.5 mg/kg/dose)</option>
                <option>Acetaminophen Liquid (15 mg/kg/dose)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Patient Weight (Pounds / lbs)</label>
              <input
                type="number"
                value={dosageForm.weightLbs}
                onChange={e => setDosageForm({ ...dosageForm, weightLbs: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Target Dose (mg/kg)</label>
              <input
                type="number"
                value={dosageForm.dosePerKg}
                onChange={e => setDosageForm({ ...dosageForm, dosePerKg: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white"
              />
            </div>

            <div className="sm:col-span-3 mt-2">
              <button
                type="submit"
                className="rounded-xl bg-purple-600 hover:bg-purple-500 px-6 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition-all active:scale-95"
              >
                ⚖️ Compute Pediatric Dosage
              </button>
            </div>
          </form>

          {dosageResult !== null && (
            <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 p-4 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
                <span className="text-purple-300 font-bold">Calculation Output:</span>
                <span className="text-slate-400">Formula: Target Dose × Converted Weight (kg)</span>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">Calculated Weight:</span>
                  <span className="text-base font-bold text-white">{dosageCalculatedWeightKg} kg</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Prescribed Dosage:</span>
                  <span className={cn("text-base font-bold", dosageResult > 1500 ? "text-rose-400" : "text-emerald-400")}>
                    {dosageResult} mg / dose
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Safety Verification:</span>
                  <span className={cn("text-xs font-bold", dosageResult > 1500 ? "text-rose-400" : "text-emerald-400")}>
                    {dosageResult > 1500 ? "⚠️ High Dosage Flagged" : "✓ Within Pediatric Limits"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEDICATION ORDERS (health-06) */}
      {activeTab === "meds" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-4">
          <div>
            <h4 className="font-bold text-sm text-white">Medication Ordering & Pharmacy Submissions</h4>
            <p className="text-xs text-slate-400">
              The EHR must cross-reference inpatient meds with active infusions (Current: <strong>Heparin IV</strong>)
              and halt fatal drug interactions.
            </p>
          </div>

          <form onSubmit={handleOrderMedication} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Prescribe Medication</label>
              <select
                value={selectedMed}
                onChange={e => setSelectedMed(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                <option>Warfarin (Coumadin) 5mg (Severe Heparin Interaction!)</option>
                <option>Aspirin 325mg Oral (Severe Hemorrhage Interaction!)</option>
                <option>Cefazolin 500mg IV (Cephalosporin)</option>
                <option>Acetaminophen 325mg (Mild Analgesic)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Administration Frequency</label>
              <select
                value={medFrequency}
                onChange={e => setMedFrequency(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                <option>Once Daily (Oral)</option>
                <option>Every 8 Hours (IV Piggyback)</option>
                <option>PRN (As Needed for Severe Pain)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-purple-600 hover:bg-purple-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all active:scale-95"
              >
                Submit Prescription Order
              </button>
            </div>
          </form>

          {medSuccessMsg && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs font-mono text-purple-200">
              {medSuccessMsg}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HIPAA AUDIT TRAIL (health-05) */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-white">Immutable HIPAA Audit Log (21 CFR Part 11)</h4>
              <p className="text-xs text-slate-400">
                Every emergency override and clinical view must be cryptographically hashed and logged.
              </p>
            </div>
            <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
              Audit Stream Active
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs max-h-60 overflow-y-auto">
            {(env.ehrAuditLogs || []).map((log, i) => (
              <div
                key={log.id || i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/80 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-purple-400">[{log.action}]</span>
                  <span className="text-white">{log.details}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span>{log.user}</span>
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: API DIAGNOSTIC BUNDLE (health-02) */}
      {activeTab === "export" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-4">
          <div>
            <h4 className="font-bold text-sm text-white">Diagnostic Record Sync & FHIR JSON Inspection</h4>
            <p className="text-xs text-slate-400">
              Synchronize clinical vitals bundle over REST API. Examine DevTools Network tab for PHI security.
            </p>
          </div>

          <button
            onClick={handleSyncDiagnosticBundle}
            className="rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition-all active:scale-95"
          >
            📡 Synchronize Remote Diagnostic Record
          </button>

          {showExportData && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] text-slate-300">
              <span className="text-purple-400 block mb-1.5">// GET /api/v1/patient/vitals?patientId=PID-4092 HTTP/2</span>
              <p className="text-slate-400">
                Payload returned 200 OK. Open DevTools (F12) to inspect the raw unredacted network headers and response payload.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Emergency Break-Glass Modal */}
      {showBreakGlassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-rose-500/60 bg-slate-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="text-3xl">🚨</span>
              <div>
                <h3 className="font-black text-base text-white">Break-Glass Emergency Protocol</h3>
                <p className="text-[11px] text-rose-300">Mandatory HIPAA Override Justification Required</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are accessing restricted pediatric psychiatric and legal records for <strong>PID-4092</strong>. By law,
              this emergency override event will be permanently recorded in the institutional compliance audit log.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Select Clinical Justification:</label>
              <select
                value={breakGlassReason}
                onChange={e => setBreakGlassReason(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                <option>Emergency Code Blue - Patient Cardiac Arrest</option>
                <option>Urgent Anaphylactic Resuscitation</option>
                <option>Unconscious Trauma Intake</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBreakGlassModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBreakGlass}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30"
              >
                Confirm Break-Glass Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
