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
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">لوحة إدارة شاشة بارع</h1>
        <form action={signOut}>
          <button type="submit" className="text-sm text-danger">
            تسجيل الخروج
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  );
}
