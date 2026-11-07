import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { login, register, confirmRegistration, forgotPassword, confirmForgotPassword, getUser, loginWithGoogle, resendRegistrationCode } from "@/lib/auth";
import { Brand } from "@/components/navbar";
import { Seo } from "@/components/seo";

const LABEL_CLASS = "block text-sm font-medium text-violet-100 mb-1.5";
const INPUT_CLASS =
  "w-full rounded-md border border-violet-700 bg-bg px-3 py-2 text-sm text-violet-50 placeholder:text-violet-400 focus:outline-none focus:border-amber-500 transition-colors";

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <Seo title="Σύνδεση ή Εγγραφή" noindex />

      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Brand />
        </div>

        <div className="rounded-lg border border-violet-800 bg-surface p-6">
          {step === "login" && (
            <>
              <h1 className="text-xl font-semibold text-violet-50 mb-6">Καλώς ήρθες</h1>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <div>
                  <label className={LABEL_CLASS}>Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`${INPUT_CLASS} pr-10`}
                      placeholder="••••••••"
                    />
                    <PasswordToggle shown={showPass} onToggle={() => setShowPass((s) => !s)} />
                  </div>
                </div>
                {error && <FormError message={error} />}
                <SubmitButton loading={loading} label="Σύνδεση" loadingLabel="Σύνδεση…" />
              </form>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-violet-800" />
                <span className="text-xs text-violet-300">ή</span>
                <div className="flex-1 h-px bg-violet-800" />
              </div>
              <GoogleButton />
              <div className="mt-6 flex flex-col items-center gap-2 text-sm text-violet-300">
                <button onClick={() => { setStep("forgot"); setError(""); }} className="hover:text-violet-50 transition-colors">
                  Ξέχασες τον κωδικό;
                </button>
                <p>
                  Δεν έχεις λογαριασμό;{" "}
                  <button onClick={() => { setStep("register"); setError(""); }} className="font-medium text-amber-400 hover:text-amber-300 transition-colors">
                    Δημιούργησε έναν
                  </button>
                </p>
              </div>
            </>
          )}

          {step === "register" && (
            <>
              <h1 className="text-xl font-semibold text-violet-50 mb-6">Δημιουργία λογαριασμού</h1>
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <div>
                  <label className={LABEL_CLASS}>Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className={`${INPUT_CLASS} pr-10`}
                      placeholder="Min 8 characters"
                    />
                    <PasswordToggle shown={showPass} onToggle={() => setShowPass((s) => !s)} />
                  </div>
                  {password.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="w-full h-1 rounded bg-violet-800 overflow-hidden">
                        <div
                          className={`h-full transition-[width] ${
                            passwordScore < 50
                              ? "bg-rose-500"
                              : passwordScore < 80
                                ? "bg-violet-300"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${passwordScore}%` }}
                        />
                      </div>
                      <ul className="space-y-1">
                        {passwordRules.map((rule) => (
                          <li key={rule.label} className="flex items-center gap-1.5 text-xs">
                            {rule.met ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-violet-300 shrink-0" />
                            )}
                            <span className={rule.met ? "text-violet-100" : "text-violet-300"}>{rule.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {error && <FormError message={error} />}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border border-violet-700 bg-bg accent-amber-500 shrink-0 cursor-pointer"
                  />
                  <span className="text-sm text-violet-300 leading-relaxed">
                    Αποδέχομαι τους{" "}
                    <a href="/terms" target="_blank" onClick={(e) => e.stopPropagation()} className="text-amber-400 hover:text-amber-300 transition-colors">
                      Όρους Χρήσης
                    </a>{" "}
                    και την{" "}
                    <a href="/privacy" target="_blank" onClick={(e) => e.stopPropagation()} className="text-amber-400 hover:text-amber-300 transition-colors">
                      Πολιτική Απορρήτου
                    </a>
                  </span>
                </label>
                <SubmitButton loading={loading} label="Δημιουργία λογαριασμού" loadingLabel="Δημιουργία…" disabled={!agreedToTerms || !isPasswordStrongEnough} />
              </form>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-violet-800" />
                <span className="text-xs text-violet-300">ή</span>
                <div className="flex-1 h-px bg-violet-800" />
              </div>
              <GoogleButton />
              <p className="mt-6 text-center text-sm text-violet-300">
                Έχεις ήδη λογαριασμό;{" "}
                <button onClick={() => { setStep("login"); setError(""); }} className="font-medium text-amber-400 hover:text-amber-300 transition-colors">
                  Σύνδεση
                </button>
              </p>
            </>
          )}

          {step === "forgot" && (
            <>
              <h1 className="text-xl font-semibold text-violet-50">Επαναφορά κωδικού</h1>
              <p className="mt-1 mb-6 text-sm text-violet-300">Εισήγαγε το email σου και θα σου στείλουμε κωδικό επαναφοράς.</p>
              <form onSubmit={handleForgot} className="flex flex-col gap-4">
                <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                {error && <FormError message={error} />}
                <SubmitButton loading={loading} label="Αποστολή κωδικού" loadingLabel="Αποστολή…" />
              </form>
              <p className="mt-6 text-center text-sm">
                <button onClick={() => { setStep("login"); setError(""); }} className="text-violet-300 hover:text-violet-50 transition-colors">
                  ← Επιστροφή στη σύνδεση
                </button>
              </p>
            </>
          )}

          {step === "reset" && (
            <>
              <h1 className="text-xl font-semibold text-violet-50">Νέος κωδικός</h1>
              <p className="mt-1 mb-6 text-sm text-violet-300">Στείλαμε κωδικό στο <span className="text-violet-100">{email}</span>.</p>
              <form onSubmit={handleReset} className="flex flex-col gap-4">
                <Input label="Κωδικός επαλήθευσης" type="text" value={code} onChange={setCode} placeholder="123456" autoComplete="one-time-code" />
                <div>
                  <label className={LABEL_CLASS}>Νέος κωδικός πρόσβασης</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className={`${INPUT_CLASS} pr-10`}
                      placeholder="Min 8 characters"
                    />
                    <PasswordToggle shown={showPass} onToggle={() => setShowPass((s) => !s)} />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Επιβεβαίωση νέου κωδικού</label>
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className={INPUT_CLASS}
                    placeholder="Επανάλαβε τον κωδικό"
                  />
                </div>
                {error && <FormError message={error} />}
                <SubmitButton loading={loading} label="Επαναφορά & Σύνδεση" loadingLabel="Επαναφορά…" />
              </form>
            </>
          )}

          {step === "confirm" && (
            <>
              <h1 className="text-xl font-semibold text-violet-50">Έλεγξε το email σου</h1>
              <p className="mt-1 mb-6 text-sm text-violet-300">Στείλαμε κωδικό επιβεβαίωσης στο <span className="text-violet-100">{email}</span></p>
              <form onSubmit={handleConfirm} className="flex flex-col gap-4">
                <Input label="Verification code" type="text" value={code} onChange={setCode} placeholder="123456" autoComplete="one-time-code" />
                {error && <FormError message={error} />}
                {resendMessage && <p className="text-sm text-emerald-400">{resendMessage}</p>}
                <SubmitButton loading={loading} label="Επιβεβαίωση & Σύνδεση" loadingLabel="Επιβεβαίωση…" />
              </form>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading || resendCooldown > 0}
                className="mt-4 text-sm text-violet-300 hover:text-violet-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      <label className={LABEL_CLASS}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={INPUT_CLASS}
      />
    </div>
  );
}

function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 hover:text-violet-50 transition-colors"
    >
      {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
      {message}
    </p>
  );
}

function GoogleButton() {
  return (
    <button
      type="button"
      onClick={() => loginWithGoogle()}
      className="w-full flex items-center justify-center gap-2 rounded-md border border-violet-700 text-violet-100 hover:border-violet-600 hover:bg-violet-900/50 text-sm px-4 py-2 transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
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
      className="mt-1 w-full flex items-center justify-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? loadingLabel : label}
    </button>
  );
}
