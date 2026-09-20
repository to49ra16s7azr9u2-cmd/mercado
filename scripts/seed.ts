/**
 * Genera la base de datos de demostración de Mercado.
 * Uso: npm run seed  (borra y recrea data/mercado.db)
 */
import { DatabaseSync } from "node:sqlite";
import { scryptSync, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "data", "mercado.db");
fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
for (const suffix of ["", "-wal", "-shm"]) {
  try { fs.unlinkSync(DB_PATH + suffix); } catch {}
}

const db = new DatabaseSync(DB_PATH);
db.exec(fs.readFileSync(path.join(ROOT, "src", "db", "schema.sql"), "utf8"));

/* ------------------------------ utilidades ------------------------------ */

let counter = 0;
const id = (p: string) => `${p}${(++counter).toString(36)}${randomUUID().slice(0, 6)}`;
const hash = (pw: string) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
};
let rngState = 987654321;
const rnd = () => ((rngState = (rngState * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length) % arr.length];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000 - int(0, 8000000)).toISOString();

/* ------------------------------ categorías ------------------------------ */

type Node = { name: string; slug: string; icon?: string; children?: Node[] };
const treeSource = fs.readFileSync(path.join(ROOT, "src", "lib", "constants.ts"), "utf8");
const treeJson = treeSource
  .slice(treeSource.indexOf("export const CATEGORY_TREE"))
  .replace(/^[^[]*/, "")
  .slice(0, treeSource.slice(treeSource.indexOf("export const CATEGORY_TREE")).replace(/^[^[]*/, "").indexOf("\n];") + 2);
const CATEGORY_TREE: Node[] = eval(treeJson);

const catIdBySlug = new Map<string, number>();
let catId = 0;
const insertCat = db.prepare(
  "INSERT INTO categories (id, parent_id, name, slug, icon, level, sort) VALUES (?,?,?,?,?,?,?)",
);
function walk(nodes: Node[], parent: number | null, level: number) {
  nodes.forEach((node, index) => {
    const myId = ++catId;
    catIdBySlug.set(node.slug, myId);
    insertCat.run(myId, parent, node.name, node.slug, node.icon ?? "", level, index);
    if (node.children) walk(node.children, myId, level + 1);
  });
}
walk(CATEGORY_TREE, null, 0);

/* -------------------------------- marcas -------------------------------- */

const BRANDS = [
  "Zara", "Nike", "Adidas", "Apple", "Samsung", "Sony", "Nintendo", "LEGO",
  "Mango", "H&M", "Uniqlo", "Pull&Bear", "Bershka", "Levi's", "The North Face",
  "Chanel", "Louis Vuitton", "Gucci", "Michael Kors", "Coach", "Xiaomi", "Motorola",
  "Huawei", "Lenovo", "Canon", "Dyson", "Puma", "New Balance", "Converse", "Vans",
  "Andrea", "Flexi", "IKEA", "Sin marca",
];
const brandIdByName = new Map<string, number>();
const insertBrand = db.prepare("INSERT INTO brands (id, name) VALUES (?, ?)");
BRANDS.forEach((name, i) => {
  insertBrand.run(i + 1, name);
  brandIdByName.set(name, i + 1);
});

/* ------------------------------- usuarios ------------------------------- */

const REGIONS = [
  "Ciudad de México", "Jalisco", "Nuevo León", "Puebla", "Querétaro", "Yucatán",
  "Baja California", "Guanajuato", "Estado de México", "Quintana Roo",
];
const CITIES: Record<string, string> = {
  "Ciudad de México": "Benito Juárez", Jalisco: "Guadalajara", "Nuevo León": "Monterrey",
  Puebla: "Puebla", Querétaro: "Querétaro", Yucatán: "Mérida", "Baja California": "Tijuana",
  Guanajuato: "León", "Estado de México": "Toluca", "Quintana Roo": "Cancún",
};
const COLONIAS = ["Del Valle", "Roma Norte", "Americana", "San Pedro", "Centro", "Chapalita", "Polanco", "Juárez"];

const PEOPLE = [
  ["Lucía Hernández", "lucia_hdz", "Vendo ropa que ya no uso. Envío el mismo día de lunes a viernes 📦"],
  ["Carlos Ramírez", "carlos_rmz", "Coleccionista de videojuegos retro. Todo probado y funcionando."],
  ["Mariana Ortega", "mariana_o", "Siempre estoy limpiando el clóset. ¡Acepto ofertas razonables!"],
  ["Javier Serrano", "javi_serrano", "Fotografía y electrónica. Con factura y caja original."],
  ["Elena Navarro", "elena_nav", "Ropa de bebé y juguetes en muy buen estado. Casa sin humo."],
  ["Diego Molina", "diego_mol", "Deporte, bici y montaña. Pregunta sin compromiso."],
  ["Paulina Castro", "pau_castro", "Hecho a mano con mucho cariño ✨"],
  ["Andrés Gil", "andres_gil", "Libros, vinilos y cómics. Envío por paquetería con guía."],
  ["Nuria Sánchez", "nuria_sanchez", "Maquillaje sellado y perfumes originales."],
  ["Hugo Delgado", "hugo_delgado", "Muebles y decoración. Entrega en persona en CDMX."],
  ["Sofía Iglesias", "sofia_ig", "Vintage y segunda mano con historia."],
  ["Pablo Vargas", "pablo_vargas", "Tecnología revisada. Contesto rapidísimo 😊"],
];

const insertUser = db.prepare(
  `INSERT INTO users (id, email, password_hash, name, handle, avatar_seed, bio, balance, points,
    is_verified, addr_name, addr_zip, addr_region, addr_city, addr_line, addr_phone, created_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
);

const users: { id: string; name: string; handle: string }[] = [];

function addUser(name: string, handle: string, bio: string, email: string, password: string, verified = 1) {
  const uid = id("u_");
  const region = pick(REGIONS);
  insertUser.run(
    uid, email, hash(password), name, handle, String(users.length % 12), bio,
    int(0, 6400), int(0, 500), verified, name, String(int(1000, 97999)).padStart(5, "0"),
    region, CITIES[region],
    `Av. ${pick(["Insurgentes", "Reforma", "Juárez", "Revolución", "Universidad", "Hidalgo"])} ${int(20, 1800)}, Col. ${pick(COLONIAS)}, int. ${int(1, 30)}`,
    `${pick(["55", "33", "81", "222", "999"])}${int(1000000, 9999999)}`, daysAgo(int(200, 800)),
  );
  users.push({ id: uid, name, handle });
  return uid;
}

const demoId = addUser("Ana Demo", "ana_demo", "Cuenta de demostración de Mercado. ¡Prueba a comprar y a vender!", "demo@mercado.mx", "demo1234");
for (const [name, handle, bio] of PEOPLE) {
  addUser(name, handle, bio, `${handle}@mercado.mx`, "mercado1234");
}

db.prepare("INSERT INTO cards (id, user_id, brand, last4, exp, holder, is_default, created_at) VALUES (?,?,?,?,?,?,1,?)")
  .run(id("cd_"), demoId, "Visa", "4242", "12/29", "ANA DEMO", daysAgo(120));
db.prepare("UPDATE users SET balance = 2960, points = 620 WHERE id = ?").run(demoId);

/* -------------------------------- catálogo ------------------------------- */

type Product = { t: string; e: string; cat: string; brand?: string; min: number; max: number; size?: string[] };

const CATALOG: Product[] = [
  { t: "Vestido midi floreado", e: "👗", cat: "mujer-vestidos-vestido", brand: "Zara", min: 180, max: 700, size: ["CH", "M", "G"] },
  { t: "Vestido negro de fiesta", e: "👗", cat: "mujer-vestidos-vestido", brand: "Mango", min: 250, max: 1200, size: ["XCH", "CH", "M"] },
  { t: "Falda plisada midi", e: "🩱", cat: "mujer-vestidos-falda", brand: "Bershka", min: 120, max: 500, size: ["CH", "M"] },
  { t: "Playera básica de algodón", e: "👚", cat: "mujer-playeras-corta", brand: "H&M", min: 60, max: 240, size: ["CH", "M", "G"] },
  { t: "Blusa de seda con moño", e: "👚", cat: "mujer-blusas", brand: "Zara", min: 200, max: 900, size: ["CH", "M"] },
  { t: "Camisa oversize de rayas", e: "👔", cat: "mujer-blusas", brand: "Pull&Bear", min: 140, max: 560, size: ["M", "G"] },
  { t: "Abrigo largo de paño", e: "🧥", cat: "mujer-chamarras-abrigo", brand: "Mango", min: 500, max: 2400, size: ["CH", "M", "G"] },
  { t: "Chamarra de mezclilla oversize", e: "🧥", cat: "mujer-chamarras-mezclilla", brand: "Levi's", min: 360, max: 1400, size: ["M", "G"] },
  { t: "Chamarra acolchada ligera", e: "🧥", cat: "mujer-chamarras-acolchada", brand: "Uniqlo", min: 400, max: 1700, size: ["CH", "M"] },
  { t: "Jeans mom fit tiro alto", e: "👖", cat: "mujer-pantalones-jeans", brand: "Levi's", min: 240, max: 1100, size: ["26", "28", "30"] },
  { t: "Pantalón de vestir recto", e: "👖", cat: "mujer-pantalones-vestir", brand: "Zara", min: 160, max: 700, size: ["28", "30", "32"] },
  { t: "Tenis blancos de piel", e: "👟", cat: "mujer-calzado-tenis", brand: "Adidas", min: 400, max: 1600, size: ["24 cm", "25 cm", "26 cm"] },
  { t: "Botas altas de caña ancha", e: "👢", cat: "mujer-calzado-botas", brand: "Andrea", min: 440, max: 1800, size: ["23 cm", "24 cm", "25 cm"] },
  { t: "Zapatillas de tacón medio", e: "👠", cat: "mujer-calzado-tacon", brand: "Flexi", min: 240, max: 1100, size: ["23 cm", "24 cm"] },
  { t: "Bolsa cruzada acolchada", e: "👜", cat: "mujer-bolsas-cruzada", brand: "Bershka", min: 160, max: 800 },
  { t: "Bolsa tote de piel", e: "👜", cat: "mujer-bolsas-mano", brand: "Coach", min: 600, max: 3200 },
  { t: "Mochila urbana impermeable", e: "🎒", cat: "mujer-bolsas-mochilas", brand: "The North Face", min: 500, max: 1900 },
  { t: "Collar de plata .925", e: "📿", cat: "mujer-accesorios-collares", brand: "Sin marca", min: 160, max: 900 },
  { t: "Reloj analógico dorado", e: "⌚", cat: "mujer-accesorios-relojes", brand: "Michael Kors", min: 300, max: 2400 },
  { t: "Lentes de sol de pasta", e: "🕶️", cat: "mujer-accesorios-lentes", brand: "Sin marca", min: 200, max: 1800 },

  { t: "Playera de algodón orgánico", e: "👕", cat: "hombre-playeras-playera", brand: "Uniqlo", min: 80, max: 360, size: ["M", "G", "XG"] },
  { t: "Camisa oxford slim fit", e: "👔", cat: "hombre-playeras-camisa", brand: "Zara", min: 200, max: 900, size: ["M", "G"] },
  { t: "Sudadera con gorro", e: "🧥", cat: "hombre-playeras-sudadera", brand: "Nike", min: 300, max: 1200, size: ["M", "G", "XG"] },
  { t: "Chamarra bomber", e: "🧥", cat: "hombre-chamarras-chamarra", brand: "Pull&Bear", min: 300, max: 1300, size: ["M", "G"] },
  { t: "Abrigo de lana clásico", e: "🧥", cat: "hombre-chamarras-abrigo", brand: "Zara", min: 600, max: 2800, size: ["G", "XG"] },
  { t: "Jeans slim lavado oscuro", e: "👖", cat: "hombre-pantalones-jeans", brand: "Levi's", min: 300, max: 1300, size: ["30", "32", "34"] },
  { t: "Pantalón chino beige", e: "👖", cat: "hombre-pantalones-casual", brand: "Zara", min: 180, max: 700, size: ["32", "34"] },
  { t: "Tenis para correr", e: "👟", cat: "hombre-calzado-tenis", brand: "New Balance", min: 500, max: 2200, size: ["26 cm", "27 cm", "28 cm"] },
  { t: "Zapatos de vestir de piel", e: "👞", cat: "hombre-calzado-vestir", brand: "Flexi", min: 400, max: 1900, size: ["27 cm", "28 cm"] },
  { t: "Reloj automático de acero", e: "⌚", cat: "hombre-accesorios-relojes", brand: "Sin marca", min: 800, max: 6400 },
  { t: "Cinturón de piel reversible", e: "🪢", cat: "hombre-accesorios-cinturones", brand: "Sin marca", min: 160, max: 800 },

  { t: "Paquete de 5 mamelucos de algodón", e: "🧷", cat: "bebes-ropa-mamelucos", brand: "H&M", min: 100, max: 360 },
  { t: "Conjunto de punto para bebé", e: "🧦", cat: "bebes-ropa-conjuntos", brand: "Zara", min: 120, max: 500 },
  { t: "Playera infantil estampada", e: "👕", cat: "bebes-nino-playeras", brand: "H&M", min: 60, max: 240 },
  { t: "Pantalón de mezclilla infantil", e: "👖", cat: "bebes-nino-pantalones", brand: "Zara", min: 80, max: 320 },
  { t: "Carriola plegable", e: "🍼", cat: "bebes-carriolas-carriola", brand: "Sin marca", min: 900, max: 5600 },
  { t: "Autoasiento grupo 1/2/3", e: "🚗", cat: "bebes-carriolas-autoasiento", brand: "Sin marca", min: 700, max: 3600 },
  { t: "Lote de juguetes de madera", e: "🧸", cat: "bebes-juguetes", brand: "Sin marca", min: 160, max: 900 },

  { t: "Silla de escritorio ergonómica", e: "🪑", cat: "hogar-muebles-sillas", brand: "Sin marca", min: 500, max: 3200 },
  { t: "Mesa de centro de madera", e: "🪵", cat: "hogar-muebles-mesas", brand: "Sin marca", min: 600, max: 3800 },
  { t: "Librero de 4 repisas", e: "🗄️", cat: "hogar-muebles-libreros", brand: "IKEA", min: 400, max: 1800 },
  { t: "Vajilla de porcelana 12 piezas", e: "🍽️", cat: "hogar-cocina-vajilla", brand: "Sin marca", min: 300, max: 1400 },
  { t: "Procesador de alimentos", e: "🍲", cat: "hogar-cocina-electro", brand: "Sin marca", min: 900, max: 6400 },
  { t: "Aspiradora inalámbrica", e: "🧹", cat: "hogar-cocina-electro", brand: "Dyson", min: 1800, max: 8400 },
  { t: "Lámpara de mesa estilo nórdico", e: "💡", cat: "hogar-decoracion", brand: "IKEA", min: 160, max: 900 },
  { t: "Juego de sábanas matrimonial", e: "🛏️", cat: "hogar-blancos", brand: "Sin marca", min: 200, max: 900 },

  { t: "Pedro Páramo (pasta dura)", e: "📕", cat: "libros-libros-novela", brand: "Sin marca", min: 100, max: 440 },
  { t: "Lote de 10 novelas de bolsillo", e: "📚", cat: "libros-libros-novela", brand: "Sin marca", min: 160, max: 600 },
  { t: "Manga One Piece tomos 1-12", e: "📖", cat: "libros-libros-comic", brand: "Sin marca", min: 400, max: 1700 },
  { t: "Libro de texto de preparatoria", e: "📘", cat: "libros-libros-texto", brand: "Sin marca", min: 100, max: 600 },
  { t: "CD original de rock noventero", e: "💿", cat: "libros-musica-cd", brand: "Sin marca", min: 60, max: 360 },
  { t: "Disco de vinilo edición limitada", e: "🎵", cat: "libros-musica-vinilo", brand: "Sin marca", min: 240, max: 1300 },
  { t: "Juego para Nintendo Switch", e: "🎮", cat: "libros-videojuegos-switch", brand: "Nintendo", min: 300, max: 1100 },
  { t: "Control Pro inalámbrico", e: "🎮", cat: "libros-videojuegos-switch", brand: "Nintendo", min: 600, max: 1300 },
  { t: "Juego para PlayStation 5", e: "🕹️", cat: "libros-videojuegos-ps", brand: "Sony", min: 300, max: 1200 },
  { t: "Consola retro con 500 juegos", e: "🕹️", cat: "libros-videojuegos-consolas", brand: "Sin marca", min: 500, max: 2400 },

  { t: "Figura coleccionable de anime", e: "🗿", cat: "juguetes-figuras", brand: "Sin marca", min: 200, max: 1800 },
  { t: "Lote de cartas Pokémon", e: "🃏", cat: "juguetes-cartas", brand: "Sin marca", min: 160, max: 3000 },
  { t: "Set LEGO Creator sellado", e: "🧱", cat: "juguetes-lego", brand: "LEGO", min: 400, max: 3600 },
  { t: "Guitarra acústica con funda", e: "🎸", cat: "juguetes-instrumentos", brand: "Sin marca", min: 800, max: 4400 },

  { t: "Paleta de sombras sin abrir", e: "💄", cat: "belleza-maquillaje", brand: "Sin marca", min: 120, max: 800 },
  { t: "Sérum facial con vitamina C", e: "🧴", cat: "belleza-piel", brand: "Sin marca", min: 160, max: 900 },
  { t: "Perfume 100 ml sellado", e: "🌸", cat: "belleza-perfumes", brand: "Chanel", min: 700, max: 2800 },
  { t: "Secadora iónica profesional", e: "💇", cat: "belleza-cabello", brand: "Dyson", min: 1200, max: 7600 },

  { t: "iPhone 13 128 GB liberado", e: "📱", cat: "electronica-celulares-celular", brand: "Apple", min: 3600, max: 10400 },
  { t: "Samsung Galaxy S22 liberado", e: "📱", cat: "electronica-celulares-celular", brand: "Samsung", min: 3000, max: 8400 },
  { t: "Xiaomi Redmi Note 12", e: "📱", cat: "electronica-celulares-celular", brand: "Xiaomi", min: 1400, max: 3800 },
  { t: "iPad de 10.2 pulgadas Wi-Fi", e: "📲", cat: "electronica-celulares-tablet", brand: "Apple", min: 2400, max: 7600 },
  { t: "Funda con teclado para tablet", e: "⌨️", cat: "electronica-celulares-accesorios", brand: "Sin marca", min: 160, max: 900 },
  { t: "MacBook Air M1 256 GB", e: "💻", cat: "electronica-computadoras-laptop", brand: "Apple", min: 7000, max: 15600 },
  { t: "Monitor 27\" QHD 144 Hz", e: "🖥️", cat: "electronica-computadoras-perifericos", brand: "Samsung", min: 1800, max: 6400 },
  { t: "Teclado mecánico retroiluminado", e: "⌨️", cat: "electronica-computadoras-perifericos", brand: "Sin marca", min: 400, max: 2200 },
  { t: "Cámara réflex con lente 18-55", e: "📷", cat: "electronica-camaras-reflex", brand: "Canon", min: 2600, max: 10400 },
  { t: "Lente 50 mm f/1.8", e: "🔭", cat: "electronica-camaras-lentes", brand: "Canon", min: 1200, max: 3800 },
  { t: "Audífonos con cancelación de ruido", e: "🎧", cat: "electronica-audio-audifonos", brand: "Sony", min: 900, max: 5200 },
  { t: "AirPods Pro 2.ª generación", e: "🎧", cat: "electronica-audio-audifonos", brand: "Apple", min: 1800, max: 4400 },
  { t: "Bocina Bluetooth resistente al agua", e: "🔊", cat: "electronica-audio-bocinas", brand: "Sony", min: 500, max: 2600 },

  { t: "Bicicleta de ruta talla 54", e: "🚲", cat: "deportes-ciclismo", brand: "Sin marca", min: 2400, max: 15600 },
  { t: "Casco de ciclismo certificado", e: "🪖", cat: "deportes-ciclismo", brand: "Sin marca", min: 300, max: 1800 },
  { t: "Mancuernas ajustables 20 kg", e: "🏋️", cat: "deportes-fitness", brand: "Sin marca", min: 500, max: 2800 },
  { t: "Tapete de yoga antiderrapante", e: "🧘", cat: "deportes-fitness", brand: "Sin marca", min: 160, max: 700 },
  { t: "Casa de campaña para 3 personas", e: "⛺", cat: "deportes-camping", brand: "Sin marca", min: 600, max: 3200 },
  { t: "Jersey oficial de fútbol", e: "⚽", cat: "deportes-futbol", brand: "Nike", min: 300, max: 1500 },

  { t: "Aretes artesanales de arcilla", e: "🎨", cat: "handmade-accesorios", brand: "Sin marca", min: 100, max: 500 },
  { t: "Vela de soya aromática", e: "🕯️", cat: "handmade-velas", brand: "Sin marca", min: 120, max: 440 },
  { t: "Cuaderno encuadernado a mano", e: "📓", cat: "handmade-papeleria", brand: "Sin marca", min: 160, max: 600 },

  { t: "Boleto para concierto en CDMX", e: "🎫", cat: "boletos-conciertos", brand: "Sin marca", min: 500, max: 2400 },
  { t: "Boleto de fútbol Liga MX", e: "🏟️", cat: "boletos-deportes", brand: "Sin marca", min: 600, max: 3600 },
  { t: "Paquete de 5 boletos de cine", e: "🎬", cat: "boletos-cine", brand: "Sin marca", min: 300, max: 900 },

  { t: "Juego de plumillas limpiaparabrisas", e: "🚗", cat: "motor-refacciones", brand: "Sin marca", min: 160, max: 700 },
  { t: "Guantes de moto para verano", e: "🧤", cat: "motor-moto", brand: "Sin marca", min: 240, max: 1200 },
  { t: "Casco integral talla M", e: "🪖", cat: "motor-cascos", brand: "Sin marca", min: 800, max: 4400 },

  { t: "Transportadora para gato", e: "🐈", cat: "otros-mascotas", brand: "Sin marca", min: 200, max: 900 },
  { t: "Lote de artículos de oficina", e: "📎", cat: "otros-oficina", brand: "Sin marca", min: 100, max: 600 },
  { t: "Taladro percutor con maletín", e: "🔧", cat: "otros-herramientas", brand: "Sin marca", min: 500, max: 2600 },
];

const DESCRIPTIONS = [
  "Está en muy buen estado, casi no lo usé. Lo envío limpio y bien protegido.",
  "Lo compré hace poco pero no le doy uso. No tiene detalles ni marcas.",
  "Producto original. Acepto ofertas razonables, pero no lo regalo 🙂",
  "Lo vendo por falta de espacio en casa. Te mando más fotos si las necesitas.",
  "Funciona perfecto, lo revisé antes de publicarlo. Envío en 24 a 48 horas.",
  "Solo lo usé un par de veces. Guardado en casa sin humo ni mascotas.",
  "Tiene una señal mínima de uso que no se nota cuando lo traes puesto.",
  "El precio es negociable si te llevas varias cosas de mi perfil.",
];

const EXTRA = [
  "\n\n· Envío el mismo día si compras antes de las 3 pm.\n· Empaque reforzado.\n· Pregúntame lo que necesites en los comentarios.",
  "\n\nLas medidas aproximadas están en las fotos. Cualquier duda, escríbeme antes de comprar.",
  "\n\nNo acepto devoluciones por cambio de opinión, pero describo todo con honestidad.",
  "",
];

/* ------------------------------ artículos -------------------------------- */

const insertItem = db.prepare(
  `INSERT INTO items (id, seller_id, title, description, price, category_id, brand_id, size, color,
    condition, shipping_payer, shipping_method, ship_from, ship_days, offers_enabled, status, views,
    created_at, updated_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
);
const insertImage = db.prepare("INSERT INTO item_images (item_id, url, position) VALUES (?,?,?)");
const insertLike = db.prepare("INSERT OR IGNORE INTO likes (user_id, item_id, created_at) VALUES (?,?,?)");
const insertComment = db.prepare("INSERT INTO comments (id, item_id, user_id, body, created_at) VALUES (?,?,?,?,?)");

const COLORS = ["Negro", "Blanco", "Azul", "Verde", "Rojo", "Beige", "Gris", "Rosa", "Multicolor"];
const METHODS = ["facil", "facil", "comodo", "comodo", "certificado", "paqueteria", "mano"];

type Created = { id: string; sellerId: string; title: string; price: number };
const created: Created[] = [];

const variants = ["", " · edición 2024", " (como nuevo)", " en perfecto estado", " — lote", " original"];
let itemIndex = 0;

for (let round = 0; round < 2; round++) {
  for (const product of CATALOG) {
    itemIndex++;
    if (round === 1 && itemIndex % 3 !== 0) continue;
    const seller = users[int(1, users.length - 1)];
    const itemId = id("m");
    const price = int(product.min, product.max);
    const title = round === 0 ? product.t : product.t + pick(variants);
    const cat = catIdBySlug.get(product.cat)!;
    const description = pick(DESCRIPTIONS) + pick(EXTRA);
    const shippingPayer = rnd() > 0.28 ? "seller" : "buyer";
    const created_at = daysAgo(int(0, 120));
    const region = pick(REGIONS);
    insertItem.run(
      itemId, seller.id, title, description, price, cat,
      brandIdByName.get(product.brand ?? "Sin marca") ?? null,
      product.size ? pick(product.size) : "", pick(COLORS), int(1, 4), shippingPayer,
      pick(METHODS), region, int(1, 3), rnd() > 0.25 ? 1 : 0, "on_sale", int(3, 900),
      created_at, created_at,
    );
    const photos = int(1, 4);
    for (let p = 0; p < photos; p++) {
      insertImage.run(
        itemId,
        `/api/photo?seed=${encodeURIComponent(itemId + p)}&e=${encodeURIComponent(product.e)}&t=${encodeURIComponent(title.slice(0, 32))}`,
        p,
      );
    }
    for (const user of users) {
      if (user.id !== seller.id && rnd() > 0.82) insertLike.run(user.id, itemId, created_at);
    }
    if (rnd() > 0.72) {
      const asker = users[int(1, users.length - 1)];
      if (asker.id !== seller.id) {
        const question = pick([
          "¡Hola! ¿Sigue disponible?",
          "Qué tal, ¿aceptarías una oferta un poco más baja?",
          "¿Me pasas las medidas exactas, por favor?",
          "¿En cuánto tiempo lo envías?",
          "¿Tiene algún detalle que no se vea en las fotos?",
        ]);
        const qTime = daysAgo(int(0, 20));
        insertComment.run(id("cm_"), itemId, asker.id, question, qTime);
        insertComment.run(
          id("cm_"), itemId, seller.id,
          pick([
            "¡Hola! Sí, sigue disponible 😊",
            "Qué tal, lo envío en menos de 24 horas desde que se compra.",
            "Ya agregué una foto más con las medidas. ¡Gracias por tu interés!",
            "Sí puedo ajustar un poco el precio, mándame tu oferta.",
            "Está impecable, no tiene ningún detalle.",
          ]),
          new Date(new Date(qTime).getTime() + 3600000).toISOString(),
        );
      }
    }
    created.push({ id: itemId, sellerId: seller.id, title, price });
  }
}

/* ------------------- artículos y actividad de la cuenta demo ------------------ */

const demoProducts = CATALOG.slice(0, 4);
const demoItems: Created[] = [];
demoProducts.forEach((product, i) => {
  const itemId = id("m");
  const price = int(product.min, product.max);
  const created_at = daysAgo(i * 4 + 1);
  insertItem.run(
    itemId, demoId, `${product.t} · publicado por Ana`, pick(DESCRIPTIONS), price,
    catIdBySlug.get(product.cat)!, brandIdByName.get(product.brand ?? "Sin marca") ?? null,
    product.size ? pick(product.size) : "", pick(COLORS), int(1, 3), "seller", "facil",
    "Ciudad de México", 1, 1, "on_sale", int(20, 400), created_at, created_at,
  );
  insertImage.run(itemId, `/api/photo?seed=${encodeURIComponent(itemId)}&e=${encodeURIComponent(product.e)}&t=${encodeURIComponent(product.t.slice(0, 32))}`, 0);
  demoItems.push({ id: itemId, sellerId: demoId, title: product.t, price });
});

// borrador
const draftId = id("m");
insertItem.run(
  draftId, demoId, "Chamarra de mezclilla (borrador)", "Pendiente de agregar fotos y medidas.", 0,
  catIdBySlug.get("mujer-chamarras-mezclilla")!, brandIdByName.get("Levi's")!, "M", "Azul", 2,
  "seller", "facil", "Ciudad de México", 1, 1, "draft", 0, daysAgo(2), daysAgo(2),
);

// favoritos, historial y seguimientos de la cuenta demo
for (const item of created.slice(0, 14)) insertLike.run(demoId, item.id, daysAgo(int(0, 20)));
const insertHistory = db.prepare("INSERT OR REPLACE INTO history (user_id, item_id, viewed_at) VALUES (?,?,?)");
for (const item of created.slice(5, 30)) insertHistory.run(demoId, item.id, daysAgo(int(0, 10)));
const insertFollow = db.prepare("INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?,?,?)");
for (const user of users.slice(1, 7)) insertFollow.run(demoId, user.id, daysAgo(int(5, 60)));
for (const user of users.slice(2, 9)) insertFollow.run(user.id, demoId, daysAgo(int(5, 60)));
for (const a of users.slice(1)) {
  for (const b of users.slice(1)) {
    if (a.id !== b.id && rnd() > 0.85) insertFollow.run(a.id, b.id, daysAgo(int(5, 200)));
  }
}

/* ------------------------------ Mercado Shops ----------------------------- */

const insertShop = db.prepare(
  `INSERT INTO shops (id, owner_id, name, slug, description, category, logo_seed, cover_emoji,
    business_type, legal_name, rfc, legal_address, legal_zip, legal_city, legal_region,
    address_public, legal_phone, legal_email, return_policy, delivery_note, ship_from,
    specialty, sourcing_needs, is_producer, status, created_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active',?)`,
);
const insertVariant = db.prepare(
  "INSERT INTO item_variants (item_id, label, sku, stock, position) VALUES (?,?,?,?,?)",
);
const insertShopFollow = db.prepare(
  "INSERT OR IGNORE INTO shop_follows (user_id, shop_id, created_at) VALUES (?,?,?)",
);

type ShopProduct = {
  t: string; e: string; cat: string; brand?: string; price: number;
  stock?: number; variants?: [string, number][];
};

const SHOPS: {
  name: string; owner: number; category: string; emoji: string; region: string;
  description: string; legal: string; rfc: string; specialty: string; needs: string;
  producer: number; products: ShopProduct[];
}[] = [
  {
    name: "Boutique Xanath", owner: 1, category: "Moda y accesorios", emoji: "👗",
    region: "Ciudad de México",
    description: "Ropa de diseño mexicano en tirajes cortos. Enviamos a todo el país con guía rastreable y aceptamos cambios de talla.",
    legal: "Xanath Diseño S.A. de C.V.", rfc: "XDI210415AB2",
    specialty: "confección y bordado a mano de manta y lino",
    needs: "joyería artesanal, velas aromáticas, empaques de papel",
    producer: 1,
    products: [
      { t: "Blusa de manta bordada a mano", e: "👚", cat: "mujer-blusas", brand: "Sin marca", price: 690,
        variants: [["Talla CH · Blanco", 6], ["Talla M · Blanco", 8], ["Talla G · Negro", 4]] },
      { t: "Vestido largo de lino", e: "👗", cat: "mujer-vestidos-vestido", brand: "Sin marca", price: 1290,
        variants: [["Talla CH", 3], ["Talla M", 5], ["Talla G", 2]] },
      { t: "Rebozo artesanal de algodón", e: "🧣", cat: "mujer-accesorios-collares", brand: "Sin marca", price: 850, stock: 14 },
      { t: "Playera oversize de algodón pima", e: "👕", cat: "mujer-playeras-corta", brand: "Sin marca", price: 420,
        variants: [["CH", 10], ["M", 12], ["G", 9], ["XG", 5]] },
      { t: "Bolsa tejida de palma", e: "👜", cat: "mujer-bolsas-mano", brand: "Sin marca", price: 760, stock: 8 },
    ],
  },
  {
    name: "TecnoRetro MX", owner: 2, category: "Electrónica y tecnología", emoji: "🎮",
    region: "Jalisco",
    description: "Consolas, videojuegos y accesorios revisados pieza por pieza. Incluimos 30 días de garantía y factura.",
    legal: "Carlos Ramírez Pérez", rfc: "RAPC880712JH9",
    specialty: "reacondicionamiento y garantía de consolas retro",
    needs: "fundas tejidas, papelería creativa, accesorios de escritorio",
    producer: 0,
    products: [
      { t: "Control inalámbrico compatible con Switch", e: "🎮", cat: "libros-videojuegos-switch", brand: "Sin marca", price: 520,
        variants: [["Negro", 12], ["Azul neón", 7], ["Rosa", 5]] },
      { t: "Consola retro HDMI con 500 juegos", e: "🕹️", cat: "libros-videojuegos-consolas", brand: "Sin marca", price: 1190, stock: 15 },
      { t: "Audífonos gamer con micrófono", e: "🎧", cat: "electronica-audio-audifonos", brand: "Sin marca", price: 890, stock: 22 },
      { t: "Cargador rápido USB-C 30 W", e: "🔌", cat: "electronica-celulares-accesorios", brand: "Sin marca", price: 320, stock: 40 },
      { t: "Memoria microSD 256 GB", e: "💾", cat: "electronica-computadoras-perifericos", brand: "Sin marca", price: 640, stock: 18 },
    ],
  },
  {
    name: "Casa Sol Deco", owner: 10, category: "Hogar y muebles", emoji: "🪑",
    region: "Nuevo León",
    description: "Muebles y decoración fabricados en Monterrey. Envíos a toda la república y entrega local sin costo.",
    legal: "Sol Interiores S. de R.L.", rfc: "SIN190320KL4",
    specialty: "carpintería de madera de parota y herrería fina",
    needs: "velas aromáticas, textiles de algodón, cerámica de mesa",
    producer: 1,
    products: [
      { t: "Banco de madera de parota", e: "🪵", cat: "hogar-muebles-sillas", brand: "Sin marca", price: 1450, stock: 6 },
      { t: "Juego de 4 tazas de barro negro", e: "🍽️", cat: "hogar-cocina-vajilla", brand: "Sin marca", price: 580, stock: 25 },
      { t: "Espejo redondo con marco de ratán", e: "🪞", cat: "hogar-decoracion", brand: "Sin marca", price: 990,
        variants: [["40 cm", 9], ["60 cm", 4]] },
      { t: "Cojines de manta (par)", e: "🛋️", cat: "hogar-decoracion", brand: "Sin marca", price: 460, stock: 30 },
    ],
  },
  {
    name: "Artesanías Tonantzin", owner: 7, category: "Artesanías y hecho a mano", emoji: "🧶",
    region: "Puebla",
    description: "Cooperativa de artesanas poblanas. Cada pieza se elabora a mano; los tiempos de entrega pueden variar en temporada alta.",
    legal: "Paulina Castro Méndez", rfc: "CAMP920518TU1",
    specialty: "velas de cera de soya, chaquira huichol y papel amate",
    needs: "textiles bordados, empaques de cartón reciclado",
    producer: 1,
    products: [
      { t: "Vela de cera de soya con copal", e: "🕯️", cat: "handmade-velas", brand: "Sin marca", price: 240,
        variants: [["Copal", 20], ["Lavanda", 15], ["Vainilla", 12]] },
      { t: "Aretes de chaquira huichol", e: "🎨", cat: "handmade-accesorios", brand: "Sin marca", price: 320, stock: 26 },
      { t: "Libreta con portada de papel amate", e: "📓", cat: "handmade-papeleria", brand: "Sin marca", price: 280, stock: 34 },
    ],
  },
];

const shopRefs: { id: string; slug: string; ownerId: string; name: string; items: Created[] }[] = [];

for (const shop of SHOPS) {
  const owner = users[shop.owner];
  const shopId = id("sh_");
  const slug = shop.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  insertShop.run(
    shopId, owner.id, shop.name, slug, shop.description, shop.category,
    String(shop.owner % 12), shop.emoji, "persona_moral", shop.legal, shop.rfc,
    `Av. ${pick(["Insurgentes", "Universidad", "Constitución", "Juárez"])} ${int(100, 1800)}, Col. ${pick(COLONIAS)}`,
    String(int(1000, 97999)).padStart(5, "0"), CITIES[shop.region], shop.region, 0,
    `${pick(["55", "33", "81", "222"])}${int(1000000, 9999999)}`,
    `contacto@${slug}.mx`,
    "Aceptamos cambios por talla dentro de los 15 días naturales posteriores a la entrega.",
    "De 2 a 5 días hábiles", shop.region, shop.specialty, shop.needs, shop.producer,
    daysAgo(int(60, 240)),
  );

  const shopItems: Created[] = [];
  for (const product of shop.products) {
    const itemId = id("m");
    const stock = product.variants
      ? product.variants.reduce((sum, [, qty]) => sum + qty, 0)
      : (product.stock ?? 10);
    const createdAt = daysAgo(int(1, 90));
    db.prepare(
      `INSERT INTO items (id, seller_id, title, description, price, category_id, brand_id, size, color,
        condition, shipping_payer, shipping_method, ship_from, ship_days, offers_enabled, shop_id,
        stock, status, views, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,'on_sale',?,?,?)`,
    ).run(
      itemId, owner.id, product.t,
      `${product.t} de ${shop.name}.\n\n· Producto nuevo con inventario disponible.\n· Envío en 24 h hábiles con guía rastreable.\n· Facturamos a solicitud (CFDI 4.0).`,
      product.price, catIdBySlug.get(product.cat)!,
      brandIdByName.get(product.brand ?? "Sin marca") ?? null, "", pick(COLORS), 1,
      rnd() > 0.35 ? "seller" : "buyer", pick(["comodo", "facil"]), shop.region, int(1, 2),
      shopId, stock, int(20, 1200), createdAt, createdAt,
    );
    insertImage.run(
      itemId,
      `/api/photo?seed=${encodeURIComponent(itemId)}&e=${encodeURIComponent(product.e)}&t=${encodeURIComponent(product.t.slice(0, 32))}`,
      0,
    );
    if (product.variants) {
      product.variants.forEach(([label, qty], index) => {
        insertVariant.run(itemId, label, `SKU-${index + 1}`, qty, index);
      });
    }
    for (const user of users) {
      if (user.id !== owner.id && rnd() > 0.85) insertLike.run(user.id, itemId, createdAt);
    }
    shopItems.push({ id: itemId, sellerId: owner.id, title: product.t, price: product.price });
  }

  for (const user of users) {
    if (user.id !== owner.id && rnd() > 0.55) insertShopFollow.run(user.id, shopId, daysAgo(int(1, 120)));
  }
  insertShopFollow.run(demoId, shopId, daysAgo(int(1, 60)));

  shopRefs.push({ id: shopId, slug, ownerId: owner.id, name: shop.name, items: shopItems });
}

/* --------------------------------- pedidos -------------------------------- */

const insertOrder = db.prepare(
  `INSERT INTO orders (id, item_id, buyer_id, seller_id, price, points_used, coupon_id, coupon_amount,
    charged, fee, shipping_cost, payout, payment_method, status, ship_name, ship_zip, ship_region,
    ship_city, ship_line, ship_phone, tracking, created_at, shipped_at, received_at, completed_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
);
const insertMessage = db.prepare("INSERT INTO messages (id, order_id, user_id, body, created_at) VALUES (?,?,?,?,?)");
const insertReview = db.prepare("INSERT INTO reviews (id, order_id, rater_id, ratee_id, score, body, created_at) VALUES (?,?,?,?,?,?,?)");
const insertLedger = db.prepare("INSERT INTO ledger (id, user_id, kind, amount, memo, created_at) VALUES (?,?,?,?,?,?)");
const insertNotification = db.prepare(
  "INSERT INTO notifications (id, user_id, kind, title, body, link, image, is_read, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
);

function makeOrder(
  item: Created,
  buyerId: string,
  status: "paid" | "shipped" | "received" | "done",
  ageDays: number,
  shopOptions?: { shopId: string; quantity: number; variantLabel?: string },
) {
  const orderId = id("o_");
  const quantity = shopOptions?.quantity ?? 1;
  const fee = Math.round(item.price * quantity * 0.1);
  const payout = item.price * quantity - fee;
  const createdAt = daysAgo(ageDays);
  const shippedAt = status === "paid" ? null : daysAgo(Math.max(0, ageDays - 1));
  const receivedAt = status === "paid" || status === "shipped" ? null : daysAgo(Math.max(0, ageDays - 3));
  const completedAt = status === "done" ? daysAgo(Math.max(0, ageDays - 3)) : null;
  const buyer = users.find((u) => u.id === buyerId)!;
  insertOrder.run(
    orderId, item.id, buyerId, item.sellerId, item.price, 0, null, 0, item.price, fee, 0, payout,
    pick(["card", "balance", "msi", "spei", "cash", "paypal"]), status, buyer.name, "06700",
    "Ciudad de México", "Cuauhtémoc",
    `Av. Insurgentes ${int(20, 1800)}, Col. Roma Norte, int. ${int(1, 20)}`, `55${int(10000000, 99999999)}`,
    status === "paid" ? "" : `MD${int(1000000000, 9999999999)}ES`,
    createdAt, shippedAt, receivedAt, completedAt,
  );
  if (shopOptions) {
    db.prepare("UPDATE orders SET quantity = ?, shop_id = ?, variant_label = ? WHERE id = ?")
      .run(quantity, shopOptions.shopId, shopOptions.variantLabel ?? "", orderId);
    db.prepare("UPDATE items SET stock = MAX(stock - ?, 0) WHERE id = ?").run(quantity, item.id);
    if (shopOptions.variantLabel) {
      db.prepare("UPDATE item_variants SET stock = MAX(stock - ?, 0) WHERE item_id = ? AND label = ?")
        .run(quantity, item.id, shopOptions.variantLabel);
    }
    const left = db.prepare("SELECT stock FROM items WHERE id = ?").get(item.id) as { stock: number };
    if (left.stock <= 0) {
      db.prepare("UPDATE items SET status = ? WHERE id = ?").run(status === "done" ? "sold" : "trading", item.id);
    }
  } else {
    db.prepare("UPDATE items SET status = ? WHERE id = ?").run(status === "done" ? "sold" : "trading", item.id);
  }
  insertMessage.run(id("ms_"), orderId, buyerId, "¡Hola! Acabo de comprar el artículo, muchas gracias 😊", createdAt);
  insertMessage.run(id("ms_"), orderId, item.sellerId, "¡Gracias a ti! Hoy mismo lo preparo y te aviso en cuanto salga.", new Date(new Date(createdAt).getTime() + 5400000).toISOString());
  if (status !== "paid") {
    insertMessage.run(id("ms_"), orderId, item.sellerId, "Ya lo envié, por aquí te paso el número de guía.", shippedAt!);
  }
  if (status === "received" || status === "done") {
    insertReview.run(id("rv_"), orderId, buyerId, item.sellerId, "good", pick([
      "Todo perfecto, tal como se describe. ¡Muy recomendable!",
      "Envío rapidísimo y excelente trato. Volvería a comprar.",
      "Llegó en perfecto estado y muy bien empacado.",
    ]), receivedAt!);
  }
  if (status === "done") {
    insertReview.run(id("rv_"), orderId, item.sellerId, buyerId, "good", pick([
      "Excelente comprador, pago inmediato. ¡Gracias!",
      "Todo excelente, muy amable. Un gusto.",
    ]), completedAt!);
    insertLedger.run(id("l_"), item.sellerId, "balance", payout, `Venta de «${item.title}»`, completedAt!);
    db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(payout, item.sellerId);
  }
  return orderId;
}

// historial de ventas de otras personas (para generar calificaciones)
for (let i = 0; i < 26; i++) {
  const item = created[int(0, created.length - 1)];
  if (!item || item.sellerId === demoId) continue;
  const buyer = users[int(0, users.length - 1)];
  if (buyer.id === item.sellerId) continue;
  const row = db.prepare("SELECT status FROM items WHERE id = ?").get(item.id) as { status: string };
  if (row.status !== "on_sale") continue;
  makeOrder(item, buyer.id, "done", int(10, 120));
}

// transacciones en curso de la cuenta demo
const demoPurchase = created.find((c) => c.sellerId !== demoId)!;
const demoOrderShipped = makeOrder(demoPurchase, demoId, "shipped", 3);
const demoPurchase2 = created.find((c) => c.sellerId !== demoId && c.id !== demoPurchase.id)!;
makeOrder(demoPurchase2, demoId, "done", 25);
const demoSale = demoItems[0];
const demoSaleOrder = makeOrder(demoSale, users[3].id, "paid", 1);

// pedidos de Mercado Shops (incluye compras de varias piezas)
for (const shop of shopRefs) {
  for (let i = 0; i < 3; i++) {
    const product = shop.items[int(0, shop.items.length - 1)];
    const buyer = users[int(0, users.length - 1)];
    if (!product || buyer.id === shop.ownerId) continue;
    const variantRow = db.prepare(
      "SELECT label FROM item_variants WHERE item_id = ? AND stock > 0 LIMIT 1",
    ).get(product.id) as { label: string } | undefined;
    makeOrder(product, buyer.id, i === 0 ? "paid" : "done", int(1, 45), {
      shopId: shop.id,
      quantity: int(1, 3),
      variantLabel: variantRow?.label,
    });
  }
}

// la cuenta demo compra en una tienda
const demoShop = shopRefs[0];
const demoShopItem = demoShop.items[1];
const demoShopVariant = db.prepare(
  "SELECT label FROM item_variants WHERE item_id = ? AND stock > 0 LIMIT 1",
).get(demoShopItem.id) as { label: string } | undefined;
makeOrder(demoShopItem, demoId, "shipped", 2, {
  shopId: demoShop.id, quantity: 2, variantLabel: demoShopVariant?.label,
});

/* ====================== Red de negocios entre tiendas ====================== */

const insertB2b = db.prepare("INSERT INTO b2b_prices (item_id, min_qty, price) VALUES (?,?,?)");
const insertPartner = db.prepare(
  `INSERT OR IGNORE INTO shop_partners (id, buyer_shop_id, supplier_shop_id, status, note, created_at, decided_at)
   VALUES (?,?,?,?,?,?,?)`,
);
const insertCollective = db.prepare(
  `INSERT INTO collectives (id, name, slug, description, emoji, region, owner_id, created_at)
   VALUES (?,?,?,?,?,?,?,?)`,
);
const insertMember = db.prepare(
  "INSERT OR IGNORE INTO collective_members (collective_id, shop_id, role, joined_at) VALUES (?,?,?,?)",
);
const insertBundle = db.prepare(
  `INSERT INTO bundles (id, title, description, owner_shop_id, discount, min_price, status, created_at)
   VALUES (?,?,?,?,?,?,'active',?)`,
);
const insertBundleItem = db.prepare(
  "INSERT OR IGNORE INTO bundle_items (bundle_id, item_id, shop_id, position) VALUES (?,?,?,?)",
);
const insertShipment = db.prepare(
  `INSERT INTO shipments (id, shop_id, method, region, status, tracking, pickup_date, unit_cost, total_cost, saved, created_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
);
const insertAdvance = db.prepare(
  `INSERT INTO advances (id, shop_id, user_id, amount, fee, outstanding, fee_rate, apr,
    horizon_days, due_at, tier, status, created_at, closed_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
);

// 1) Precios de mayoreo: cada tienda ofrece volumen en sus productos propios
for (const shop of shopRefs) {
  for (const product of shop.items) {
    if (rnd() > 0.7) continue;
    const base = product.price;
    insertB2b.run(product.id, 6, Math.round(base * 0.72));
    insertB2b.run(product.id, 12, Math.round(base * 0.62));
    if (rnd() > 0.5) insertB2b.run(product.id, 24, Math.round(base * 0.55));
  }
}

// 2) Relaciones de mayoreo entre tiendas (aprobadas y pendientes)
const [xanath, tecno, casaSol, tonantzin] = shopRefs;
const partnerPairs: [string, string, string, string][] = [
  [xanath.id, tonantzin.id, "approved", "Queremos incluir sus velas en nuestros paquetes de regalo."],
  [casaSol.id, tonantzin.id, "approved", "Buscamos velas y cerámica para acompañar nuestros muebles."],
  [tonantzin.id, xanath.id, "approved", "Nos interesan sus textiles bordados para nuestra tienda física."],
  [tecno.id, tonantzin.id, "pending", "Queremos surtir papelería artesanal para la temporada navideña."],
];
for (const [buyer, supplier, status, note] of partnerPairs) {
  insertPartner.run(id("pa_"), buyer, supplier, status, note, daysAgo(int(10, 90)),
    status === "pending" ? null : daysAgo(int(1, 9)));
}

// 3) Pedidos de mayoreo ya surtidos + reventa con crédito al taller
const tonantzinVela = tonantzin.items[0];
const wholesaleOrderId = id("o_");
{
  const qty = 12;
  const unit = Math.round(tonantzinVela.price * 0.62);
  const fee = Math.round(unit * qty * 0.05);
  const buyerShop = casaSol;
  const buyerUser = users.find((u) => u.id === buyerShop.ownerId)!;
  const createdAt = daysAgo(18);
  insertOrder.run(
    wholesaleOrderId, tonantzinVela.id, buyerShop.ownerId, tonantzin.ownerId, unit, 0, null, 0,
    unit * qty, fee, 0, unit * qty - fee, "balance", "done",
    buyerUser.name, "64000", "Nuevo León", "Monterrey", "Av. Constitución 450, Col. Centro",
    "8112345678", `MD${int(1000000000, 9999999999)}MX`, createdAt, daysAgo(17), daysAgo(15), daysAgo(15),
  );
  db.prepare("UPDATE orders SET is_wholesale = 1, quantity = ?, shop_id = ? WHERE id = ?")
    .run(qty, tonantzin.id, wholesaleOrderId);
  db.prepare("UPDATE items SET stock = MAX(stock - ?, 0) WHERE id = ?").run(qty, tonantzinVela.id);
  insertMessage.run(id("ms_"), wholesaleOrderId, buyerShop.ownerId,
    `Pedido de mayoreo de ${buyerShop.name}: ${qty} piezas. ¿Nos pueden facturar?`, createdAt);
  insertMessage.run(id("ms_"), wholesaleOrderId, tonantzin.ownerId,
    "¡Claro! Les mando el CFDI junto con la guía. Gracias por el pedido 🙌",
    new Date(new Date(createdAt).getTime() + 7200000).toISOString());

  // Casa Sol revende la vela con crédito a Tonantzin
  const resoldId = id("m");
  const resalePrice = Math.round(tonantzinVela.price * 1.15);
  db.prepare(
    `INSERT INTO items (id, seller_id, title, description, price, category_id, brand_id, size, color,
      condition, shipping_payer, shipping_method, ship_from, ship_days, offers_enabled, shop_id,
      stock, external_sku, origin, source_shop_id, source_item_id, status, views, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,'',?,1,'seller','comodo',?,1,0,?,?,'','sourced',?,?, 'on_sale',?,?,?)`,
  ).run(
    resoldId, buyerShop.ownerId, `${tonantzinVela.title} · selección Casa Sol`,
    `Vela artesanal seleccionada para acompañar nuestros muebles.\n\nProducto elaborado por ${tonantzin.name} y surtido por ${casaSol.name}.`,
    resalePrice, catIdBySlug.get("hogar-decoracion")!, brandIdByName.get("Sin marca")!, "Natural",
    "Nuevo León", casaSol.id, 12, tonantzin.id, tonantzinVela.id, int(30, 400), daysAgo(14), daysAgo(14),
  );
  insertImage.run(resoldId, `/api/photo?seed=${encodeURIComponent(resoldId)}&e=%F0%9F%95%AF%EF%B8%8F&t=${encodeURIComponent("Vela artesanal")}`, 0);
}

// 4) Colectivos
const collectives: [string, string, string, string, string, number][] = [
  ["Mercado de Artesanas de Puebla", "mercado-artesanas-puebla",
   "Cooperativas y talleres familiares de Puebla que venden juntas en línea desde 2024.",
   "🧵", "Puebla", 3],
  ["Corredor Roma-Condesa", "corredor-roma-condesa",
   "Tiendas de barrio de la Roma y la Condesa que comparten mensajería y escaparate.",
   "🏙️", "Ciudad de México", 0],
];
const collectiveIds: string[] = [];
for (const [name, slug, description, emoji, region, ownerIndex] of collectives) {
  const collectiveId = id("co_");
  const owner = shopRefs[ownerIndex];
  insertCollective.run(collectiveId, name, slug, description, emoji, region, owner.ownerId, daysAgo(int(40, 150)));
  insertMember.run(collectiveId, owner.id, "owner", daysAgo(int(30, 140)));
  collectiveIds.push(collectiveId);
}
insertMember.run(collectiveIds[0], xanath.id, "member", daysAgo(30));
insertMember.run(collectiveIds[0], casaSol.id, "member", daysAgo(22));
insertMember.run(collectiveIds[1], tecno.id, "member", daysAgo(18));
insertMember.run(collectiveIds[1], tonantzin.id, "member", daysAgo(12));

// 5) Paquete cruzado entre dos tiendas
{
  const bundleId = id("bu_");
  const textil = xanath.items[0];
  const vela = tonantzin.items[0];
  insertBundle.run(bundleId, "Ritual de casa: textil y vela",
    "Un textil bordado a mano y una vela de cera de soya, de dos talleres aliados.",
    xanath.id, 100, Math.min(textil.price, vela.price), daysAgo(20));
  insertBundleItem.run(bundleId, textil.id, xanath.id, 0);
  insertBundleItem.run(bundleId, vela.id, tonantzin.id, 1);
}

// 5.b) Pedidos pagados pendientes de envío (para consolidar y para el adelanto)
for (const [shop, count] of [[xanath, 3], [tonantzin, 8]] as const) {
  for (let i = 0; i < count; i++) {
    const product = shop.items[i % shop.items.length];
    const buyer = users[(i + 3) % users.length];
    if (buyer.id === shop.ownerId) continue;
    const variantRow = db.prepare(
      "SELECT label FROM item_variants WHERE item_id = ? AND stock > 0 LIMIT 1",
    ).get(product.id) as { label: string } | undefined;
    makeOrder(product, buyer.id, "paid", int(1, 5), {
      shopId: shop.id, quantity: int(1, 2), variantLabel: variantRow?.label,
    });
  }
}

// 5.c) Historial de ventas cerradas para la tienda que ofrece el adelanto en la demo
for (let i = 0; i < 3; i++) {
  const product = tonantzin.items[i % tonantzin.items.length];
  const buyer = users[(i + 6) % users.length];
  if (buyer.id === tonantzin.ownerId) continue;
  makeOrder(product, buyer.id, "done", int(20, 70), {
    shopId: tonantzin.id, quantity: int(1, 2),
  });
}

// 6) Envío consolidado de una tienda
{
  const shipmentId = id("sp_");
  const pending = db.prepare(
    "SELECT id FROM orders WHERE shop_id = ? AND status = 'paid' LIMIT 3",
  ).all(xanath.id) as { id: string }[];
  if (pending.length >= 2) {
    insertShipment.run(shipmentId, xanath.id, "comodo", "Ciudad de México", "open", "",
      new Date(Date.now() + 864e5).toISOString().slice(0, 10), 65, 65 * pending.length,
      Math.max(0, (99 - 65) * pending.length), daysAgo(1));
    for (const order of pending) {
      db.prepare("UPDATE orders SET shipment_id = ? WHERE id = ?").run(shipmentId, order.id);
    }
  }
}

// 7) Historial de adelantos: uno ya amortizado (Casa Sol) para mostrar el producto sin dejar
//    a nadie endeudado; las tiendas con historial pueden solicitar uno nuevo en la demo.
{
  const amount = 3000;
  const fee = Math.round(amount * 0.05);
  const horizon = 21;
  const apr = Math.round(0.05 * (365 / horizon) * 1000) / 10;
  insertAdvance.run(
    id("ad_"), casaSol.id, casaSol.ownerId, amount, fee, 0, 0.05, apr, horizon,
    daysAgo(-20), "inicial", "repaid", daysAgo(55), daysAgo(20),
  );
  insertLedger.run(id("l_"), casaSol.ownerId, "balance", amount,
    `Adelanto sobre ventas en curso · comisión $${fee} · CAT aproximado ${apr} %`, daysAgo(55));
}

/* ------------------------- cupones, puntos y avisos ------------------------ */

const insertCoupon = db.prepare(
  "INSERT INTO coupons (id, user_id, title, code, amount, min_price, expires_at, used_at) VALUES (?,?,?,?,?,?,?,?)",
);
insertCoupon.run(id("c_"), demoId, "Cupón de bienvenida: $100 de descuento", "BIENVENIDA100", 100, 400, new Date(Date.now() + 25 * 864e5).toISOString(), null);
insertCoupon.run(id("c_"), demoId, "$200 en moda (compra mínima $1,000)", "MODA10", 200, 1000, new Date(Date.now() + 9 * 864e5).toISOString(), null);
insertCoupon.run(id("c_"), demoId, "$60 por invitar a una amiga", "AMIGA60", 60, 200, new Date(Date.now() - 3 * 864e5).toISOString(), null);
insertLedger.run(id("l_"), demoId, "points", 300, "Puntos de bienvenida", daysAgo(90));
insertLedger.run(id("l_"), demoId, "points", 320, "Compra de puntos con tarjeta", daysAgo(20));
insertLedger.run(id("l_"), demoId, "balance", 2960, "Venta de «Vestido midi floreado»", daysAgo(15));

const notifications: [string, string, string, string][] = [
  ["order", "Tu pedido va en camino", "La persona vendedora ya lo envió. Consulta el rastreo.", `/transaction/${demoOrderShipped}`],
  ["order", "¡Vendiste un artículo!", "Prepara el envío lo antes posible.", `/transaction/${demoSaleOrder}`],
  ["like", "A Carlos Ramírez le gustó tu artículo", demoItems[1]?.title ?? "", `/item/${demoItems[1]?.id ?? ""}`],
  ["comment", "Mariana Ortega comentó en tu artículo", "¿Sigue disponible?", `/item/${demoItems[0]?.id ?? ""}`],
  ["shop", "Nuevas tiendas en Mercado Shops", "Negocios con inventario, variantes y meses sin intereses.", "/shops"],
  ["news", "Tu cupón está por vencer", "Te quedan 9 días para usar MODA10.", "/mypage/coupons"],
];
notifications.forEach(([kind, title, body, link], i) => {
  insertNotification.run(id("n_"), demoId, kind, title, body, link, "", i > 2 ? 1 : 0, daysAgo(i));
});

const insertSaved = db.prepare("INSERT INTO saved_searches (id, user_id, label, query, notify, created_at) VALUES (?,?,?,?,?,?)");
insertSaved.run(id("ss_"), demoId, "Tenis hasta $800", "?q=tenis&priceMax=800", 1, daysAgo(12));
insertSaved.run(id("ss_"), demoId, "Nintendo Switch", "?q=Nintendo%20Switch&status=on_sale", 1, daysAgo(4));

/* --------------------------------- resumen -------------------------------- */

const count = (table: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

console.log("Base de datos creada en", DB_PATH);
for (const table of ["users", "categories", "brands", "items", "item_images", "likes", "comments", "orders", "messages", "reviews", "follows", "notifications", "coupons", "shops", "item_variants", "shop_follows", "b2b_prices", "shop_partners", "collectives", "collective_members", "bundles", "shipments", "advances"]) {
  console.log(` · ${table}: ${count(table)}`);
}
console.log("\nCuenta de demostración: demo@mercado.mx / demo1234");
db.close();
