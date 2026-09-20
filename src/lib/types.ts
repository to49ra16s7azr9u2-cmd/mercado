export type User = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  handle: string;
  avatar_seed: string;
  bio: string;
  balance: number;
  points: number;
  is_verified: number;
  addr_name: string;
  addr_zip: string;
  addr_region: string;
  addr_city: string;
  addr_line: string;
  addr_phone: string;
  notify_like: number;
  notify_comment: number;
  notify_order: number;
  notify_message: number;
  notify_news: number;
  created_at: string;
};

export type Item = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category_id: number | null;
  brand_id: number | null;
  size: string;
  color: string;
  condition: number;
  shipping_payer: string;
  shipping_method: string;
  ship_from: string;
  ship_days: number;
  status: "on_sale" | "trading" | "sold" | "draft" | "stopped";
  offers_enabled: number;
  shop_id: string | null;
  stock: number;
  views: number;
  created_at: string;
  updated_at: string;
};

export type ItemCard = Item & {
  image: string | null;
  likes: number;
  liked?: number;
  seller_name?: string;
  seller_handle?: string;
  seller_avatar?: string;
  shop_name?: string | null;
  shop_slug?: string | null;
  shop_logo?: string | null;
  shop_status?: string | null;
};

export type Shop = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  logo_seed: string;
  cover_emoji: string;
  business_type: string;
  legal_name: string;
  rfc: string;
  legal_address: string;
  legal_phone: string;
  legal_email: string;
  return_policy: string;
  delivery_note: string;
  ship_from: string;
  status: "pending" | "active" | "suspended";
  created_at: string;
};

export type Variant = {
  id: number;
  item_id: string;
  label: string;
  sku: string;
  stock: number;
  position: number;
};

export type Category = {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  icon: string;
  level: number;
  sort: number;
};

export type Order = {
  id: string;
  item_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  quantity: number;
  shop_id: string | null;
  variant_label: string;
  points_used: number;
  coupon_id: string | null;
  coupon_amount: number;
  charged: number;
  fee: number;
  shipping_cost: number;
  payout: number;
  payment_method: string;
  status: "paid" | "shipped" | "received" | "done" | "cancelled";
  ship_name: string;
  ship_zip: string;
  ship_region: string;
  ship_city: string;
  ship_line: string;
  ship_phone: string;
  tracking: string;
  created_at: string;
  shipped_at: string | null;
  received_at: string | null;
  completed_at: string | null;
};

export type Comment = {
  id: string;
  item_id: string;
  user_id: string;
  body: string;
  created_at: string;
  name: string;
  handle: string;
  avatar_seed: string;
};

export type Notification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  image: string;
  is_read: number;
  created_at: string;
};
