"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { upload } from "@vercel/blob/client";
import { DEFAULT_DURATION_SECONDS, type ContentItemType } from "@/lib/content-store";

const UPLOAD_TYPES: { value: "image" | "video"; label: string }[] = [
  { value: "image", label: "صورة" },
  { value: "video", label: "مقطع فيديو" },
];

const LINK_TYPES: { value: "external_video" | "webpage"; label: string }[] = [
  { value: "external_video", label: "رابط فيديو خارجي" },
  { value: "webpage", label: "رابط صفحة ويب حية" },
];

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

    try {
      if (isUploadType) {
        const fileInput = form.elements.namedItem("file") as HTMLInputElement;
        const file = fileInput.files?.[0];
        if (!file) {
          setError("اختر ملفًا.");
          return;
        }

        let uploadFile: File = file;
        // تحويل HEIC/HEIF (شائع من رفع مباشر من آيفون) إلى JPEG قبل الرفع —
        // لازم يكون داخل المتصفح لأن الرفع يذهب مباشرة لـ Blob بدون المرور بخادمنا.
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

        const durationValue = formData.get("duration_seconds");
        await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            url: blob.url,
            duration_seconds: type === "video" ? null : Number(durationValue),
          }),
        });
      } else {
        await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            title: formData.get("title"),
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap gap-3">
        {[...UPLOAD_TYPES, ...LINK_TYPES].map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="type"
              value={opt.value}
              checked={type === opt.value}
              onChange={() => setType(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      {isUploadType ? (
        <div className="space-y-1">
          <label className="block text-sm">الملف</label>
          <input
            type="file"
            name="file"
            required
            accept={type === "image" ? "image/*,.heic,.heif" : "video/*"}
            className="block w-full text-sm"
          />
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <label className="block text-sm">الاسم</label>
            <input
              type="text"
              name="title"
              required
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm">الرابط</label>
            <input
              type="url"
              name="url"
              required
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </>
      )}

      {type !== "video" && (
        <div className="space-y-1">
          <label className="block text-sm">مدة العرض (ثواني)</label>
          <input
            type="number"
            name="duration_seconds"
            min={1}
            defaultValue={DEFAULT_DURATION_SECONDS[type]}
            required
            className="w-32 rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
      )}

      {progress !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting ? "جارٍ الإضافة..." : "إضافة"}
      </button>
    </form>
  );
}
