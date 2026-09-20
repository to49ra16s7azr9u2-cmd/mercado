import { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { CSV_TEMPLATE_EXAMPLE } from "@/lib/constants";

function escape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("plantilla")) {
    return new Response(CSV_TEMPLATE_EXAMPLE, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="plantilla-mercado-shops.csv"',
      },
    });
  }

  const user = await currentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const shop = get<{ id: string; slug: string }>("SELECT id, slug FROM shops WHERE owner_id = ?", [user.id]);
  if (!shop) return new Response("No tienes una tienda", { status: 404 });

  const items = all<{
    external_sku: string; title: string; description: string; price: number; stock: number;
    slug: string | null; brand: string | null; size: string; color: string; id: string;
  }>(
    `SELECT i.id, i.external_sku, i.title, i.description, i.price, i.stock, i.size, i.color,
            c.slug, b.name AS brand
     FROM items i
     LEFT JOIN categories c ON c.id = i.category_id
     LEFT JOIN brands b ON b.id = i.brand_id
     WHERE i.shop_id = ? AND i.status IN ('on_sale', 'stopped', 'draft')
     ORDER BY i.created_at DESC`,
    [shop.id],
  );

  const rows = items.map((item) => {
    const variants = all<{ label: string; stock: number }>(
      "SELECT label, stock FROM item_variants WHERE item_id = ? ORDER BY position", [item.id],
    ).map((v) => `${v.label}:${v.stock}`).join("|");
    return [
      item.external_sku || item.id,
      item.title,
      item.description.replace(/\n/g, " "),
      String(item.price),
      String(item.stock),
      item.slug ?? "",
      item.brand ?? "",
      item.size,
      item.color,
      variants,
    ].map((cell) => escape(String(cell))).join(",");
  });

  const csv = [
    "sku,titulo,descripcion,precio,inventario,categoria,marca,talla,color,variantes",
    ...rows,
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="catalogo-${shop.slug}.csv"`,
    },
  });
}
