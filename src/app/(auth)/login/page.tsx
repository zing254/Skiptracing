"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      window.location.href = callbackUrl;
    }
  };

  return (
    <div className="glass rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-lg font-bold text-white">Northern Auctioneers PRO</div>
          <div className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Skip Tracing</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all text-sm font-semibold text-white flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Sign In
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="glass rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
