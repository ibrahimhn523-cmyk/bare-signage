# سجلّ القرارات المعمارية

القرارات الكاملة موثّقة كملفات ADR منفصلة في [`docs/adr/`](./docs/adr/). هذا فهرس سريع فقط.

| # | القرار | الحالة |
|---|---|---|
| [0001](./docs/adr/0001-pwa-fullscreen-ios-home-screen.md) | عرض ملء الشاشة على iOS عبر PWA مُضافة للشاشة الرئيسية (بدل سفاري مباشرة) | مُعتمد |
| [0002](./docs/adr/0002-vercel-blob-hobby-storage.md) | اعتماد Vercel Blob (خطة Hobby) للتخزين رغم مخاطر موثّقة | مُعتمد |
| 0003 | لا Supabase — الدخول عبر iron-session + bcrypt، قائمة المحتوى كملف JSON في Vercel Blob بدل قاعدة بيانات. راجع خطة البناء في `C:\Users\ibrah\.claude\plans\snazzy-giggling-cake.md` للتفاصيل الكاملة (ماذا/لماذا/البديل المرفوض/التكلفة). | مُعتمد |
