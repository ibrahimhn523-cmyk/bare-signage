import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { readContentIndex, writeContentIndex, deleteBlobFile } from "@/lib/content-store";

// محمي — تفعيل/إيقاف، أو ترتيب (تبديل مع العنصر المجاور).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const items = await readContentIndex();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
  }

  if (body.action === "toggle_active") {
    items[index] = { ...items[index], is_active: !items[index].is_active };
  } else if (body.action === "move") {
    const direction = body.direction as "up" | "down";
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) {
      return NextResponse.json({ items });
    }
    const tmp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = tmp;
  } else {
    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  }

  await writeContentIndex(items);
  return NextResponse.json({ items });
}

// محمي — يحذف السطر، ويمسح الملف فعليًا من Vercel Blob لأنواع الصور/المقاطع (ADR-0002).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const { id } = await params;
  const items = await readContentIndex();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
  }

  const [item] = items.splice(index, 1);

  if (item.type === "image" || item.type === "video") {
    await deleteBlobFile(item.url);
  }

  await writeContentIndex(items);
  return NextResponse.json({ items });
}
