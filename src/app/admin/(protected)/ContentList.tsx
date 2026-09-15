"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContentItem, ContentItemType } from "@/lib/content-store";

const TYPE_META: Record<ContentItemType, { label: string; tint: string }> = {
  image: { label: "صورة", tint: "bg-sky-500/12 text-sky-600 dark:text-sky-400" },
  video: { label: "مقطع فيديو", tint: "bg-violet-500/12 text-violet-600 dark:text-violet-400" },
  external_video: { label: "رابط فيديو", tint: "bg-rose-500/12 text-rose-600 dark:text-rose-400" },
  webpage: { label: "صفحة ويب", tint: "bg-amber-500/12 text-amber-600 dark:text-amber-500" },
};

const editInput =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

// أيقونات مضمّنة (بلا مكتبة خارجية)
const ico = "h-4 w-4";
const Pencil = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ico}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
const Eye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ico}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ico}><path d="m3 3 18 18" /><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" /><path d="M9.4 5.2A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.4 3.3M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 3-.5" /></svg>
);
const Trash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ico}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg>
);
const Up = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ico}><path d="m18 15-6-6-6 6" /></svg>
);
const Down = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ico}><path d="m6 9 6 6 6-6" /></svg>
);
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M8 5v14l11-7z" /></svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>
);

function Thumb({ item }: { item: ContentItem }) {
  const base = "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl";
  if (item.type === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt="" className={`${base} object-cover`} />;
  }
  const { tint } = TYPE_META[item.type];
  return (
    <div className={`${base} ${tint}`}>
      {item.type === "webpage" ? <GlobeIcon /> : <PlayIcon />}
    </div>
  );
}

function IconBtn({
  onClick,
  disabled,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors disabled:opacity-30 ${
        danger ? "hover:bg-danger/10 hover:text-danger" : "hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function ContentList({ items }: { items: ContentItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

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

  function startEdit(item: ContentItem) {
    setEditingId(item.id);
    setEditTitle(item.title ?? "");
    setEditDuration(item.duration_seconds != null ? String(item.duration_seconds) : "");
    setEditUrl(item.url);
    setEditError(null);
  }

  async function saveEdit(item: ContentItem) {
    setPendingId(item.id);
    setEditError(null);
    const body: Record<string, unknown> = {
      action: "update",
      title: editTitle,
    };
    if (item.type !== "video") body.duration_seconds = Number(editDuration);
    if (item.type === "external_video" || item.type === "webpage") body.url = editUrl;

    try {
      const res = await fetch(`/api/content/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error ?? "تعذّر الحفظ.");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-12 text-center">
        <p className="text-sm text-muted">لا يوجد محتوى بعد — أضف أول عنصر من الأعلى.</p>
      </div>
    );
  }

  const isLink = (t: ContentItemType) => t === "external_video" || t === "webpage";

  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => {
        const editing = editingId === item.id;
        const busy = pendingId === item.id;
        return (
          <li
            key={item.id}
            className={`rounded-2xl border bg-surface p-3 shadow-sm transition-opacity ${
              item.is_active ? "border-border" : "border-border opacity-70"
            }`}
          >
            <div className="flex items-center gap-3">
              <Thumb item={item} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${TYPE_META[item.type].tint}`}>
                    {TYPE_META[item.type].label}
                  </span>
                  {!item.is_active && (
                    <span className="rounded-md bg-foreground/8 px-2 py-0.5 text-[11px] text-muted">
                      موقوف
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-medium">
                  {item.title || (
                    <span className="text-muted" dir="ltr">
                      {item.url}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {item.type === "video"
                    ? "المدة الأصلية للمقطع"
                    : `${item.duration_seconds} ثانية`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <IconBtn label="تعديل" onClick={() => (editing ? setEditingId(null) : startEdit(item))} disabled={busy}>
                  <Pencil />
                </IconBtn>
                <IconBtn
                  label={item.is_active ? "إيقاف" : "تفعيل"}
                  onClick={() => patch(item.id, { action: "toggle_active" })}
                  disabled={busy}
                >
                  {item.is_active ? <Eye /> : <EyeOff />}
                </IconBtn>
                <IconBtn
                  label="لأعلى"
                  onClick={() => patch(item.id, { action: "move", direction: "up" })}
                  disabled={busy || index === 0}
                >
                  <Up />
                </IconBtn>
                <IconBtn
                  label="لأسفل"
                  onClick={() => patch(item.id, { action: "move", direction: "down" })}
                  disabled={busy || index === items.length - 1}
                >
                  <Down />
                </IconBtn>
                <IconBtn label="حذف" danger onClick={() => remove(item.id)} disabled={busy}>
                  <Trash />
                </IconBtn>
              </div>
            </div>

            {editing && (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">الاسم</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={isLink(item.type) ? "" : "اسم للتمييز (اختياري)"}
                    className={editInput}
                  />
                </div>
                {isLink(item.type) && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">الرابط</label>
                    <input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      dir="ltr"
                      className={editInput}
                    />
                  </div>
                )}
                {item.type !== "video" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">مدة العرض (ثواني)</label>
                    <input
                      type="number"
                      min={1}
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      className={`${editInput} w-28`}
                    />
                  </div>
                )}
                {editError && <p className="text-sm text-danger">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(item)}
                    disabled={busy}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? "جارٍ الحفظ…" : "حفظ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:bg-surface-2"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
