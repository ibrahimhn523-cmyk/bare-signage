import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type SessionData = {
  isLoggedIn: boolean;
};

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "bare-signage-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // ٣٠ يومًا
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// تُستخدم داخل مسارات الـ API المحمية: ترجع true إن كانت الجلسة صالحة.
export async function isAuthenticated() {
  const session = await getSession();
  return session.isLoggedIn === true;
}
