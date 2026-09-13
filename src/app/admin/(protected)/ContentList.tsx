"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContentItem } from "@/lib/content-store";

const TYPE_LABELS: Record<ContentItem["type"], string> = {
  image: "صورة",
  video: "مقطع فيديو",
  external_video: "رابط فيديو خارجي",
  webpage: "رابط صفحة ويب",
};

export default function ContentList({ items }: { items: ContentItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setPendingId(id);
    try {
      await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا العنصر نهائيًا؟ سيُمسح الملف من التخزين أيضًا.")) return;
    setPendingId(id);
    try {
      await fetch(`/api/content/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-foreground/60">لا يوجد محتوى بعد.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded bg-brand/10 px-2 py-0.5 text-xs text-brand">
                {TYPE_LABELS[item.type]}
              </span>
              {!item.is_active && (
                <span className="rounded bg-foreground/10 px-2 py-0.5 text-xs">موقوف</span>
              )}
            </div>
            <p className="mt-1 truncate text-sm">{item.title ?? item.url}</p>
            {item.duration_seconds !== null && (
              <p className="text-xs text-foreground/60">{item.duration_seconds} ثانية</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={pendingId === item.id || index === 0}
              onClick={() => patch(item.id, { action: "move", direction: "up" })}
              className="rounded p-1.5 disabled:opacity-30"
              aria-label="نقل لأعلى"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={pendingId === item.id || index === items.length - 1}
              onClick={() => patch(item.id, { action: "move", direction: "down" })}
              className="rounded p-1.5 disabled:opacity-30"
              aria-label="نقل لأسفل"
            >
              ▼
            </button>
            <button
              type="button"
              disabled={pendingId === item.id}
              onClick={() => patch(item.id, { action: "toggle_active" })}
              className="rounded border border-border px-2 py-1 text-xs disabled:opacity-30"
            >
              {item.is_active ? "إيقاف" : "تفعيل"}
            </button>
            <button
              type="button"
              disabled={pendingId === item.id}
              onClick={() => remove(item.id)}
              className="rounded border border-danger px-2 py-1 text-xs text-danger disabled:opacity-30"
            >
              حذف
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
