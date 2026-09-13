import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";

// يصدر تصريح رفع مباشر من المتصفح إلى Vercel Blob.
// حرج أمنيًا: onBeforeGenerateToken يتحقق من الجلسة — بدونه أي شخص يعرف
// هذا الرابط يقدر يرفع ملفات بلا حدود على الحساب.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await isAuthenticated())) {
          throw new Error("غير مصرّح بالرفع");
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif",
            "video/mp4",
            "video/quicktime",
          ],
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // لا شيء هنا عمدًا — العميل يضيف السطر في قائمة المحتوى عبر
        // POST /api/content مباشرة بعد اكتمال الرفع (هذا الـ webhook لا يعمل
        // محليًا بدون نفق عام على الإنترنت).
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
