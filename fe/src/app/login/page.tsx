"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Eye, EyeOff, Sparkles } from "lucide-react";
import { login, register, confirmRegistration } from "@/lib/auth";

type Step = "login" | "register" | "confirm";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/upload");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(email, password);
      setStep("confirm");
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await confirmRegistration(email, code);
      await login(email, password);
      router.push("/upload");
    } catch (err: any) {
      setError(err.message ?? "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-violet-900/20 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-amber-900/15 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-4 glow-pulse">
            <Coffee className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-amber-200 tracking-wide">Kafetzou</h1>
          <p className="text-violet-400 text-sm mt-1">AI Greek Coffee Cup Readings</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-violet-800/40 bg-[#12102a] p-8 shadow-2xl">
          {step === "login" && (
            <>
              <h2 className="text-lg font-semibold text-violet-100 mb-6">Welcome back</h2>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <div>
                  <label className="block text-xs text-violet-400 mb-1.5 font-medium">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-[#0c0a1a] border border-violet-800/50 rounded-lg px-3 py-2.5 text-sm text-violet-100 placeholder-violet-600 focus:outline-none focus:border-amber-500/60 transition-colors pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-300"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-rose-400 text-xs">{error}</p>}
                <SubmitButton loading={loading} label="Sign in" loadingLabel="Signing in…" />
              </form>
              <p className="text-center text-xs text-violet-500 mt-5">
                No account?{" "}
                <button onClick={() => { setStep("register"); setError(""); }} className="text-amber-400 hover:text-amber-300 font-medium">
                  Create one
                </button>
              </p>
            </>
          )}

          {step === "register" && (
            <>
              <h2 className="text-lg font-semibold text-violet-100 mb-6">Create account</h2>
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <div>
                  <label className="block text-xs text-violet-400 mb-1.5 font-medium">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full bg-[#0c0a1a] border border-violet-800/50 rounded-lg px-3 py-2.5 text-sm text-violet-100 placeholder-violet-600 focus:outline-none focus:border-amber-500/60 transition-colors pr-10"
                      placeholder="Min 8 characters"
                    />
                    <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-300">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-rose-400 text-xs">{error}</p>}
                <SubmitButton loading={loading} label="Create account" loadingLabel="Creating…" />
              </form>
              <p className="text-center text-xs text-violet-500 mt-5">
                Already have an account?{" "}
                <button onClick={() => { setStep("login"); setError(""); }} className="text-amber-400 hover:text-amber-300 font-medium">
                  Sign in
                </button>
              </p>
            </>
          )}

          {step === "confirm" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-lg font-semibold text-violet-100">Check your email</h2>
              </div>
              <p className="text-sm text-violet-400 mb-6">We sent a verification code to <span className="text-violet-200">{email}</span></p>
              <form onSubmit={handleConfirm} className="flex flex-col gap-4">
                <Input label="Verification code" type="text" value={code} onChange={setCode} placeholder="123456" />
                {error && <p className="text-rose-400 text-xs">{error}</p>}
                <SubmitButton loading={loading} label="Verify & sign in" loadingLabel="Verifying…" />
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({
  label, type, value, onChange, placeholder,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-violet-400 mb-1.5 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        placeholder={placeholder}
        className="w-full bg-[#0c0a1a] border border-violet-800/50 rounded-lg px-3 py-2.5 text-sm text-violet-100 placeholder-violet-600 focus:outline-none focus:border-amber-500/60 transition-colors"
      />
    </div>
  );
}

function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-semibold rounded-lg py-2.5 text-sm transition-all shadow-lg shadow-amber-500/20 mt-1"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
