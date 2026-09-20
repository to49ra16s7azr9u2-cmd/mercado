export const SITE_NAME = "Mercado";
export const SITE_TAGLINE = "Compra y vende fácil, rápido y seguro";
export const FEE_RATE = 0.1; // comisión de venta del 10 %
export const MIN_PRICE = 3;
export const MAX_PRICE = 999_999;
export const MIN_PAYOUT = 20;
export const PAYOUT_FEE = 2;

export type ConditionValue = 1 | 2 | 3 | 4 | 5 | 6;

export const CONDITIONS: { value: ConditionValue; label: string; hint: string }[] = [
  { value: 1, label: "Nuevo, sin estrenar", hint: "Sin usar, con etiqueta o precinto" },
  { value: 2, label: "Como nuevo", hint: "Usado una o dos veces, sin marcas" },
  { value: 3, label: "Buen estado", hint: "Señales de uso mínimas" },
  { value: 4, label: "Estado aceptable", hint: "Se aprecian marcas o desgaste" },
  { value: 5, label: "Con desperfectos", hint: "Manchas, roturas o piezas dañadas" },
  { value: 6, label: "Para piezas o no funciona", hint: "Necesita reparación" },
];

export const SHIPPING_PAYERS = [
  { value: "seller", label: "Envío gratis (lo paga quien vende)", short: "Envío gratis" },
  { value: "buyer", label: "Lo paga quien compra", short: "Envío a cargo del comprador" },
] as const;

export const SHIPPING_METHODS = [
  {
    value: "facil",
    label: "Envío Fácil Mercado",
    hint: "Anónimo, con seguimiento y garantía. Entrega en punto de recogida.",
    cost: [
      { max: 1, price: 2.1 },
      { max: 5, price: 4.5 },
      { max: 25, price: 7.5 },
    ],
  },
  {
    value: "comodo",
    label: "Envío Cómodo Mercado",
    hint: "Anónimo, con seguimiento. Entrega a domicilio en 24-48 h.",
    cost: [
      { max: 2, price: 3.2 },
      { max: 10, price: 5.9 },
      { max: 25, price: 9.9 },
    ],
  },
  { value: "carta", label: "Carta ordinaria", hint: "Sin seguimiento ni garantía.", cost: [] },
  { value: "certificado", label: "Carta certificada", hint: "Con seguimiento básico.", cost: [] },
  { value: "paqueteria", label: "Paquetería estándar", hint: "Empresa de mensajería a tu elección.", cost: [] },
  { value: "mano", label: "Entrega en mano", hint: "Quedáis para hacer el intercambio.", cost: [] },
  { value: "indefinido", label: "Lo decido al vender", hint: "Se acuerda tras la compra.", cost: [] },
] as const;

export const SHIP_DAYS = [
  { value: 1, label: "En 1-2 días" },
  { value: 2, label: "En 2-3 días" },
  { value: 3, label: "En 4-7 días" },
] as const;

export const REGIONS = [
  "Andalucía", "Aragón", "Asturias", "Islas Baleares", "Canarias", "Cantabria",
  "Castilla-La Mancha", "Castilla y León", "Cataluña", "Extremadura", "Galicia",
  "La Rioja", "Madrid", "Murcia", "Navarra", "País Vasco", "Comunidad Valenciana",
  "Ceuta", "Melilla", "Fuera de España",
];

export const PAYMENT_METHODS = [
  { value: "card", label: "Tarjeta de crédito o débito", hint: "Pago en 1 plazo o a plazos" },
  { value: "balance", label: "Saldo de ventas / puntos", hint: "Usa el dinero que ya tienes en Mercado" },
  { value: "transfer", label: "Transferencia bancaria", hint: "Recibirás los datos tras confirmar" },
  { value: "store", label: "Pago en tienda / cajero", hint: "Comisión de 1,00 €" },
  { value: "bizum", label: "Bizum", hint: "Pago instantáneo desde el móvil" },
  { value: "paypal", label: "PayPal", hint: "Con protección del comprador" },
] as const;

export const SORTS = [
  { value: "new", label: "Más recientes" },
  { value: "old", label: "Más antiguos" },
  { value: "price_asc", label: "Precio: de menor a mayor" },
  { value: "price_desc", label: "Precio: de mayor a menor" },
  { value: "likes", label: "Más favoritos" },
] as const;

export const STATUS_FILTERS = [
  { value: "all", label: "Todo" },
  { value: "on_sale", label: "En venta" },
  { value: "sold", label: "Vendido" },
] as const;

export const SIZES = [
  "XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "Talla única",
  "34", "36", "38", "40", "42", "44", "46", "48", "50",
];

export const BRANDS = [
  "Zara", "Nike", "Adidas", "Apple", "Samsung", "Sony", "Nintendo", "LEGO",
  "Mango", "H&M", "Uniqlo", "Massimo Dutti", "Levi's", "The North Face",
  "Chanel", "Louis Vuitton", "Gucci", "Bershka", "Pull&Bear", "Desigual",
  "Xiaomi", "Canon", "Dyson", "IKEA", "Stradivarius", "Puma", "New Balance",
  "Sin marca",
];

export type CategoryNode = {
  name: string;
  slug: string;
  icon?: string;
  children?: CategoryNode[];
};

export const CATEGORY_TREE: CategoryNode[] = [
  {
    name: "Mujer", slug: "mujer", icon: "👗",
    children: [
      { name: "Camisetas y tops", slug: "mujer-camisetas", children: [
        { name: "Camisetas de manga corta", slug: "mujer-camisetas-corta" },
        { name: "Camisetas de manga larga", slug: "mujer-camisetas-larga" },
        { name: "Blusas y camisas", slug: "mujer-blusas" },
      ]},
      { name: "Chaquetas y abrigos", slug: "mujer-abrigos", children: [
        { name: "Abrigos", slug: "mujer-abrigos-abrigo" },
        { name: "Cazadoras", slug: "mujer-abrigos-cazadora" },
        { name: "Plumíferos", slug: "mujer-abrigos-plumifero" },
      ]},
      { name: "Pantalones", slug: "mujer-pantalones", children: [
        { name: "Vaqueros", slug: "mujer-pantalones-vaqueros" },
        { name: "Pantalones de vestir", slug: "mujer-pantalones-vestir" },
        { name: "Shorts", slug: "mujer-pantalones-shorts" },
      ]},
      { name: "Faldas y vestidos", slug: "mujer-vestidos", children: [
        { name: "Vestidos", slug: "mujer-vestidos-vestido" },
        { name: "Faldas", slug: "mujer-vestidos-falda" },
      ]},
      { name: "Zapatos", slug: "mujer-zapatos", children: [
        { name: "Zapatillas", slug: "mujer-zapatos-zapatillas" },
        { name: "Botas", slug: "mujer-zapatos-botas" },
        { name: "Tacones", slug: "mujer-zapatos-tacones" },
      ]},
      { name: "Bolsos", slug: "mujer-bolsos", children: [
        { name: "Bolsos de mano", slug: "mujer-bolsos-mano" },
        { name: "Mochilas", slug: "mujer-bolsos-mochilas" },
        { name: "Bandoleras", slug: "mujer-bolsos-bandolera" },
      ]},
      { name: "Joyas y accesorios", slug: "mujer-accesorios", children: [
        { name: "Collares", slug: "mujer-accesorios-collares" },
        { name: "Relojes", slug: "mujer-accesorios-relojes" },
        { name: "Gafas de sol", slug: "mujer-accesorios-gafas" },
      ]},
    ],
  },
  {
    name: "Hombre", slug: "hombre", icon: "👔",
    children: [
      { name: "Camisetas y tops", slug: "hombre-camisetas", children: [
        { name: "Camisetas", slug: "hombre-camisetas-camiseta" },
        { name: "Camisas", slug: "hombre-camisetas-camisa" },
        { name: "Sudaderas", slug: "hombre-camisetas-sudadera" },
      ]},
      { name: "Chaquetas y abrigos", slug: "hombre-abrigos", children: [
        { name: "Cazadoras", slug: "hombre-abrigos-cazadora" },
        { name: "Abrigos", slug: "hombre-abrigos-abrigo" },
      ]},
      { name: "Pantalones", slug: "hombre-pantalones", children: [
        { name: "Vaqueros", slug: "hombre-pantalones-vaqueros" },
        { name: "Chinos", slug: "hombre-pantalones-chinos" },
      ]},
      { name: "Zapatos", slug: "hombre-zapatos", children: [
        { name: "Zapatillas", slug: "hombre-zapatos-zapatillas" },
        { name: "Zapatos de vestir", slug: "hombre-zapatos-vestir" },
      ]},
      { name: "Relojes y accesorios", slug: "hombre-accesorios", children: [
        { name: "Relojes", slug: "hombre-accesorios-relojes" },
        { name: "Cinturones", slug: "hombre-accesorios-cinturones" },
      ]},
    ],
  },
  {
    name: "Bebé y niños", slug: "bebe", icon: "🧸",
    children: [
      { name: "Ropa de bebé (0-24 m)", slug: "bebe-ropa", children: [
        { name: "Bodies", slug: "bebe-ropa-bodies" },
        { name: "Conjuntos", slug: "bebe-ropa-conjuntos" },
      ]},
      { name: "Ropa de niño/a", slug: "bebe-nino", children: [
        { name: "Camisetas", slug: "bebe-nino-camisetas" },
        { name: "Pantalones", slug: "bebe-nino-pantalones" },
      ]},
      { name: "Carritos y sillas", slug: "bebe-carritos", children: [
        { name: "Carritos", slug: "bebe-carritos-carrito" },
        { name: "Sillas de coche", slug: "bebe-carritos-silla" },
      ]},
      { name: "Juguetes infantiles", slug: "bebe-juguetes" },
    ],
  },
  {
    name: "Hogar e interior", slug: "hogar", icon: "🛋️",
    children: [
      { name: "Muebles", slug: "hogar-muebles", children: [
        { name: "Sillas", slug: "hogar-muebles-sillas" },
        { name: "Mesas", slug: "hogar-muebles-mesas" },
        { name: "Estanterías", slug: "hogar-muebles-estanterias" },
      ]},
      { name: "Cocina y menaje", slug: "hogar-cocina", children: [
        { name: "Vajilla", slug: "hogar-cocina-vajilla" },
        { name: "Pequeño electrodoméstico", slug: "hogar-cocina-electro" },
      ]},
      { name: "Decoración", slug: "hogar-decoracion" },
      { name: "Ropa de cama", slug: "hogar-cama" },
    ],
  },
  {
    name: "Libros, música y videojuegos", slug: "libros", icon: "📚",
    children: [
      { name: "Libros", slug: "libros-libros", children: [
        { name: "Novela y literatura", slug: "libros-libros-novela" },
        { name: "Cómics y manga", slug: "libros-libros-comic" },
        { name: "Libros de texto", slug: "libros-libros-texto" },
      ]},
      { name: "Música", slug: "libros-musica", children: [
        { name: "CD", slug: "libros-musica-cd" },
        { name: "Vinilos", slug: "libros-musica-vinilo" },
      ]},
      { name: "Videojuegos", slug: "libros-videojuegos", children: [
        { name: "Nintendo Switch", slug: "libros-videojuegos-switch" },
        { name: "PlayStation", slug: "libros-videojuegos-ps" },
        { name: "Consolas", slug: "libros-videojuegos-consolas" },
      ]},
    ],
  },
  {
    name: "Juguetes y coleccionismo", slug: "juguetes", icon: "🎮",
    children: [
      { name: "Figuras y coleccionismo", slug: "juguetes-figuras" },
      { name: "Cartas coleccionables", slug: "juguetes-cartas" },
      { name: "Maquetas y LEGO", slug: "juguetes-lego" },
      { name: "Instrumentos musicales", slug: "juguetes-instrumentos" },
    ],
  },
  {
    name: "Cosmética y belleza", slug: "belleza", icon: "💄",
    children: [
      { name: "Maquillaje", slug: "belleza-maquillaje" },
      { name: "Cuidado de la piel", slug: "belleza-piel" },
      { name: "Perfumes", slug: "belleza-perfumes" },
      { name: "Cuidado del cabello", slug: "belleza-cabello" },
    ],
  },
  {
    name: "Electrónica y cámaras", slug: "electronica", icon: "📱",
    children: [
      { name: "Móviles y tablets", slug: "electronica-moviles", children: [
        { name: "Smartphones", slug: "electronica-moviles-smartphone" },
        { name: "Tablets", slug: "electronica-moviles-tablet" },
        { name: "Accesorios", slug: "electronica-moviles-accesorios" },
      ]},
      { name: "Ordenadores", slug: "electronica-ordenadores", children: [
        { name: "Portátiles", slug: "electronica-ordenadores-portatil" },
        { name: "Periféricos", slug: "electronica-ordenadores-perifericos" },
      ]},
      { name: "Cámaras", slug: "electronica-camaras", children: [
        { name: "Cámaras réflex", slug: "electronica-camaras-reflex" },
        { name: "Objetivos", slug: "electronica-camaras-objetivos" },
      ]},
      { name: "Audio y TV", slug: "electronica-audio", children: [
        { name: "Auriculares", slug: "electronica-audio-auriculares" },
        { name: "Altavoces", slug: "electronica-audio-altavoces" },
      ]},
    ],
  },
  {
    name: "Deporte y aire libre", slug: "deporte", icon: "⚽",
    children: [
      { name: "Ciclismo", slug: "deporte-ciclismo" },
      { name: "Fitness y gimnasio", slug: "deporte-fitness" },
      { name: "Camping y montaña", slug: "deporte-camping" },
      { name: "Fútbol y equipaciones", slug: "deporte-futbol" },
    ],
  },
  { name: "Hecho a mano", slug: "handmade", icon: "🧶",
    children: [
      { name: "Accesorios artesanales", slug: "handmade-accesorios" },
      { name: "Velas y jabones", slug: "handmade-velas" },
      { name: "Papelería", slug: "handmade-papeleria" },
    ],
  },
  { name: "Entradas", slug: "entradas", icon: "🎟️",
    children: [
      { name: "Conciertos", slug: "entradas-conciertos" },
      { name: "Deportes", slug: "entradas-deportes" },
      { name: "Cine y teatro", slug: "entradas-cine" },
    ],
  },
  { name: "Coches y motos", slug: "motor", icon: "🏍️",
    children: [
      { name: "Recambios de coche", slug: "motor-recambios" },
      { name: "Accesorios de moto", slug: "motor-moto" },
      { name: "Cascos", slug: "motor-cascos" },
    ],
  },
  { name: "Otros", slug: "otros", icon: "📦",
    children: [
      { name: "Mascotas", slug: "otros-mascotas" },
      { name: "Oficina y papelería", slug: "otros-oficina" },
      { name: "Bricolaje", slug: "otros-bricolaje" },
    ],
  },
];

export const NOTIFY_KINDS = {
  like: "Favoritos",
  comment: "Comentarios",
  offer: "Ofertas",
  order: "Compras y ventas",
  message: "Mensajes",
  review: "Valoraciones",
  news: "Novedades de Mercado",
  follow: "Seguidores",
} as const;

export const ORDER_STEPS = [
  { value: "paid", label: "Pago confirmado" },
  { value: "shipped", label: "Enviado" },
  { value: "received", label: "Recibido" },
  { value: "done", label: "Transacción finalizada" },
] as const;

export function shippingCostOf(method: string): number {
  const found = SHIPPING_METHODS.find((m) => m.value === method);
  if (!found || !found.cost.length) return 0;
  return Math.round(found.cost[0].price);
}

export function shippingLabel(method: string): string {
  return SHIPPING_METHODS.find((m) => m.value === method)?.label ?? "Por determinar";
}

export function conditionLabel(value: number): string {
  return CONDITIONS.find((c) => c.value === value)?.label ?? "Sin especificar";
}

export function shipDaysLabel(value: number): string {
  return SHIP_DAYS.find((d) => d.value === value)?.label ?? "En 1-2 días";
}

export function paymentLabel(value: string): string {
  return PAYMENT_METHODS.find((p) => p.value === value)?.label ?? value;
}
