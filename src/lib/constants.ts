export const SITE_NAME = "Mercado";
export const SITE_TAGLINE = "Compra y vende fácil, rápido y seguro";
export const SITE_COUNTRY = "México";
export const SUPPORT_EMAIL = "ayuda@mercado.mx";
export const FEE_RATE = 0.1; // comisión por venta del 10 %
export const MIN_PRICE = 30;
export const MAX_PRICE = 999_999;
export const MIN_PAYOUT = 300;
export const PAYOUT_FEE = 25;
export const CASH_FEE = 12;
export const MSI_MIN = 2_000; // monto mínimo para meses sin intereses

export type ConditionValue = 1 | 2 | 3 | 4 | 5 | 6;

export const CONDITIONS: { value: ConditionValue; label: string; hint: string }[] = [
  { value: 1, label: "Nuevo, sin usar", hint: "Sin abrir, con etiqueta o sello original" },
  { value: 2, label: "Como nuevo", hint: "Usado una o dos veces, sin marcas" },
  { value: 3, label: "Buen estado", hint: "Señales de uso mínimas" },
  { value: 4, label: "Estado aceptable", hint: "Se notan marcas o desgaste" },
  { value: 5, label: "Con detalles", hint: "Manchas, rasgaduras o piezas dañadas" },
  { value: 6, label: "Para partes o no funciona", hint: "Necesita reparación" },
];

export const SHIPPING_PAYERS = [
  { value: "seller", label: "Envío gratis (lo paga quien vende)", short: "Envío gratis" },
  { value: "buyer", label: "Lo paga quien compra", short: "Envío por cuenta del comprador" },
] as const;

export const SHIPPING_METHODS = [
  {
    value: "facil",
    label: "Envío Fácil Mercado",
    hint: "Guía prepagada con rastreo y seguro. Entrega en punto de recolección.",
    cost: [
      { max: 1, price: 79 },
      { max: 5, price: 129 },
      { max: 25, price: 249 },
    ],
  },
  {
    value: "comodo",
    label: "Envío Cómodo Mercado",
    hint: "Recolección a domicilio con rastreo. Entrega en 2 a 4 días hábiles.",
    cost: [
      { max: 2, price: 99 },
      { max: 10, price: 179 },
      { max: 25, price: 299 },
    ],
  },
  { value: "correo", label: "Correo nacional", hint: "Económico, sin rastreo ni seguro.", cost: [] },
  { value: "certificado", label: "Correo certificado", hint: "Con número de rastreo básico.", cost: [] },
  { value: "paqueteria", label: "Paquetería de tu elección", hint: "Tú contratas la guía con la paquetería que prefieras.", cost: [] },
  { value: "mano", label: "Entrega en persona", hint: "Se acuerda un punto de encuentro seguro.", cost: [] },
  { value: "indefinido", label: "Lo defino al vender", hint: "Se acuerda después de la compra.", cost: [] },
] as const;

export const SHIP_DAYS = [
  { value: 1, label: "En 1 o 2 días hábiles" },
  { value: 2, label: "En 2 o 3 días hábiles" },
  { value: 3, label: "En 4 a 7 días hábiles" },
] as const;

export const REGIONS = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
  "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México",
  "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit",
  "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
  "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán",
  "Zacatecas",
];

export const PAYMENT_METHODS = [
  { value: "card", label: "Tarjeta de crédito o débito", hint: "Hasta 12 meses sin intereses en compras desde $2,000" },
  { value: "msi", label: "Meses sin intereses", hint: "3, 6, 9 o 12 MSI con tarjetas participantes" },
  { value: "cash", label: "Pago en efectivo en tiendas", hint: `Tiendas de conveniencia y farmacias · comisión de $${CASH_FEE}` },
  { value: "spei", label: "Transferencia SPEI", hint: "Te damos una CLABE para transferir desde tu banco" },
  { value: "balance", label: "Saldo y puntos de Mercado", hint: "Usa el dinero de tus ventas" },
  { value: "paypal", label: "PayPal", hint: "Con protección al comprador" },
] as const;

export const MSI_PLANS = [3, 6, 9, 12] as const;

export const SORTS = [
  { value: "new", label: "Más recientes" },
  { value: "old", label: "Más antiguos" },
  { value: "price_asc", label: "Menor precio" },
  { value: "price_desc", label: "Mayor precio" },
  { value: "likes", label: "Más favoritos" },
] as const;

export const STATUS_FILTERS = [
  { value: "all", label: "Todo" },
  { value: "on_sale", label: "Disponible" },
  { value: "sold", label: "Vendido" },
] as const;

export const SELLER_FILTERS = [
  { value: "all", label: "Todo Mercado" },
  { value: "shop", label: "Solo Mercado Shops" },
  { value: "person", label: "Solo personas" },
] as const;

export const SIZES = [
  "XCH", "CH", "M", "G", "XG", "XXG", "Talla única",
  "24", "26", "28", "30", "32", "34", "36", "38", "40", "42",
  "22 cm", "23 cm", "24 cm", "25 cm", "26 cm", "27 cm", "28 cm", "29 cm",
];

export const BRANDS = [
  "Zara", "Nike", "Adidas", "Apple", "Samsung", "Sony", "Nintendo", "LEGO",
  "Mango", "H&M", "Uniqlo", "Pull&Bear", "Bershka", "Levi's", "The North Face",
  "Chanel", "Louis Vuitton", "Gucci", "Michael Kors", "Coach", "Xiaomi", "Motorola",
  "Huawei", "Lenovo", "Canon", "Dyson", "Puma", "New Balance", "Converse", "Vans",
  "Andrea", "Flexi", "Sin marca",
];

/* ---------------------------------- Shops --------------------------------- */

export const SHOP_CATEGORIES = [
  "Moda y accesorios", "Electrónica y tecnología", "Hogar y muebles",
  "Belleza y cuidado personal", "Juguetes y coleccionables", "Deportes y aire libre",
  "Artesanías y hecho a mano", "Alimentos y abarrotes", "Papelería y oficina",
  "Mascotas", "Otros giros",
];

export const BUSINESS_TYPES = [
  { value: "persona_fisica", label: "Persona física con actividad empresarial" },
  { value: "persona_moral", label: "Persona moral (empresa)" },
] as const;

export const SHOP_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "En revisión", className: "bg-canvas text-muted" },
  active: { label: "Activa", className: "bg-brand-soft text-brand-darker" },
  suspended: { label: "Suspendida", className: "bg-red-50 text-red-600" },
};

export const RETURN_POLICIES = [
  "Aceptamos devoluciones dentro de los 7 días naturales posteriores a la entrega.",
  "Aceptamos cambios por talla dentro de los 15 días naturales posteriores a la entrega.",
  "Solo aceptamos devoluciones por producto defectuoso o equivocado.",
  "No aceptamos devoluciones salvo lo previsto por la Ley Federal de Protección al Consumidor.",
];

export const NOTIFY_KINDS = {
  like: "Favoritos",
  comment: "Comentarios",
  offer: "Ofertas",
  order: "Compras y ventas",
  message: "Mensajes",
  review: "Calificaciones",
  news: "Novedades de Mercado",
  follow: "Seguidores",
  shop: "Mercado Shops",
} as const;

export const ORDER_STEPS = [
  { value: "paid", label: "Pago confirmado" },
  { value: "shipped", label: "Enviado" },
  { value: "received", label: "Recibido" },
  { value: "done", label: "Compra finalizada" },
] as const;

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
      { name: "Playeras y tops", slug: "mujer-playeras", children: [
        { name: "Playeras de manga corta", slug: "mujer-playeras-corta" },
        { name: "Playeras de manga larga", slug: "mujer-playeras-larga" },
        { name: "Blusas y camisas", slug: "mujer-blusas" },
      ]},
      { name: "Chamarras y abrigos", slug: "mujer-chamarras", children: [
        { name: "Abrigos", slug: "mujer-chamarras-abrigo" },
        { name: "Chamarras de mezclilla", slug: "mujer-chamarras-mezclilla" },
        { name: "Chamarras acolchadas", slug: "mujer-chamarras-acolchada" },
      ]},
      { name: "Pantalones", slug: "mujer-pantalones", children: [
        { name: "Jeans", slug: "mujer-pantalones-jeans" },
        { name: "Pantalones de vestir", slug: "mujer-pantalones-vestir" },
        { name: "Shorts", slug: "mujer-pantalones-shorts" },
      ]},
      { name: "Faldas y vestidos", slug: "mujer-vestidos", children: [
        { name: "Vestidos", slug: "mujer-vestidos-vestido" },
        { name: "Faldas", slug: "mujer-vestidos-falda" },
      ]},
      { name: "Calzado", slug: "mujer-calzado", children: [
        { name: "Tenis", slug: "mujer-calzado-tenis" },
        { name: "Botas", slug: "mujer-calzado-botas" },
        { name: "Zapatillas de tacón", slug: "mujer-calzado-tacon" },
      ]},
      { name: "Bolsas", slug: "mujer-bolsas", children: [
        { name: "Bolsas de mano", slug: "mujer-bolsas-mano" },
        { name: "Mochilas", slug: "mujer-bolsas-mochilas" },
        { name: "Bolsas cruzadas", slug: "mujer-bolsas-cruzada" },
      ]},
      { name: "Joyería y accesorios", slug: "mujer-accesorios", children: [
        { name: "Collares", slug: "mujer-accesorios-collares" },
        { name: "Relojes", slug: "mujer-accesorios-relojes" },
        { name: "Lentes de sol", slug: "mujer-accesorios-lentes" },
      ]},
    ],
  },
  {
    name: "Hombre", slug: "hombre", icon: "👔",
    children: [
      { name: "Playeras y camisas", slug: "hombre-playeras", children: [
        { name: "Playeras", slug: "hombre-playeras-playera" },
        { name: "Camisas", slug: "hombre-playeras-camisa" },
        { name: "Sudaderas", slug: "hombre-playeras-sudadera" },
      ]},
      { name: "Chamarras y abrigos", slug: "hombre-chamarras", children: [
        { name: "Chamarras", slug: "hombre-chamarras-chamarra" },
        { name: "Abrigos", slug: "hombre-chamarras-abrigo" },
      ]},
      { name: "Pantalones", slug: "hombre-pantalones", children: [
        { name: "Jeans", slug: "hombre-pantalones-jeans" },
        { name: "Pantalones casuales", slug: "hombre-pantalones-casual" },
      ]},
      { name: "Calzado", slug: "hombre-calzado", children: [
        { name: "Tenis", slug: "hombre-calzado-tenis" },
        { name: "Zapatos de vestir", slug: "hombre-calzado-vestir" },
      ]},
      { name: "Relojes y accesorios", slug: "hombre-accesorios", children: [
        { name: "Relojes", slug: "hombre-accesorios-relojes" },
        { name: "Cinturones", slug: "hombre-accesorios-cinturones" },
      ]},
    ],
  },
  {
    name: "Bebés y niños", slug: "bebes", icon: "🧸",
    children: [
      { name: "Ropa de bebé (0-24 meses)", slug: "bebes-ropa", children: [
        { name: "Mamelucos", slug: "bebes-ropa-mamelucos" },
        { name: "Conjuntos", slug: "bebes-ropa-conjuntos" },
      ]},
      { name: "Ropa de niña y niño", slug: "bebes-nino", children: [
        { name: "Playeras", slug: "bebes-nino-playeras" },
        { name: "Pantalones", slug: "bebes-nino-pantalones" },
      ]},
      { name: "Carriolas y autoasientos", slug: "bebes-carriolas", children: [
        { name: "Carriolas", slug: "bebes-carriolas-carriola" },
        { name: "Autoasientos", slug: "bebes-carriolas-autoasiento" },
      ]},
      { name: "Juguetes infantiles", slug: "bebes-juguetes" },
    ],
  },
  {
    name: "Hogar y muebles", slug: "hogar", icon: "🛋️",
    children: [
      { name: "Muebles", slug: "hogar-muebles", children: [
        { name: "Sillas", slug: "hogar-muebles-sillas" },
        { name: "Mesas", slug: "hogar-muebles-mesas" },
        { name: "Libreros y repisas", slug: "hogar-muebles-libreros" },
      ]},
      { name: "Cocina y comedor", slug: "hogar-cocina", children: [
        { name: "Vajilla", slug: "hogar-cocina-vajilla" },
        { name: "Electrodomésticos pequeños", slug: "hogar-cocina-electro" },
      ]},
      { name: "Decoración", slug: "hogar-decoracion" },
      { name: "Blancos y ropa de cama", slug: "hogar-blancos" },
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
        { name: "Discos de vinilo", slug: "libros-musica-vinilo" },
      ]},
      { name: "Videojuegos", slug: "libros-videojuegos", children: [
        { name: "Nintendo Switch", slug: "libros-videojuegos-switch" },
        { name: "PlayStation", slug: "libros-videojuegos-ps" },
        { name: "Consolas", slug: "libros-videojuegos-consolas" },
      ]},
    ],
  },
  {
    name: "Juguetes y coleccionables", slug: "juguetes", icon: "🎮",
    children: [
      { name: "Figuras y coleccionables", slug: "juguetes-figuras" },
      { name: "Cartas coleccionables", slug: "juguetes-cartas" },
      { name: "LEGO y armables", slug: "juguetes-lego" },
      { name: "Instrumentos musicales", slug: "juguetes-instrumentos" },
    ],
  },
  {
    name: "Belleza y cuidado personal", slug: "belleza", icon: "💄",
    children: [
      { name: "Maquillaje", slug: "belleza-maquillaje" },
      { name: "Cuidado de la piel", slug: "belleza-piel" },
      { name: "Perfumes", slug: "belleza-perfumes" },
      { name: "Cuidado del cabello", slug: "belleza-cabello" },
    ],
  },
  {
    name: "Electrónica y celulares", slug: "electronica", icon: "📱",
    children: [
      { name: "Celulares y tablets", slug: "electronica-celulares", children: [
        { name: "Celulares", slug: "electronica-celulares-celular" },
        { name: "Tablets", slug: "electronica-celulares-tablet" },
        { name: "Accesorios", slug: "electronica-celulares-accesorios" },
      ]},
      { name: "Computadoras", slug: "electronica-computadoras", children: [
        { name: "Laptops", slug: "electronica-computadoras-laptop" },
        { name: "Periféricos", slug: "electronica-computadoras-perifericos" },
      ]},
      { name: "Cámaras", slug: "electronica-camaras", children: [
        { name: "Cámaras réflex", slug: "electronica-camaras-reflex" },
        { name: "Lentes", slug: "electronica-camaras-lentes" },
      ]},
      { name: "Audio y TV", slug: "electronica-audio", children: [
        { name: "Audífonos", slug: "electronica-audio-audifonos" },
        { name: "Bocinas", slug: "electronica-audio-bocinas" },
      ]},
    ],
  },
  {
    name: "Deportes y aire libre", slug: "deportes", icon: "⚽",
    children: [
      { name: "Ciclismo", slug: "deportes-ciclismo" },
      { name: "Fitness y gimnasio", slug: "deportes-fitness" },
      { name: "Camping y montaña", slug: "deportes-camping" },
      { name: "Fútbol y jerseys", slug: "deportes-futbol" },
    ],
  },
  { name: "Hecho a mano", slug: "handmade", icon: "🧶",
    children: [
      { name: "Accesorios artesanales", slug: "handmade-accesorios" },
      { name: "Velas y jabones", slug: "handmade-velas" },
      { name: "Papelería creativa", slug: "handmade-papeleria" },
    ],
  },
  { name: "Boletos", slug: "boletos", icon: "🎟️",
    children: [
      { name: "Conciertos", slug: "boletos-conciertos" },
      { name: "Deportes", slug: "boletos-deportes" },
      { name: "Cine y teatro", slug: "boletos-cine" },
    ],
  },
  { name: "Autos y motos", slug: "motor", icon: "🏍️",
    children: [
      { name: "Refacciones de auto", slug: "motor-refacciones" },
      { name: "Accesorios de moto", slug: "motor-moto" },
      { name: "Cascos", slug: "motor-cascos" },
    ],
  },
  { name: "Otros", slug: "otros", icon: "📦",
    children: [
      { name: "Mascotas", slug: "otros-mascotas" },
      { name: "Oficina y papelería", slug: "otros-oficina" },
      { name: "Herramientas y bricolaje", slug: "otros-herramientas" },
    ],
  },
];

export function shippingCostOf(method: string): number {
  const found = SHIPPING_METHODS.find((m) => m.value === method);
  if (!found || !found.cost.length) return 0;
  return Math.round(found.cost[0].price);
}

export function shippingLabel(method: string): string {
  return SHIPPING_METHODS.find((m) => m.value === method)?.label ?? "Por definir";
}

export function conditionLabel(value: number): string {
  return CONDITIONS.find((c) => c.value === value)?.label ?? "Sin especificar";
}

export function shipDaysLabel(value: number): string {
  return SHIP_DAYS.find((d) => d.value === value)?.label ?? "En 1 o 2 días hábiles";
}

export function paymentLabel(value: string): string {
  return PAYMENT_METHODS.find((p) => p.value === value)?.label ?? value;
}

export function businessTypeLabel(value: string): string {
  return BUSINESS_TYPES.find((b) => b.value === value)?.label ?? value;
}

/* ---------------------- Red de negocios (B2B y colectivos) ------------------- */

/** Comisión de Mercado en las ventas de mayoreo entre tiendas. */
export const B2B_FEE_RATE = 0.05;
/** Piezas mínimas para poder comprar en mayoreo. */
export const B2B_MIN_QTY = 3;

/** Costo por paquete dentro de un envío consolidado, por método. */
export const CONSOLIDATED_UNIT_COST: Record<string, number> = {
  facil: 49,
  comodo: 65,
  paqueteria: 59,
};

/**
 * Adelanto de saldo sobre ventas en curso.
 * La comisión es fija por operación, pero se informa siempre su costo anual
 * equivalente (CAT aproximado) para que se pueda comparar con otros créditos.
 */
export const ADVANCE_FEE_RATE = 0.05;
export const ADVANCE_MIN = 500;
/** Tope absoluto por operación, para que un negocio pequeño no se sobreendeude. */
export const ADVANCE_MAX_AMOUNT = 20_000;
/** Plazo máximo antes de considerar el adelanto vencido. */
export const ADVANCE_DUE_DAYS = 60;
/** Horizonte por defecto si la tienda aún no tiene ventas completadas. */
export const ADVANCE_DEFAULT_HORIZON = 30;

/** Escalones de riesgo: a más historial y mejor cumplimiento, mayor porcentaje. */
export const ADVANCE_TIERS = [
  { key: "inicial", label: "Inicial", rate: 0.4, minCompleted: 3 },
  { key: "establecida", label: "Establecida", rate: 0.55, minCompleted: 10 },
  { key: "consolidada", label: "Consolidada", rate: 0.7, minCompleted: 25 },
] as const;

/** Requisitos mínimos para poder solicitar un adelanto. */
export const ADVANCE_REQUIREMENTS = {
  minCompletedOrders: 3,
  minShopAgeDays: 30,
  maxCancellationRate: 0.2,
  requiresVerifiedIdentity: true,
} as const;

export function advanceApr(feeRate: number, horizonDays: number): number {
  const days = Math.max(7, horizonDays);
  return Math.round(feeRate * (365 / days) * 1000) / 10; // porcentaje con un decimal
}

export const PARTNER_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Solicitud enviada", className: "bg-canvas text-muted" },
  approved: { label: "Aprobada", className: "bg-brand-soft text-brand-darker" },
  rejected: { label: "Rechazada", className: "bg-red-50 text-red-600" },
};

export const SHIPMENT_STATUS: Record<string, { label: string; className: string }> = {
  open: { label: "En preparación", className: "bg-canvas text-muted" },
  picked_up: { label: "Recolectado", className: "bg-brand-soft text-brand-darker" },
  closed: { label: "Entregado", className: "bg-canvas text-muted" },
};

export const CSV_TEMPLATE_HEADERS = [
  "sku", "titulo", "descripcion", "precio", "inventario", "categoria",
  "marca", "talla", "color", "variantes",
] as const;

export const CSV_TEMPLATE_EXAMPLE =
  "sku,titulo,descripcion,precio,inventario,categoria,marca,talla,color,variantes\n" +
  "BLU-001,Blusa de manta bordada,Bordada a mano en Puebla,690,18,mujer-blusas,Sin marca,M,Blanco,Talla CH:6|Talla M:8|Talla G:4\n" +
  "VEL-010,Vela de soya con copal,Cera de soya 100%,240,40,handmade-velas,Sin marca,,Natural,\n";
