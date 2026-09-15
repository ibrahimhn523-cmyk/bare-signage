import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import {
  readContentIndex,
  toggleContentItem,
  moveContentItem,
  updateContentItem,
  deleteContentItem,
  ContentValidationError,
  type UpdatableFields,
} from "@/lib/content-store";

export const dynamic = "force-dynamic";

// محمي — تفعيل/إيقاف، أو ترتيب (تبديل مع العنصر المجاور)، أو تعديل الحقول.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  let ok = false;
  if (body.action === "toggle_active") {
    ok = await toggleContentItem(id);
  } else if (body.action === "update") {
    const patch: UpdatableFields = {};
    if ("title" in body) {
      patch.title =
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : null;
    }
    if ("url" in body && typeof body.url === "string") {
      patch.url = body.url.trim();
    }
    if ("duration_seconds" in body) {
      patch.duration_seconds =
        typeof body.duration_seconds === "number" ? body.duration_seconds : null;
    }
    try {
      const updated = await updateContentItem(id, patch);
      ok = updated !== null;
    } catch (err) {
      if (err instanceof ContentValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  } else if (body.action === "move") {
    const direction = body.direction === "up" ? "up" : "down";
    ok = await moveContentItem(id, direction);
    // عند حدّ القائمة (لا جار للتبديل) نُرجِع القائمة كما هي دون خطأ.
    if (!ok) {
      const items = await readContentIndex();
      if (items.some((item) => item.id === id)) {
        return NextResponse.json({ items });
      }
    }
  } else {
    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  }

  if (!ok) {
    return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
  }

  const items = await readContentIndex();
  return NextResponse.json({ items });
}

// محمي — يحذف العنصر، ويمسح ملف الوسائط فعليًا من Vercel Blob لأنواع الصور/المقاطع (ADR-0002).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteContentItem(id);
  if (!ok) {
    return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
  }

  const items = await readContentIndex();
  return NextResponse.json({ items });
}
