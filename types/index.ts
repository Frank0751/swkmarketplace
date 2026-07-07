// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'buyer' | 'vendor' | 'admin'

export type UserStatus = 'active' | 'suspended' | 'pending'

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  phone?: string
  role: UserRole
  status: UserStatus
  created_at: string
  updated_at: string
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export type ProductCategory =
  | 'agribusiness'
  | 'recycled_upcycled'
  | 'handmade_crafts'
  | 'organic_produce'

export interface VendorFounder {
  name: string
  role: string
  bio?: string
}

export interface VendorProfile {
  id: string
  user_id: string
  business_name: string
  slug?: string                // shareable store URL: /store/[slug]
  business_description: string
  category: ProductCategory
  location: string
  region: GhanaRegion
  phone: string
  social_links?: {
    instagram?: string
    facebook?: string
    twitter?: string
    website?: string
  }
  sustainability_statement: string
  proof_documents?: string[]   // Cloudinary URLs
  logo_url?: string
  banner_url?: string
  // Mini-website fields
  story?: string               // long-form "about the business"
  founders?: VendorFounder[]   // team behind the business
  year_founded?: number
  team_size?: number
  website?: string
  status: VendorStatus
  rejection_reason?: string
  total_sales: number
  total_products: number
  rating: number
  review_count: number
  approved_at?: string
  created_at: string
  updated_at: string
  // Joined
  user?: User
}

// ─── Product ──────────────────────────────────────────────────────────────────

export type ProductStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'paused' | 'sold_out'

export type SDGTag =
  | 'sdg_1_no_poverty'
  | 'sdg_8_decent_work'
  | 'sdg_12_responsible_consumption'
  | 'sdg_13_climate_action'
  | 'sdg_15_life_on_land'

export type ValueTag =
  | 'zero_waste'
  | 'organic'
  | 'plastic_free'
  | 'upcycled'
  | 'handmade'
  | 'women_led'
  | 'youth_led'
  | 'locally_sourced'
  | 'biodegradable'
  | 'fair_trade'

export interface Product {
  id: string
  vendor_id: string
  title: string
  slug: string
  description: string
  short_description: string
  price: number             // in GHS pesewas (multiply by 100)
  price_ghs: number         // human-readable GHS
  stock_quantity: number
  images: string[]          // Cloudinary URLs, first is primary
  category: ProductCategory
  sdg_tags: SDGTag[]
  value_tags: ValueTag[]
  location: string
  region: GhanaRegion
  unit?: string             // e.g. "per kg", "per dozen", "per bag"
  minimum_order?: number
  status: ProductStatus
  rejection_reason?: string
  views: number
  order_count: number
  created_at: string
  updated_at: string
  // Joined
  vendor?: VendorProfile
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'           // order placed, awaiting payment
  | 'paid'              // payment received, funds in escrow
  | 'confirmed'         // vendor confirmed availability
  | 'dispatched'        // vendor dispatched the order
  | 'delivered'         // buyer confirmed delivery
  | 'released'          // payout released to vendor
  | 'disputed'          // buyer raised a dispute
  | 'refunded'          // buyer refunded
  | 'cancelled'         // order cancelled

export interface OrderItem {
  product_id: string
  quantity: number
  unit_price: number
  total: number
  product?: Product
}

export interface Order {
  id: string
  reference: string       // SWK-XXXXXX human-readable ref
  buyer_id: string
  vendor_id: string
  product_id: string
  quantity: number
  unit_price: number      // in GHS
  subtotal: number
  delivery_fee: number
  total_amount: number
  status: OrderStatus
  delivery_address: string
  delivery_region: GhanaRegion
  buyer_notes?: string
  vendor_notes?: string
  admin_notes?: string
  paystack_reference?: string
  paystack_transaction_id?: string
  dispatched_at?: string
  delivered_at?: string
  released_at?: string
  estimated_delivery?: string
  created_at: string
  updated_at: string
  // Joined
  buyer?: User
  vendor?: VendorProfile
  product?: Product
  payout?: Payout
}

// ─── Payout ───────────────────────────────────────────────────────────────────

export type PayoutStatus = 'held' | 'pending_release' | 'released' | 'failed'

export interface Payout {
  id: string
  order_id: string
  vendor_id: string
  gross_amount: number        // total paid by buyer
  commission_rate: number     // e.g. 15
  commission_amount: number   // 15% of gross
  net_amount: number          // gross - commission
  status: PayoutStatus
  released_at?: string
  paystack_transfer_id?: string
  created_at: string
  updated_at: string
  // Joined
  order?: Order
  vendor?: VendorProfile
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface ProductReview {
  id: string
  product_id: string
  order_id: string
  buyer_id: string
  rating: number          // 1–5
  comment?: string
  created_at: string
  // Joined
  buyer?: Pick<User, 'full_name' | 'avatar_url'>
}

// ─── Geography ────────────────────────────────────────────────────────────────

export type GhanaRegion =
  | 'Greater Accra'
  | 'Ashanti'
  | 'Eastern'
  | 'Western'
  | 'Central'
  | 'Volta'
  | 'Northern'
  | 'Upper East'
  | 'Upper West'
  | 'Brong-Ahafo'
  | 'Oti'
  | 'Savannah'
  | 'North East'
  | 'Western North'
  | 'Ahafo'
  | 'Bono East'

export const GHANA_REGIONS: GhanaRegion[] = [
  'Greater Accra', 'Ashanti', 'Eastern', 'Western', 'Central',
  'Volta', 'Northern', 'Upper East', 'Upper West', 'Brong-Ahafo',
  'Oti', 'Savannah', 'North East', 'Western North', 'Ahafo', 'Bono East',
]

// ─── UI & Forms ───────────────────────────────────────────────────────────────

export interface FilterState {
  category?: ProductCategory
  region?: GhanaRegion
  min_price?: number
  max_price?: number
  value_tags?: ValueTag[]
  sdg_tags?: SDGTag[]
  search?: string
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular'
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// ─── Category metadata ────────────────────────────────────────────────────────

export const CATEGORY_META: Record<ProductCategory, { label: string; emoji: string; description: string }> = {
  agribusiness: {
    label: 'Agribusiness',
    emoji: '🌾',
    description: 'Sustainably grown crops, farm produce & agro-processing',
  },
  recycled_upcycled: {
    label: 'Recycled & Upcycled',
    emoji: '♻️',
    description: 'Products made from reclaimed or repurposed materials',
  },
  handmade_crafts: {
    label: 'Handmade Crafts',
    emoji: '🖐️',
    description: 'Artisan goods with sustainable, natural materials',
  },
  organic_produce: {
    label: 'Organic Produce',
    emoji: '🥦',
    description: 'Naturally grown, chemical-free food products',
  },
}

export const VALUE_TAG_META: Record<ValueTag, { label: string; icon: string }> = {
  zero_waste:       { label: 'Zero Waste',       icon: '🚯' },
  organic:          { label: 'Organic',           icon: '🌿' },
  plastic_free:     { label: 'Plastic Free',      icon: '🚫' },
  upcycled:         { label: 'Upcycled',          icon: '♻️' },
  handmade:         { label: 'Handmade',          icon: '✋' },
  women_led:        { label: 'Women-Led',         icon: '👩' },
  youth_led:        { label: 'Youth-Led',         icon: '✊' },
  locally_sourced:  { label: 'Locally Sourced',   icon: '📍' },
  biodegradable:    { label: 'Biodegradable',     icon: '🌱' },
  fair_trade:       { label: 'Fair Trade',        icon: '🤝' },
}
