PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  handle          TEXT NOT NULL UNIQUE,
  avatar_seed     TEXT NOT NULL,
  bio             TEXT NOT NULL DEFAULT '',
  balance         INTEGER NOT NULL DEFAULT 0,
  points          INTEGER NOT NULL DEFAULT 0,
  is_verified     INTEGER NOT NULL DEFAULT 0,
  addr_name       TEXT NOT NULL DEFAULT '',
  addr_zip        TEXT NOT NULL DEFAULT '',
  addr_region     TEXT NOT NULL DEFAULT '',
  addr_city       TEXT NOT NULL DEFAULT '',
  addr_line       TEXT NOT NULL DEFAULT '',
  addr_phone      TEXT NOT NULL DEFAULT '',
  notify_like     INTEGER NOT NULL DEFAULT 1,
  notify_comment  INTEGER NOT NULL DEFAULT 1,
  notify_order    INTEGER NOT NULL DEFAULT 1,
  notify_message  INTEGER NOT NULL DEFAULT 1,
  notify_news     INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY,
  parent_id  INTEGER REFERENCES categories(id),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT '',
  level      INTEGER NOT NULL DEFAULT 0,
  sort       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cat_parent ON categories(parent_id);

CREATE TABLE IF NOT EXISTS brands (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS shops (
  id             TEXT PRIMARY KEY,
  owner_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  description    TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT '',
  logo_seed      TEXT NOT NULL DEFAULT '0',
  cover_emoji    TEXT NOT NULL DEFAULT '🛍️',
  business_type  TEXT NOT NULL DEFAULT 'persona_fisica',
  legal_name     TEXT NOT NULL DEFAULT '',
  rfc            TEXT NOT NULL DEFAULT '',
  legal_address  TEXT NOT NULL DEFAULT '',
  legal_phone    TEXT NOT NULL DEFAULT '',
  legal_email    TEXT NOT NULL DEFAULT '',
  return_policy  TEXT NOT NULL DEFAULT '',
  delivery_note  TEXT NOT NULL DEFAULT '',
  specialty      TEXT NOT NULL DEFAULT '',
  sourcing_needs TEXT NOT NULL DEFAULT '',
  is_producer    INTEGER NOT NULL DEFAULT 0,
  ship_from      TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);

CREATE TABLE IF NOT EXISTS shop_follows (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id    TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, shop_id)
);

CREATE TABLE IF NOT EXISTS items (
  id             TEXT PRIMARY KEY,
  seller_id      TEXT NOT NULL REFERENCES users(id),
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  price          INTEGER NOT NULL DEFAULT 0,
  category_id    INTEGER REFERENCES categories(id),
  brand_id       INTEGER REFERENCES brands(id),
  size           TEXT NOT NULL DEFAULT '',
  color          TEXT NOT NULL DEFAULT '',
  condition      INTEGER NOT NULL DEFAULT 1,
  shipping_payer TEXT NOT NULL DEFAULT 'seller',
  shipping_method TEXT NOT NULL DEFAULT 'facil',
  ship_from      TEXT NOT NULL DEFAULT '',
  ship_days      INTEGER NOT NULL DEFAULT 1,
  status         TEXT NOT NULL DEFAULT 'on_sale',
  offers_enabled INTEGER NOT NULL DEFAULT 1,
  shop_id        TEXT REFERENCES shops(id),
  stock          INTEGER NOT NULL DEFAULT 1,
  external_sku   TEXT NOT NULL DEFAULT '',
  origin         TEXT NOT NULL DEFAULT 'own',
  source_shop_id TEXT REFERENCES shops(id),
  source_item_id TEXT,
  views          INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_seller ON items(seller_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_cat ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_shop ON items(shop_id);

CREATE TABLE IF NOT EXISTS item_variants (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id  TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  sku      TEXT NOT NULL DEFAULT '',
  stock    INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_item ON item_variants(item_id);

CREATE TABLE IF NOT EXISTS item_images (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id   TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  url       TEXT NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_img_item ON item_images(item_id);

CREATE TABLE IF NOT EXISTS likes (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_id);

CREATE TABLE IF NOT EXISTS offers (
  id         TEXT PRIMARY KEY,
  item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price      INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offers_item ON offers(item_id);

CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,
  item_id        TEXT NOT NULL REFERENCES items(id),
  buyer_id       TEXT NOT NULL REFERENCES users(id),
  seller_id      TEXT NOT NULL REFERENCES users(id),
  price          INTEGER NOT NULL,
  quantity       INTEGER NOT NULL DEFAULT 1,
  shop_id        TEXT REFERENCES shops(id),
  variant_label  TEXT NOT NULL DEFAULT '',
  is_wholesale   INTEGER NOT NULL DEFAULT 0,
  shipment_id    TEXT,
  points_used    INTEGER NOT NULL DEFAULT 0,
  coupon_id      TEXT,
  coupon_amount  INTEGER NOT NULL DEFAULT 0,
  charged        INTEGER NOT NULL DEFAULT 0,
  fee            INTEGER NOT NULL DEFAULT 0,
  shipping_cost  INTEGER NOT NULL DEFAULT 0,
  payout         INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'card',
  status         TEXT NOT NULL DEFAULT 'paid',
  ship_name      TEXT NOT NULL DEFAULT '',
  ship_zip       TEXT NOT NULL DEFAULT '',
  ship_region    TEXT NOT NULL DEFAULT '',
  ship_city      TEXT NOT NULL DEFAULT '',
  ship_line      TEXT NOT NULL DEFAULT '',
  ship_phone     TEXT NOT NULL DEFAULT '',
  tracking       TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL,
  shipped_at     TEXT,
  received_at    TEXT,
  completed_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_msg_order ON messages(order_id);

CREATE TABLE IF NOT EXISTS reviews (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rater_id   TEXT NOT NULL REFERENCES users(id),
  ratee_id   TEXT NOT NULL REFERENCES users(id),
  score      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rev_ratee ON reviews(ratee_id);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (follower_id, followee_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  link       TEXT NOT NULL DEFAULT '',
  image      TEXT NOT NULL DEFAULT '',
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

CREATE TABLE IF NOT EXISTS saved_searches (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  query      TEXT NOT NULL,
  notify     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS history (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id   TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  viewed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  code       TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  min_price  INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  used_at    TEXT
);

CREATE TABLE IF NOT EXISTS ledger (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  memo       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger(user_id);

CREATE TABLE IF NOT EXISTS payouts (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  fee        INTEGER NOT NULL DEFAULT 0,
  iban       TEXT NOT NULL,
  holder     TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand      TEXT NOT NULL,
  last4      TEXT NOT NULL,
  exp        TEXT NOT NULL,
  holder     TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target     TEXT NOT NULL,
  target_id  TEXT NOT NULL,
  reason     TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

/* ===================== Red de negocios (B2B y colectivos) ==================== */

-- Relación comercial entre dos tiendas (quien compra solicita, quien provee aprueba)
CREATE TABLE IF NOT EXISTS shop_partners (
  id                TEXT PRIMARY KEY,
  buyer_shop_id     TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  supplier_shop_id  TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending',
  note              TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL,
  decided_at        TEXT,
  UNIQUE (buyer_shop_id, supplier_shop_id)
);
CREATE INDEX IF NOT EXISTS idx_partners_supplier ON shop_partners(supplier_shop_id);
CREATE INDEX IF NOT EXISTS idx_partners_buyer ON shop_partners(buyer_shop_id);

-- Precios de mayoreo por volumen
CREATE TABLE IF NOT EXISTS b2b_prices (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id  TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  min_qty  INTEGER NOT NULL,
  price    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_b2b_item ON b2b_prices(item_id);

-- Envíos consolidados: varios pedidos en una sola recolección
CREATE TABLE IF NOT EXISTS shipments (
  id           TEXT PRIMARY KEY,
  shop_id      TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  method       TEXT NOT NULL DEFAULT 'comodo',
  region       TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'open',
  tracking     TEXT NOT NULL DEFAULT '',
  pickup_date  TEXT NOT NULL DEFAULT '',
  unit_cost    INTEGER NOT NULL DEFAULT 0,
  total_cost   INTEGER NOT NULL DEFAULT 0,
  saved        INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shipments_shop ON shipments(shop_id);

-- Colectivos: mercados, corredores comerciales o alianzas de tiendas
CREATE TABLE IF NOT EXISTS collectives (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  emoji       TEXT NOT NULL DEFAULT '🏛️',
  region      TEXT NOT NULL DEFAULT '',
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collective_members (
  collective_id TEXT NOT NULL REFERENCES collectives(id) ON DELETE CASCADE,
  shop_id       TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member',
  joined_at     TEXT NOT NULL,
  PRIMARY KEY (collective_id, shop_id)
);

-- Paquetes cruzados entre tiendas (venta complementaria)
CREATE TABLE IF NOT EXISTS bundles (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  owner_shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  discount      INTEGER NOT NULL DEFAULT 0,
  min_price     INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bundle_items (
  bundle_id TEXT NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  item_id   TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  shop_id   TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bundle_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_bundle_items_item ON bundle_items(item_id);

-- Adelanto de saldo sobre ventas en curso
CREATE TABLE IF NOT EXISTS advances (
  id          TEXT PRIMARY KEY,
  shop_id     TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  fee         INTEGER NOT NULL DEFAULT 0,
  outstanding INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL,
  closed_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_advances_shop ON advances(shop_id);

-- Registro de importaciones de catálogo
CREATE TABLE IF NOT EXISTS import_jobs (
  id         TEXT PRIMARY KEY,
  shop_id    TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  filename   TEXT NOT NULL DEFAULT '',
  created    INTEGER NOT NULL DEFAULT 0,
  updated    INTEGER NOT NULL DEFAULT 0,
  skipped    INTEGER NOT NULL DEFAULT 0,
  errors     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
