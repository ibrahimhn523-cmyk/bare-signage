import type { Metadata, Viewport } from "next";
import { readActiveContentIndex } from "@/lib/content-store";
import DisplayLoop from "./DisplayLoop";

// لازم تبقى ديناميكية دائمًا — المحتوى يتغيّر من لوحة الإدارة، ولا يصح تجميدها
// كصفحة ثابتة وقت البناء (وقتها ما فيه BLOB_READ_WRITE_TOKEN أصلًا).
export const dynamic = "force-dynamic";

// وسوم PWA خاصة بهذا المسار فقط — لا تنتقل لـ /admin لأنها مُصدَّرة من page.tsx
// وليس layout.tsx الجذري. هذا ما يحقّق ADR-0001 (ملء شاشة كامل بدون شريط سفاري).
export const metadata: Metadata = {
  title: "بارع",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "بارع",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default async function DisplayPage() {
  const items = await readActiveContentIndex();
  return <DisplayLoop initialItems={items} />;
}
