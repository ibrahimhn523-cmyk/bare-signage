# شاشة بارع — واجهة العرض التفاعلية

مشروع digital signage لشاشة استقبال أكاديمية بارع. راجع [`CONTEXT.md`](./CONTEXT.md) للنموذج المفاهيمي الكامل، و[`DECISIONS.md`](./DECISIONS.md) للقرارات المعمارية.

## التشغيل محليًا

```bash
npm install
cp .env.local.example .env.local
# املأ SESSION_SECRET و ADMIN_PASSWORD_HASH و BLOB_READ_WRITE_TOKEN في .env.local
npm run dev
```

- `/` — صفحة العرض العامة (PWA).
- `/admin` — لوحة الإدارة (تسجيل دخول مطلوب).

## توليد كلمة مرور مُجزَّأة لـ ADMIN_PASSWORD_HASH

```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" "كلمة-المرور-هنا"
```
