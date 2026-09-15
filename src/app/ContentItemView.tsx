import type { ContentItem } from "@/lib/content-store";
import { toEmbedUrl } from "@/lib/content-store";

export default function ContentItemView({
  item,
  onEnded,
}: {
  item: ContentItem;
  onEnded: () => void;
}) {
  switch (item.type) {
    case "image":
      // احتواء كامل (contain) — الصورة تظهر كاملة بلا قص، ولو نتج شريطان فارغان
      // عند اختلاف النسبة. (انحراف واعٍ عن قرار CONTEXT الأصلي "cover"، موثّق في
      // DECISIONS-0005 — السبب: قص الشعارات والنصوص كان يشوّهها.)
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt="" className="h-full w-full object-contain" />
      );

    case "video":
      // يشتغل لطوله الطبيعي مرة واحدة — بدون قص (contain عكس الصور عمدًا).
      // صامت إجباريًا: قيد تشغيل تلقائي من iOS/WKWebView بدون تفاعل مستخدم.
      return (
        <video
          src={item.url}
          className="h-full w-full object-contain"
          autoPlay
          muted
          playsInline
          onEnded={onEnded}
        />
      );

    case "external_video":
      return (
        <iframe
          src={toEmbedUrl(item.url)}
          className="h-full w-full border-0"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      );

    case "webpage":
      return <iframe src={item.url} className="h-full w-full border-0" />;

    default:
      return null;
  }
}
