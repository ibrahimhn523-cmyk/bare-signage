import { get, put, del } from "@vercel/blob";

// اسم ملف الفهرس ثابت — يُستبدل محتواه بالكامل عند كل كتابة (put مع allowOverwrite).
const INDEX_PATHNAME = "content-index.json";

export type ContentItemType = "image" | "video" | "external_video" | "webpage";

export type ContentItem = {
  id: string;
  type: ContentItemType;
  /** مطلوب لأنواع الروابط فقط (external_video / webpage) */
  title: string | null;
  /** رابط Blob للملفات المرفوعة، أو الرابط الخارجي لأنواع الروابط */
  url: string;
  /** null فقط لنوع video — يشتغل لطوله الطبيعي بدون تكرار */
  duration_seconds: number | null;
  is_active: boolean;
  created_at: string;
};

export const DEFAULT_DURATION_SECONDS: Record<
  Exclude<ContentItemType, "video">,
  number
> = {
  image: 10,
  external_video: 30,
  webpage: 30,
};

// يحوّل أي صيغة شائعة لرابط يوتيوب إلى صيغة embed الرسمية.
// روابط غير يوتيوب (أو صيغة embed جاهزة) تُعاد كما هي.
export function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www\.|m\.)/, "");

    if (host === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (host === "youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.pathname.startsWith("/embed/")) return url;
    }
    return url;
  } catch {
    return url;
  }
}

export class ContentValidationError extends Error {}

// يفرض قواعد كل نوع محتوى — بديل CHECK constraints من نسخة قاعدة البيانات.
export function validateItem(
  item: Pick<ContentItem, "type" | "title" | "duration_seconds">,
) {
  if (item.type === "video") {
    if (item.duration_seconds !== null) {
      throw new ContentValidationError(
        "مقاطع الفيديو المرفوعة لا تأخذ مدة عرض — تشتغل لطولها الطبيعي مرة واحدة.",
      );
    }
  } else if (item.duration_seconds === null || item.duration_seconds <= 0) {
    throw new ContentValidationError(
      "مدة العرض بالثواني مطلوبة ويجب أن تكون أكبر من صفر.",
    );
  }

  if (
    (item.type === "external_video" || item.type === "webpage") &&
    !item.title?.trim()
  ) {
    throw new ContentValidationError("اسم العنصر مطلوب لهذا النوع من الروابط.");
  }
}

export async function readContentIndex(): Promise<ContentItem[]> {
  // useCache: false يقرأ مباشرة من التخزين الأصلي (origin) متجاوزًا تخزين
  // CDN المؤقت — ضروري لنمط "اقرأ-عدّل-اكتب": أي نسخة قديمة مخبأة تعني فقدان
  // تعديل سابق بصمت. (كسر التخزين عبر query param وحده لا يكفي — Vercel قد
  // يخدم النسخة المخبأة رغمه.)
  const result = await get(INDEX_PATHNAME, { access: "public", useCache: false });
  if (!result || result.statusCode !== 200) return [];
  return (await new Response(result.stream).json()) as ContentItem[];
}

export async function readActiveContentIndex(): Promise<ContentItem[]> {
  const items = await readContentIndex();
  return items.filter((item) => item.is_active);
}

export async function writeContentIndex(items: ContentItem[]): Promise<void> {
  await put(INDEX_PATHNAME, JSON.stringify(items), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    // بدون هذا، Vercel يخزّن الملف مؤقتًا حتى 5 دقائق على مستوى الـ CDN —
    // خطير لنمط "اقرأ-عدّل-اكتب" (قراءة تالية قد ترى نسخة قديمة فتفقد تعديلًا).
    cacheControlMaxAge: 0,
  });
}

export async function deleteBlobFile(url: string): Promise<void> {
  await del(url);
}
