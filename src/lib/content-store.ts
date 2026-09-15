import { list, put, del } from "@vercel/blob";

/**
 * التخزين: كل عنصر محتوى = ملف Blob مستقل تحت البادئة "items/".
 *
 * لماذا هذا التصميم بدل ملف JSON واحد مشترك؟ الملف المشترك يُعاد كتابته
 * (overwrite) عند كل تعديل، فيقع في مشكلتين على Vercel Blob:
 *   1. فقدان تحديثات (lost update) عند تداخل عمليتين — كلاهما يقرأ ثم يكتب فوق الآخر.
 *   2. تخزين مؤقت عنيد للرابط العام لملف يُعاد كتابته باستمرار، فتُقرأ نسخة قديمة.
 *
 * الحل: كل ملف عنصر يُكتب مرة واحدة فقط (pathname فريد عبر nonce، بلا overwrite أبدًا).
 * أي تعديل (تفعيل/ترتيب) = حذف الملف القديم + إنشاء ملف جديد. التعداد عبر list()
 * الذي يقرأ من واجهة التحكم (origin) لا من CDN، فيعكس الحالة الحالية دائمًا.
 * محتوى كل ملف ثابت لا يتغير، فتخزينه المؤقت آمن (يخدم دائمًا القيمة الصحيحة).
 *
 * الترتيب: مُرمَّز في اسم الملف (order مبطّن بأصفار) — list يرتّب أبجديًا فيطابق الرقمي.
 */

const ITEMS_PREFIX = "items/";
const ORDER_PAD = 6;
const ORDER_GAP = 10;

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

// ---- طبقة التخزين الداخلية (per-item blobs) ----

type StoredEntry = { item: ContentItem; order: number; pathname: string };

function buildPathname(order: number, id: string): string {
  const orderStr = String(order).padStart(ORDER_PAD, "0");
  const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  // الصيغة: items/{order}_{id}_{nonce}.json — الفواصل "_" لا تظهر داخل أي جزء
  // (order أرقام، id وnonce بلا "_")، فالتفكيك بـ split("_") آمن.
  return `${ITEMS_PREFIX}${orderStr}_${id}_${nonce}.json`;
}

function parseOrder(pathname: string): number | null {
  const base = pathname.slice(ITEMS_PREFIX.length);
  const orderStr = base.split("_")[0];
  const order = Number.parseInt(orderStr, 10);
  return Number.isNaN(order) ? null : order;
}

async function writeItemBlob(order: number, item: ContentItem): Promise<void> {
  // pathname فريد (nonce) → كتابة لمرة واحدة، بلا overwrite ولا تعارض تخزين مؤقت.
  await put(buildPathname(order, item.id), JSON.stringify(item), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

async function readEntries(): Promise<StoredEntry[]> {
  const { blobs } = await list({ prefix: ITEMS_PREFIX });
  const withOrder = blobs
    .map((b) => ({ order: parseOrder(b.pathname), url: b.url, pathname: b.pathname }))
    .filter((b): b is { order: number; url: string; pathname: string } => b.order !== null)
    .sort((a, b) => a.order - b.order);

  const entries = await Promise.all(
    withOrder.map(async (b) => {
      try {
        // محتوى كل ملف ثابت (كتابة لمرة واحدة) فقراءته من الرابط آمنة دائمًا.
        const res = await fetch(b.url, { cache: "no-store" });
        if (!res.ok) return null;
        const item = (await res.json()) as ContentItem;
        return { item, order: b.order, pathname: b.pathname } satisfies StoredEntry;
      } catch {
        return null;
      }
    }),
  );

  return entries.filter((e): e is StoredEntry => e !== null);
}

// ---- الواجهة العامة المستخدمة من مسارات API وصفحة العرض ----

export async function readContentIndex(): Promise<ContentItem[]> {
  return (await readEntries()).map((e) => e.item);
}

export async function readActiveContentIndex(): Promise<ContentItem[]> {
  return (await readContentIndex()).filter((item) => item.is_active);
}

export async function addContentItem(
  fields: Pick<ContentItem, "type" | "title" | "url" | "duration_seconds">,
): Promise<ContentItem> {
  const entries = await readEntries();
  const maxOrder = entries.reduce((m, e) => Math.max(m, e.order), 0);
  const item: ContentItem = {
    id: crypto.randomUUID(),
    type: fields.type,
    title: fields.title,
    url: fields.url,
    duration_seconds: fields.duration_seconds,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  await writeItemBlob(maxOrder + ORDER_GAP, item);
  return item;
}

export type UpdatableFields = Partial<
  Pick<ContentItem, "title" | "url" | "duration_seconds">
>;

// تعديل عنصر قائم (الاسم/الرابط/المدة). يحفظ نفس الـ id والترتيب وحالة التفعيل.
export async function updateContentItem(
  id: string,
  patch: UpdatableFields,
): Promise<ContentItem | null> {
  const entries = await readEntries();
  const target = entries.find((e) => e.item.id === id);
  if (!target) return null;

  const updated: ContentItem = { ...target.item, ...patch };
  // نفس قواعد الإضافة تُطبّق على التعديل (قد ترمي ContentValidationError).
  validateItem({
    type: updated.type,
    title: updated.title,
    duration_seconds: updated.duration_seconds,
  });

  // حذف ثم إنشاء بنفس الترتيب — بلا overwrite (ملف جديد بـ nonce جديد).
  await del(target.pathname);
  await writeItemBlob(target.order, updated);
  return updated;
}

export async function deleteContentItem(id: string): Promise<boolean> {
  const entries = await readEntries();
  const target = entries.find((e) => e.item.id === id);
  if (!target) return false;

  // احذف ملف العنصر نفسه، وملف الوسائط المرفوع (صورة/مقطع) إن وُجد — لتفادي
  // ملفات يتيمة تستهلك من حصة التخزين (ADR-0002).
  await del(target.pathname);
  if (target.item.type === "image" || target.item.type === "video") {
    await del(target.item.url);
  }
  return true;
}

export async function toggleContentItem(id: string): Promise<boolean> {
  const entries = await readEntries();
  const target = entries.find((e) => e.item.id === id);
  if (!target) return false;

  const updated: ContentItem = {
    ...target.item,
    is_active: !target.item.is_active,
  };
  // حذف ثم إنشاء بنفس الترتيب — بلا overwrite (ملف جديد بـ nonce جديد).
  await del(target.pathname);
  await writeItemBlob(target.order, updated);
  return true;
}

export async function moveContentItem(
  id: string,
  direction: "up" | "down",
): Promise<boolean> {
  const entries = await readEntries(); // مرتّبة تصاعديًا حسب order
  const index = entries.findIndex((e) => e.item.id === id);
  if (index === -1) return false;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= entries.length) return false;

  const a = entries[index];
  const b = entries[swapIndex];

  // بدّل ترتيب العنصرين: كلٌّ يأخذ ترتيب الآخر، عبر حذف وإعادة إنشاء.
  await del(a.pathname);
  await del(b.pathname);
  await writeItemBlob(b.order, a.item);
  await writeItemBlob(a.order, b.item);
  return true;
}
