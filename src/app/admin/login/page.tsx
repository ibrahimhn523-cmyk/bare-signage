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
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-background p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold">دخول لوحة إدارة شاشة بارع</h1>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm">
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 outline-none focus:border-brand"
          />
        </div>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-brand px-3 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "جارٍ الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  );
}
