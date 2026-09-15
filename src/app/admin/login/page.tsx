"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-surface p-7 shadow-sm"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            بارع
          </span>
          <h1 className="text-base font-semibold">دخول لوحة إدارة شاشة العرض</h1>
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-xs font-medium text-muted">
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "جارٍ الدخول…" : "دخول"}
        </button>
      </form>
    </div>
  );
}
