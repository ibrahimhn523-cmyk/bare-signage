import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { signOut } from "../login/actions";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="بارع" className="h-full w-full object-contain" />
            </span>
            <h1 className="text-base font-semibold">إدارة شاشة العرض</h1>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger"
            >
              تسجيل الخروج
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6">{children}</main>
    </div>
  );
}
