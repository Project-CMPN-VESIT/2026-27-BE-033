"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

type AuthMode = "login" | "signup";

const benefits = [
  "Explore verified candidate affidavits",
  "Compare candidates with confidence",
  "Get clear, AI-powered election insights",
];

export function AuthPage({ mode }: { mode: AuthMode }) {
  const isSignup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showRecoveryHelp, setShowRecoveryHelp] = useState(false);
  const submitting = useRef(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    const form = new FormData(event.currentTarget);
    if (isSignup && form.get("password") !== form.get("confirm-password")) {
      setError("Your passwords do not match.");
      (event.currentTarget.elements.namedItem("confirm-password") as HTMLInputElement)?.focus();
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
    const response = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
        name: form.get("name"),
        age: form.get("age"),
        confirmPassword: form.get("confirm-password"),
      }),
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json().catch(() => ({})) as { error?: string; user?: { id: number } };
    if (!response.ok || !result.user?.id) {
      throw new Error(result.error || "Unable to complete authentication. Please try again.");
    }
    setSubmitted(true);
    router.replace("/");
    router.refresh();
    } catch (reason) {
      setError(reason instanceof Error && reason.name !== "TimeoutError" && reason.name !== "TypeError" ? reason.message : "Unable to reach sign-in. Check your connection and try again.");
      setPending(false);
      submitting.current = false;
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_rgba(30,58,138,0.12)] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#172d72] via-[#1e3a8a] to-[#2563b8] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border-[34px] border-white/10" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-[42px] border-[#f59e0b]/20" />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f59e0b] shadow-lg shadow-blue-950/20">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-xl font-bold tracking-tight">Chunav Bodh</span>
                <span className="block text-xs text-blue-200">Election Transparency Platform</span>
              </span>
            </Link>
          </div>

          <div className="relative max-w-md">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles className="h-6 w-6 text-[#fbbf24]" />
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Make informed choices. Strengthen democracy.
            </h1>
            <p className="mt-5 text-base leading-7 text-blue-100">
              One trusted place to understand candidates, verify their records, and participate with clarity.
            </p>
            <ul className="mt-8 space-y-4">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm text-blue-50">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f59e0b]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-blue-200">Built for informed citizens across India.</p>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f59e0b] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span className="font-bold text-[#1e3a8a]">Chunav Bodh</span>
              </Link>
            </div>

            <div className="mb-8">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#d97706]">
                {isSignup ? "Join the movement" : "Welcome back"}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                {isSignup ? "Create your account" : "Sign in to Chunav Bodh"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isSignup
                  ? "Start exploring transparent, fact-based electoral intelligence."
                  : "Continue your journey toward more informed decisions."}
              </p>
            </div>

            <form onSubmit={handleSubmit} aria-busy={pending} className="space-y-5">
              {isSignup && (
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
                    Full name
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      maxLength={120}
                      autoComplete="name"
                      placeholder="Enter your full name"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563b8] focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-700">
                  Username
                </label>
                <div className="relative">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    minLength={isSignup ? 3 : 1}
                    maxLength={64}
                    pattern={isSignup ? "[A-Za-z0-9_.\\-]{3,64}" : undefined}
                    title={isSignup ? "3-64 letters, numbers, dots, underscores or hyphens" : undefined}
                    autoComplete="username"
                    placeholder={isSignup ? "Choose a unique username" : "Enter your username"}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563b8] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {isSignup && (
                <div>
                  <label htmlFor="age" className="mb-2 block text-sm font-semibold text-slate-700">Age</label>
                  <input id="age" name="age" type="number" min="1" max="120" required placeholder="Enter your age"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563b8] focus:bg-white focus:ring-4 focus:ring-blue-100" />
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  {!isSignup && (
                    <button type="button" aria-expanded={showRecoveryHelp} aria-controls="password-recovery-help" onClick={() => setShowRecoveryHelp(value => !value)} className="text-xs font-semibold text-[#1e3a8a] hover:text-[#d97706]">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={isSignup ? 8 : 1}
                    maxLength={128}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    placeholder={isSignup ? "At least 8 characters" : "Enter your password"}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563b8] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {showRecoveryHelp && !isSignup && <p id="password-recovery-help" role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Password recovery is not configured for this project yet. Contact the site administrator if you cannot access your account.</p>}

              {isSignup && (
                <div>
                  <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirm password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563b8] focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a8a] text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#172d72] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? (isSignup ? "Creating account…" : "Signing in…") : isSignup ? "Create account" : "Sign in"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">{error}</p>}
              {submitted && (
                <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
                  {isSignup ? "Account created. Opening your dashboard…" : "Signed in. Opening your dashboard…"}
                </p>
              )}
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
              {isSignup ? "Already have an account?" : "New to Chunav Bodh?"}{" "}
              <Link href={isSignup ? "/login" : "/signup"} className="font-bold text-[#1e3a8a] hover:text-[#d97706]">
                {isSignup ? "Sign in" : "Create an account"}
              </Link>
            </p>
            <p className="mt-8 text-center text-xs text-slate-400">
              Candidate information is also available without an account.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
