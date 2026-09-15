"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { upload } from "@vercel/blob/client";
import { DEFAULT_DURATION_SECONDS, type ContentItemType } from "@/lib/content-store";

const TYPES: { value: ContentItemType; label: string }[] = [
  { value: "image", label: "صورة" },
  { value: "video", label: "مقطع فيديو" },
  { value: "external_video", label: "رابط فيديو" },
  { value: "webpage", label: "صفحة ويب" },
];

const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-primary";
const labelClass = "mb-1 block text-xs font-medium text-muted";

export default function AddItemForm() {
  const router = useRouter();
  const [type, setType] = useState<ContentItemType>("image");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isUploadType = type === "image" || type === "video";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const rawTitle = formData.get("title");
    const title = typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : null;

    try {
      if (isUploadType) {
        const fileInput = form.elements.namedItem("file") as HTMLInputElement;
        const file = fileInput.files?.[0];
        if (!file) {
          setError("اختر ملفًا.");
          return;
        }

        let uploadFile: File = file;
        // تحويل HEIC/HEIF (شائع من رفع مباشر من آيفون) إلى JPEG قبل الرفع.
        if (/\.hei[cf]$/i.test(file.name)) {
          const heic2any = (await import("heic2any")).default;
          const converted = (await heic2any({ blob: file, toType: "image/jpeg" })) as Blob;
          uploadFile = new File(
            [converted],
            file.name.replace(/\.hei[cf]$/i, ".jpg"),
            { type: "image/jpeg" },
          );
        }

        setProgress(0);
        const blob = await upload(uploadFile.name, uploadFile, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          onUploadProgress: (event) => setProgress(event.percentage),
        });

        await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            title,
            url: blob.url,
            duration_seconds:
              type === "video" ? null : Number(formData.get("duration_seconds")),
          }),
        });
      } else {
        await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            title,
            url: formData.get("url"),
            duration_seconds: Number(formData.get("duration_seconds")),
          }),
        });
      }

      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      {/* اختيار النوع — أزرار مقسّمة */}
      <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-surface-2 p-1">
        {TYPES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
              type === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted hover:bg-surface"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isUploadType ? (
        <>
          <div>
            <label className={labelClass}>الملف</label>
            <input
              type="file"
              name="file"
              required
              accept={type === "image" ? "image/*,.heic,.heif" : "video/*"}
              className="block w-full text-sm text-muted file:me-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90"
            />
          </div>
          <div>
            <label className={labelClass}>الاسم (اختياري)</label>
            <input type="text" name="title" placeholder="اسم للتمييز في القائمة" className={inputClass} />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className={labelClass}>الاسم</label>
            <input type="text" name="title" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>الرابط</label>
            <input type="url" name="url" required dir="ltr" placeholder="https://…" className={inputClass} />
          </div>
        </>
      )}

      {type !== "video" && (
        <div>
          <label className={labelClass}>مدة العرض (ثواني)</label>
          <input
            type="number"
            name="duration_seconds"
            min={1}
            defaultValue={DEFAULT_DURATION_SECONDS[type as "image" | "external_video" | "webpage"]}
            required
            className={`${inputClass} w-28`}
          />
        </div>
      )}

      {progress !== null && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted">جارٍ الرفع… {Math.round(progress)}%</p>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "جارٍ الإضافة…" : "إضافة العنصر"}
      </button>
    </form>
  );
}
