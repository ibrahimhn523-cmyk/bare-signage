"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentItem } from "@/lib/content-store";
import ContentItemView from "./ContentItemView";

const FADE_MS = 500;

export default function DisplayLoop({ initialItems }: { initialItems: ContentItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // فهرس آمن دائمًا داخل حدود القائمة الحالية — يُحسب أثناء الرندر مباشرة
  // (يتعامل تلقائيًا مع تقلّص القائمة بعد إعادة الجلب، بدون setState في effect).
  const safeIndex = items.length > 0 ? index % items.length : 0;
  const current = items[safeIndex] ?? null;
  const atLoopEnd = items.length === 0 || safeIndex >= items.length - 1;

  const goToNext = useCallback(async () => {
    setVisible(false);
    await new Promise((resolve) => setTimeout(resolve, FADE_MS));

    setIndex((prevIndex) => prevIndex + 1);
    setVisible(true);

    // نعيد جلب القائمة فقط عند نهاية الدورة الكاملة — بهذا لا تُقطع مادة قيد
    // العرض عند أي تعديل من لوحة الإدارة في منتصف الدورة.
    if (atLoopEnd) {
      try {
        const res = await fetch("/api/content", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setItems(data.items ?? []);
          setIndex(0);
        }
      } catch {
        // تجاهل فشل إعادة الجلب — نكمل بنفس القائمة الحالية
      }
    }
  }, [atLoopEnd]);

  useEffect(() => {
    if (!current) return;
    if (current.type === "video") return; // ينتقل عبر onEnded بدل مؤقّت ثابت

    const holdMs = (current.duration_seconds ?? 10) * 1000;
    timerRef.current = setTimeout(goToNext, holdMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) {
    return <div className="h-dvh w-dvh bg-black" />;
  }

  return (
    <div className="relative h-dvh w-dvh overflow-hidden bg-black">
      <div
        className="h-full w-full"
        style={{ transition: `opacity ${FADE_MS}ms ease`, opacity: visible ? 1 : 0 }}
      >
        <ContentItemView item={current} onEnded={goToNext} />
      </div>
    </div>
  );
}
