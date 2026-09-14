import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import {
  readActiveContentIndex,
  addContentItem,
  validateItem,
  ContentValidationError,
  type ContentItemType,
} from "@/lib/content-store";

// لا تُخزَّن استجابة هذا المسار مؤقتًا — يقرأ حالة المحتوى الحيّة على كل طلب.
export const dynamic = "force-dynamic";

// عام — بدون تسجيل دخول. تستخدمه صفحة العرض. يُرجِع العناصر المفعّلة فقط.
export async function GET() {
  const items = await readActiveContentIndex();
  return NextResponse.json({ items });
}

// محمي — يتطلب جلسة صالحة. إضافة عنصر جديد (رابط، أو بعد اكتمال رفع ملف).
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const body = await request.json();
  const type = body.type as ContentItemType;
  const title =
    typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
  const url = typeof body.url === "string" ? body.url : "";
  const duration_seconds =
    typeof body.duration_seconds === "number" ? body.duration_seconds : null;

  if (!type || !url) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  try {
    validateItem({ type, title, duration_seconds });
  } catch (err) {
    if (err instanceof ContentValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const item = await addContentItem({ type, title, url, duration_seconds });
  return NextResponse.json({ item }, { status: 201 });
}
