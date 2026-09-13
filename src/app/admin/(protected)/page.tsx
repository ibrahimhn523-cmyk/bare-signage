import { readContentIndex } from "@/lib/content-store";
import ContentList from "./ContentList";
import AddItemForm from "./AddItemForm";

export default async function AdminPage() {
  const items = await readContentIndex();

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-base font-semibold">إضافة عنصر جديد</h2>
        <AddItemForm />
      </section>
      <section>
        <h2 className="mb-3 text-base font-semibold">المحتوى الحالي</h2>
        <ContentList items={items} />
      </section>
    </div>
  );
}
