import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Check, Coffee, Eye, EyeOff, Sparkles, X } from "lucide-react";
import { login, register, confirmRegistration, forgotPassword, confirmForgotPassword, getUser, loginWithGoogle, resendRegistrationCode } from "@/lib/auth";

type Step = "login" | "register" | "confirm" | "forgot" | "reset";

type PasswordRule = {
  label: string;
  met: boolean;
};

export default function LoginPage() {
  const router = useRouter();

  const getDestination = useCallback(() => {
    const returnTo = router.query.returnTo as string | undefined;
    return returnTo && returnTo.startsWith("/") ? returnTo : "/";
  }, [router.query.returnTo]);

  useEffect(() => {
    if (!router.isReady) return;
    getUser().then((user) => {
      if (user) router.replace(getDestination());
    });
  }, [getDestination, router, router.isReady]);

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const passwordRules: PasswordRule[] = [
    { label: "Τουλάχιστον 8 χαρακτήρες", met: password.length >= 8 },
    { label: "Ένα κεφαλαίο γράμμα", met: /[A-Z]/.test(password) },
    { label: "Ένα μικρό γράμμα", met: /[a-z]/.test(password) },
    { label: "Έναν αριθμό", met: /\d/.test(password) },
    { label: "Έναν ειδικό χαρακτήρα", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metRules = passwordRules.filter((rule) => rule.met).length;
  const passwordScore = Math.round((metRules / passwordRules.length) * 100);
  const isPasswordStrongEnough = metRules >= 4 && password.length >= 8;

  useEffect(() => {
    if (!resendCooldown) return;
    const timer = setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push(getDestination());
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordStrongEnough) {
      setError("Ο κωδικός δεν είναι αρκετά ισχυρός.");
      return;
    }
    setLoading(true);
    setError("");
    setResendMessage("");
    try {
      await register(email, password);
      setStep("confirm");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await forgotPassword(email);
      setStep("reset");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Αποτυχία αποστολής κωδικού"));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError("Οι κωδικοί δεν ταιριάζουν");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await confirmForgotPassword(email, code, newPassword);
      await login(email, newPassword);
      router.push(getDestination());
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Αποτυχία επαναφοράς κωδικού"));
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
      router.push(getDestination());
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Confirmation failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!email || resendCooldown > 0) return;
    setResendLoading(true);
    setError("");
    setResendMessage("");
    try {
      await resendRegistrationCode(email);
      setResendMessage("Στείλαμε νέο κωδικό επιβεβαίωσης.");
      setResendCooldown(30);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Αποτυχία αποστολής νέου κωδικού"));
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-violet-900/20 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-amber-900/15 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-4 glow-pulse">
            <Coffee className="w-8 h-8 text-black" />
          </Link>
          <h1 className="text-2xl font-bold text-amber-200 tracking-wide">Fortune Teller</h1>
          <p className="text-violet-400 text-sm mt-1">Ανάγνωση Ελληνικού Καφέ</p>
        </div>

        <div className="rounded-2xl border border-violet-800/40 bg-[#2e2a3a] p-8 shadow-2xl">
          {step === "login" && (
            <>
              <h2 className="text-lg font-semibold text-violet-100 mb-6">Καλώς ήρθες</h2>
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
                      className="w-full bg-[#24242E] border border-violet-800/50 rounded-lg px-3 py-2.5 text-sm text-violet-100 placeholder-violet-600 focus:outline-none focus:border-amber-500/60 transition-colors pr-10"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-300">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-rose-400 text-xs">{error}</p>}
                <SubmitButton loading={loading} label="Σύνδεση" loadingLabel="Σύνδεση…" />
              </form>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-violet-800/40" />
                <span className="text-xs text-violet-600">ή</span>
                <div className="flex-1 h-px bg-violet-800/40" />
              </div>
              <GoogleButton />
              <p className="text-center text-xs text-violet-500 mt-5">
                <button onClick={() => { setStep("forgot"); setError(""); }} className="text-violet-400 hover:text-amber-300 font-medium">
                  Ξέχασες τον κωδικό;
                </button>
              </p>
              <p className="text-center text-xs text-violet-500 mt-3">
                Δεν έχεις λογαριασμό;{" "}
                <button onClick={() => { setStep("register"); setError(""); }} className="text-amber-400 hover:text-amber-300 font-medium">
                  Δημιούργησε έναν
                </button>
              </p>
            </>
          )}

          {step === "register" && (
            <>
              <h2 className="text-lg font-semibold text-violet-100 mb-6">Δημιουργία λογαριασμού</h2>
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
                      className="w-full bg-[#24242E] border border-violet-800/50 rounded-lg px-3 py-2.5 text-sm text-violet-100 placeholder-violet-600 focus:outline-none focus:border-amber-500/60 transition-colors pr-10"
                      placeholder="Min 8 characters"
                    />
                    <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-300">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="w-full h-1.5 rounded-full bg-violet-900/50 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            passwordScore < 50
                              ? "bg-rose-500"
                              : passwordScore < 80
                                ? "bg-amber-500"
                                : "bg-amber-400"
                          }`}
                          style={{ width: `${passwordScore}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {passwordRules.map((rule) => (
                          <div key={rule.label} className="flex items-center gap-1.5 text-[11px]">
                            {rule.met ? (
                              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                            )}
                            <span className={rule.met ? "text-amber-300" : "text-violet-500"}>{rule.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {error && <p className="text-rose-400 text-xs">{error}</p>}
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border border-violet-700 bg-[#24242E] accent-amber-500 shrink-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-violet-500 leading-relaxed group-hover:text-violet-400 transition-colors">
                    Αποδέχομαι τους{" "}
                    <a href="/terms" target="_blank" onClick={(e) => e.stopPropagation()} className="text-violet-400 hover:text-amber-400 underline underline-offset-2 transition-colors">
                      Όρους Χρήσης
                    </a>{" "}
                    και την{" "}
                    <a href="/privacy" target="_blank" onClick={(e) => e.stopPropagation()} className="text-violet-400 hover:text-amber-400 underline underline-offset-2 transition-colors">
                      Πολιτική Απορρήτου
                    </a>
                  </span>
                </label>
                <SubmitButton loading={loading} label="Δημιουργία λογαριασμού" loadingLabel="Δημιουργία…" disabled={!agreedToTerms || !isPasswordStrongEnough} />
              </form>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-violet-800/40" />
                <span className="text-xs text-violet-600">ή</span>
                <div className="flex-1 h-px bg-violet-800/40" />
              </div>
              <GoogleButton />
              <p className="text-center text-xs text-violet-500 mt-5">
                Έχεις ήδη λογαριασμό;{" "}
                <button onClick={() => { setStep("login"); setError(""); }} className="text-amber-400 hover:text-amber-300 font-medium">
                  Σύνδεση
                </button>
              </p>
            </>
          )}

          {step === "forgot" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-lg font-semibold text-violet-100">Επαναφορά κωδικού</h2>
              </div>
              <p className="text-sm text-violet-400 mb-6">Εισήγαγε το email σου και θα σου στείλουμε κωδικό επαναφοράς.</p>
              <form onSubmit={handleForgot} className="flex flex-col gap-4">
                <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                {error && <p className="text-rose-400 text-xs">{error}</p>}
                <SubmitButton loading={loading} label="Αποστολή κωδικού" loadingLabel="Αποστολή…" />
              </form>
              <p className="text-center text-xs text-violet-500 mt-5">
                <button onClick={() => { setStep("login"); setError(""); }} className="text-amber-400 hover:text-amber-300 font-medium">
                  ← Επιστροφή στη σύνδεση
                </button>
              </p>
            </>
          )}

          {step === "reset" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-lg font-semibold text-violet-100">Νέος κωδικός</h2>
              </div>
              <p className="text-sm text-violet-400 mb-6">Στείλαμε κωδικό στο <span className="text-violet-200">{email}</span>.</p>
              <form onSubmit={handleReset} className="flex flex-col gap-4">
                <Input label="Κωδικός επαλήθευσης" type="text" value={code} onChange={setCode} placeholder="123456" autoComplete="one-time-code" />
                <div>
                  <label className="block text-xs text-violet-400 mb-1.5 font-medium">Νέος κωδικός πρόσβασης</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full bg-[#24242E] border border-violet-800/50 rounded-lg px-3 py-2.5 text-sm text-violet-100 placeholder-violet-600 focus:outline-none focus:border-amber-500/60 transition-colors pr-10"
                      placeholder="Min 8 characters"
                    />
                    <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-300">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-violet-400 mb-1.5 font-medium">Επιβεβαίωση νέου κωδικού</label>
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-[#24242E] border border-violet-800/50 rounded-lg px-3 py-2.5 text-sm text-violet-100 placeholder-violet-600 focus:outline-none focus:border-amber-500/60 transition-colors"
                    placeholder="Επανάλαβε τον κωδικό"
                  />
                </div>
                {error && <p className="text-rose-400 text-xs">{error}</p>}
                <SubmitButton loading={loading} label="Επαναφορά & Σύνδεση" loadingLabel="Επαναφορά…" />
              </form>
            </>
          )}

          {step === "confirm" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-lg font-semibold text-violet-100">Έλεγξε το email σου</h2>
              </div>
              <p className="text-sm text-violet-400 mb-6">Στείλαμε κωδικό επιβεβαίωσης στο <span className="text-violet-200">{email}</span></p>
              <form onSubmit={handleConfirm} className="flex flex-col gap-4">
                <Input label="Verification code" type="text" value={code} onChange={setCode} placeholder="123456" autoComplete="one-time-code" />
                {error && <p className="text-rose-400 text-xs">{error}</p>}
                {resendMessage && <p className="text-amber-300 text-xs">{resendMessage}</p>}
                <SubmitButton loading={loading} label="Επιβεβαίωση & Σύνδεση" loadingLabel="Επιβεβαίωση…" />
              </form>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading || resendCooldown > 0}
                className="mt-4 text-xs text-violet-400 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resendLoading
                  ? "Αποστολή νέου κωδικού..."
                  : resendCooldown > 0
                    ? `Αποστολή ξανά σε ${resendCooldown}s`
                    : "Δεν έλαβες κωδικό; Στείλε ξανά"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

function Input({
  label, type, value, onChange, placeholder, autoComplete,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string;
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
        autoComplete={autoComplete}
        className="w-full bg-[#24242E] border border-violet-800/50 rounded-lg px-3 py-2.5 text-sm text-violet-100 placeholder-violet-600 focus:outline-none focus:border-amber-500/60 transition-colors"
      />
    </div>
  );
}

function GoogleButton() {
  return (
    <button
      type="button"
      onClick={() => loginWithGoogle()}
      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-lg py-2.5 text-sm transition-all shadow-sm"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Συνέχεια με Google
    </button>
  );
}

function SubmitButton({ loading, label, loadingLabel, disabled }: { loading: boolean; label: string; loadingLabel: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-lg py-2.5 text-sm transition-all shadow-lg shadow-amber-500/20 mt-1"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
