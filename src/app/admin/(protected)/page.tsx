import { readContentIndex } from "@/lib/content-store";
import ContentList from "./ContentList";
import AddItemForm from "./AddItemForm";

export default async function AdminPage() {
  const items = await readContentIndex();
  const activeCount = items.filter((i) => i.is_active).length;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">إضافة عنصر جديد</h2>
        <AddItemForm />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">المحتوى الحالي</h2>
          {items.length > 0 && (
            <span className="text-xs text-muted">
              {items.length} عنصر · {activeCount} مفعّل
            </span>
          )}
        </div>
        <ContentList items={items} />
      </section>
    </div>
  );
}
