import { useState } from "react";
import type { TestEnvState, ConsoleEntry, NetworkEntry } from "../../types";
import { cn } from "../../utils/cn";
import { sound } from "../../utils/audio";

interface AuthAppProps {
  env: TestEnvState;
  hasBug: (id: string) => boolean;
  checkBug: (id: string) => void;
  onStateChange: (fn: (s: TestEnvState) => TestEnvState) => void;
  addConsoleLog: (log: Omit<ConsoleEntry, "id" | "timestamp">) => void;
  addNetworkLog: (entry: Omit<NetworkEntry, "id" | "timestamp">) => void;
}

export default function AuthApp({
  env,
  hasBug,
  checkBug,
  onStateChange,
  addConsoleLog,
  addNetworkLog,
}: AuthAppProps) {
  const [activeTab, setActiveTab] = useState<"login" | "otp" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // === LOGIN ===
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    sound.playClick();

    const attempts = env.loginAttempts + 1;
    const emptyUser = env.username.trim() === "";
    const emptyPass = env.password === "";
    const spacePass = env.password.trim() === "" && env.password.length > 0;

    setTimeout(() => {
      setLoading(false);

      if (hasBug("login-04") && attempts >= 10) {
        checkBug("login-04");
        addConsoleLog({
          type: "warn",
          message: `[RateLimitSecurity] Security Warning: 10 consecutive failed attempts without IP throttling or captcha lockout.`,
        });
      }

      if (emptyUser && hasBug("login-01")) {
        checkBug("login-01");
        addConsoleLog({
          type: "error",
          message: `[AuthBypass] Empty username permitted by client validation. Access granted!`,
        });
        addNetworkLog({
          method: "POST",
          url: "/api/v1/auth/login",
          status: 200,
          timeMs: 48,
          requestPayload: { username: "", password: env.password ? "******" : "" },
          response: JSON.stringify({ token: "jwt_bypass_empty_user", user: "guest" }),
        });
        onStateChange(s => ({ ...s, loggedIn: true, loginAttempts: attempts }));
        setFormFeedback({ type: "success", msg: "Login bypassed with empty username!" });
        return;
      }

      if (emptyPass && hasBug("login-02")) {
        checkBug("login-02");
        addConsoleLog({
          type: "error",
          message: `[SecurityVulnerability] Authentication succeeded with completely blank password for user: '${env.username}'.`,
        });
        addNetworkLog({
          method: "POST",
          url: "/api/v1/auth/login",
          status: 200,
          timeMs: 52,
          requestPayload: { username: env.username, password: "" },
          response: JSON.stringify({ token: "jwt_bypass_empty_pass", user: env.username }),
        });
        onStateChange(s => ({ ...s, loggedIn: true, loginAttempts: attempts }));
        setFormFeedback({ type: "success", msg: "Login succeeded without a password!" });
        return;
      }

      if (spacePass && hasBug("login-03")) {
        checkBug("login-03");
        addConsoleLog({
          type: "warn",
          message: `[ValidationAnomaly] Password containing only whitespace characters accepted by validator.`,
        });
        addNetworkLog({
          method: "POST",
          url: "/api/v1/auth/login",
          status: 200,
          timeMs: 44,
          requestPayload: { username: env.username, password: "   " },
          response: JSON.stringify({ token: "jwt_space_accepted", user: env.username }),
        });
        onStateChange(s => ({ ...s, loggedIn: true, loginAttempts: attempts }));
        setFormFeedback({ type: "success", msg: "Login accepted whitespace-only password!" });
        return;
      }

      if (emptyUser || emptyPass || spacePass) {
        addNetworkLog({
          method: "POST",
          url: "/api/v1/auth/login",
          status: 400,
          timeMs: 38,
          requestPayload: { username: env.username, password: env.password ? "******" : "" },
          response: JSON.stringify({ error: "Invalid credentials or missing required fields." }),
        });
        onStateChange(s => ({ ...s, loggedIn: false, loginAttempts: attempts }));
        setFormFeedback({ type: "error", msg: "Authentication failed. Invalid username or password." });
      } else {
        // Valid login
        addNetworkLog({
          method: "POST",
          url: "/api/v1/auth/login",
          status: 200,
          timeMs: 65,
          requestPayload: { username: env.username, password: "******" },
          response: JSON.stringify({ token: "jwt_secure_auth_token_941", user: env.username }),
        });
        addConsoleLog({
          type: "info",
          message: `[Auth] User '${env.username}' authenticated successfully. Session initialized.`,
        });
        onStateChange(s => ({ ...s, loggedIn: true, loginAttempts: attempts }));
        setFormFeedback({ type: "success", msg: `Welcome back, ${env.username}!` });
      }
    }, 250);
  };

  // === OTP RESET ===
  const handleResetRequest = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const invalidEmail = !!env.resetEmail && (!env.resetEmail.includes("@") || !env.resetEmail.includes("."));

    if (invalidEmail && hasBug("login-06")) {
      checkBug("login-06");
      addConsoleLog({
        type: "error",
        message: `[EmailValidatorBug] Malformed email string '${env.resetEmail}' accepted without RFC-5322 validation.`,
      });
      addNetworkLog({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        status: 200,
        timeMs: 45,
        requestPayload: { email: env.resetEmail },
        response: JSON.stringify({ success: true, message: "OTP sent to malformed address." }),
      });
      setFormFeedback({ type: "success", msg: `OTP sent to: ${env.resetEmail} (No email format validation!)` });
    } else if (invalidEmail) {
      addNetworkLog({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        status: 422,
        timeMs: 30,
        requestPayload: { email: env.resetEmail },
        response: JSON.stringify({ error: "Invalid email format." }),
      });
      setFormFeedback({ type: "error", msg: "Please enter a valid email address." });
    } else {
      addNetworkLog({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        status: 200,
        timeMs: 50,
        requestPayload: { email: env.resetEmail },
        response: JSON.stringify({ success: true, message: "OTP code 948210 sent." }),
      });
      setFormFeedback({ type: "info", msg: "Verification code '948210' sent to your email." });
    }
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const reuseAttempt = env.otpUsed && env.otp !== "";

    if (reuseAttempt && hasBug("login-05")) {
      checkBug("login-05");
      addConsoleLog({
        type: "error",
        message: `[ReplayAttack] OTP code '${env.otp}' reused after previous consumption! Token was not invalidated.`,
      });
      addNetworkLog({
        method: "POST",
        url: "/api/v1/auth/verify-otp",
        status: 200,
        timeMs: 40,
        requestPayload: { code: env.otp },
        response: JSON.stringify({ success: true, tokenReset: "permitted_duplicate_use" }),
      });
      setFormFeedback({ type: "success", msg: "Security Breach: OTP accepted a second time!" });
    } else if (reuseAttempt) {
      addNetworkLog({
        method: "POST",
        url: "/api/v1/auth/verify-otp",
        status: 401,
        timeMs: 35,
        requestPayload: { code: env.otp },
        response: JSON.stringify({ error: "OTP has already been used and expired." }),
      });
      setFormFeedback({ type: "error", msg: "This OTP code has already expired." });
    } else {
      onStateChange(s => ({ ...s, otpUsed: true }));
      addNetworkLog({
        method: "POST",
        url: "/api/v1/auth/verify-otp",
        status: 200,
        timeMs: 45,
        requestPayload: { code: env.otp },
        response: JSON.stringify({ success: true, verified: true }),
      });
      setFormFeedback({ type: "success", msg: "OTP verified! Password has been reset." });
    }
  };

  return (
    <div className="mx-auto max-w-md animate-fade-in py-4">
      {/* Client Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 p-2 shadow-lg shadow-sky-500/20 mb-3">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white font-sans">SecureAuth Portal</h2>
        <p className="text-xs text-slate-400 mt-1">Enterprise Single Sign-On & Identity Provider</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-800 mb-6">
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab("login");
            setFormFeedback(null);
          }}
          className={cn(
            "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
            activeTab === "login" ? "bg-sky-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
          )}
        >
          Sign In
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab("otp");
            setFormFeedback(null);
          }}
          className={cn(
            "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
            activeTab === "otp" ? "bg-sky-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
          )}
        >
          Password Reset & OTP
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab("register");
            setFormFeedback(null);
          }}
          className={cn(
            "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
            activeTab === "register" ? "bg-sky-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
          )}
        >
          Register
        </button>
      </div>

      {/* Feedback Alert */}
      {formFeedback && (
        <div
          className={cn(
            "mb-4 rounded-xl p-3 text-xs flex items-center gap-2 border animate-fade-in-up",
            formFeedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : formFeedback.type === "error"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border-sky-500/30 bg-sky-500/10 text-sky-300"
          )}
        >
          <span>{formFeedback.type === "success" ? "✓" : formFeedback.type === "error" ? "⚠" : "ℹ"}</span>
          <span>{formFeedback.msg}</span>
        </div>
      )}

      {/* SIGN IN TAB */}
      {activeTab === "login" && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
          {env.loggedIn ? (
            <div className="text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-2xl text-emerald-400 mb-3">
                ✓
              </div>
              <h3 className="text-lg font-bold text-white">Authenticated Session Active</h3>
              <p className="text-xs text-slate-400 mt-1">Logged in as: <strong className="text-emerald-300 font-mono">{env.username || "Anonymous User"}</strong></p>

              <button
                onClick={() => {
                  sound.playClick();
                  onStateChange(s => ({ ...s, loggedIn: false }));
                  setFormFeedback({ type: "info", msg: "You have signed out." });
                  addConsoleLog({ type: "info", message: "User signed out. Session token cleared." });
                }}
                className="mt-5 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={env.username}
                  onChange={e => onStateChange(s => ({ ...s, username: e.target.value }))}
                  placeholder="admin@secureauth.io"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setActiveTab("otp")}
                    className="text-xs text-sky-400 hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={env.password}
                    onChange={e => onStateChange(s => ({ ...s, password: e.target.value }))}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Failed attempts: <strong className="font-mono text-amber-300">{env.loginAttempts}</strong>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Sign In to Console"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* PASSWORD RESET & OTP TAB */}
      {activeTab === "otp" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
            <h4 className="text-sm font-bold text-white mb-2">1. Request One-Time Password (OTP)</h4>
            <form onSubmit={handleResetRequest} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Account Recovery Email</label>
                <input
                  type="text"
                  value={env.resetEmail}
                  onChange={e => onStateChange(s => ({ ...s, resetEmail: e.target.value }))}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-sky-300 border border-slate-700 transition-colors"
              >
                Send Recovery OTP
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
            <h4 className="text-sm font-bold text-white mb-2">2. Enter Received OTP Code</h4>
            <p className="text-xs text-slate-400 mb-3">Verification code is single-use and valid for 5 minutes.</p>
            <form onSubmit={handleOtpVerify} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={env.otp}
                  onChange={e => onStateChange(s => ({ ...s, otp: e.target.value }))}
                  placeholder="e.g. 948210"
                  maxLength={6}
                  className="w-full text-center tracking-widest font-mono text-lg rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-emerald-300 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition-all"
              >
                Verify & Reset Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER TAB */}
      {activeTab === "register" && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
          <h4 className="text-sm font-bold text-white mb-3">Create New Tester Account</h4>
          <p className="text-xs text-slate-400 mb-4">Registration is currently managed via the QA authorization policy.</p>
          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
            <p><strong>System:</strong> SecureAuth Identity Mesh v4.8</p>
            <p><strong>Password Policy:</strong> Minimum 8 characters, 1 special char.</p>
            <p><strong>Lockout Policy:</strong> Maximum 10 failed consecutive attempts.</p>
          </div>
        </div>
      )}
    </div>
  );
}
