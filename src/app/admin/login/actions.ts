"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export type SignInState = { error?: string };

export async function signIn(
  _prevState: SignInState | undefined,
  formData: FormData,
): Promise<SignInState> {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0) {
    return { error: "أدخل كلمة المرور." };
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    return { error: "لم يتم إعداد كلمة المرور بعد على الخادم." };
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return { error: "كلمة المرور غير صحيحة." };
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();
  redirect("/admin");
}

export async function signOut() {
  const session = await getSession();
  session.destroy();
  redirect("/admin/login");
}
