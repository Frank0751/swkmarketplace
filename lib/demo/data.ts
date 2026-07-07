import type {
  Product,
  ProductCategory,
  VendorProfile,
} from '@/types'

// ─── Demo / sample data ─────────────────────────────────────────────────────────
//
// Shown when Supabase has no (matching) products — keeps the marketplace looking
// alive for pitches and demos before real vendors join. Every id is prefixed
// "demo-" so the UI can badge these as samples and disable ordering.
// Set NEXT_PUBLIC_DEMO_MODE=false to turn the fallback off in production.

export function demoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'
}

export function isDemoId(id: string | undefined | null): boolean {
  return typeof id === 'string' && id.startsWith('demo-')
}

const NOW = '2026-07-01T09:00:00.000Z'

type DemoVendor = VendorProfile

function vendor(v: Partial<DemoVendor> & Pick<DemoVendor, 'id' | 'business_name' | 'slug' | 'category'>): DemoVendor {
  return {
    user_id: v.id + '-user',
    business_description: '',
    location: 'Accra',
    region: 'Greater Accra',
    phone: '+233 20 000 0000',
    sustainability_statement: '',
    status: 'approved',
    total_sales: 0,
    total_products: 3,
    rating: 4.8,
    review_count: 12,
    created_at: NOW,
    updated_at: NOW,
    ...v,
  } as DemoVendor
}

export const DEMO_VENDORS: DemoVendor[] = [
  vendor({
    id: 'demo-v-greenharvest',
    business_name: 'GreenHarvest Farms',
    slug: 'greenharvest-farms',
    category: 'agribusiness',
    location: 'Kumasi',
    region: 'Ashanti',
    logo_url: '/images/cat-agribusiness.jpg',
    banner_url: '/images/cat-agribusiness.jpg',
    business_description:
      'A youth-run regenerative farm collective producing honey, coffee and organic inputs while restoring degraded farmland in the Ashanti Region.',
    sustainability_statement:
      'We practise regenerative agriculture: zero synthetic pesticides, agroforestry intercropping, and beekeeping that pollinates over 40 hectares of smallholder farms around Kumasi.',
    story:
      'GreenHarvest Farms began in 2021 when three agricultural science graduates returned to Kumasi and leased two hectares of exhausted farmland. Instead of chemicals, they rebuilt the soil with compost, cover crops and bees. Today the collective works with 35 smallholder farmers, runs Ghana\'s first youth-led apiary school, and supplies raw forest honey and specialty coffee to buyers across the country. Every purchase funds a seedling nursery that has already put 12,000 trees in the ground.',
    founders: [
      { name: 'Kwame Mensah', role: 'Co-founder & Farm Director', bio: 'Agronomist (KNUST). Leads regenerative farming operations and the farmer training programme.' },
      { name: 'Efua Boateng', role: 'Co-founder & Head of Apiary', bio: 'Beekeeper and food scientist. Built the apiary school that has trained 60+ young beekeepers.' },
    ],
    year_founded: 2021,
    team_size: 14,
    rating: 4.9,
    review_count: 31,
    total_sales: 220,
    social_links: { instagram: 'https://instagram.com/greenharvestgh', website: 'https://greenharvest.example.com' },
  }),
  vendor({
    id: 'demo-v-adom',
    business_name: 'Adom Organics',
    slug: 'adom-organics',
    category: 'organic_produce',
    location: 'Aburi',
    region: 'Eastern',
    logo_url: '/images/cat-organic.jpg',
    banner_url: '/images/hero-market.jpg',
    business_description:
      'Chemical-free fruits, vegetables and cold-pressed oils grown on family plots in the Akuapem hills and delivered fresh to Accra.',
    sustainability_statement:
      'Certified-organic growing methods, plastic-free crates, and a farm-gate pricing model that pays our 22 partner farmers 30% above market rates.',
    story:
      'Adom Organics started as a weekend farmers\' stall run by siblings Ama and Kofi Asante. Frustrated that Aburi\'s best chemical-free produce never reached city buyers, they organised neighbouring family farms into a single delivery network. Adom now delivers over 300 veggie boxes a month in reusable crates, and its cold-pressed baobab and shea oils are stocked by three eco-shops in Accra.',
    founders: [
      { name: 'Ama Asante', role: 'Co-founder & CEO', bio: 'Former nurse turned farmer-organiser. Handles quality, logistics and the veggie-box programme.' },
      { name: 'Kofi Asante', role: 'Co-founder & Farm Relations', bio: 'Works with the 22 partner family farms on organic certification and fair pricing.' },
    ],
    year_founded: 2022,
    team_size: 9,
    rating: 4.8,
    review_count: 47,
    total_sales: 415,
    social_links: { instagram: 'https://instagram.com/adomorganics' },
  }),
  vendor({
    id: 'demo-v-sankofa',
    business_name: 'Sankofa Crafts Collective',
    slug: 'sankofa-crafts-collective',
    category: 'handmade_crafts',
    location: 'Accra',
    region: 'Greater Accra',
    logo_url: '/images/cat-handmade.jpg',
    banner_url: '/images/cat-handmade.jpg',
    business_description:
      'A women-led artisan collective crafting ceramics, jewellery and home goods from natural and reclaimed materials in Jamestown, Accra.',
    sustainability_statement:
      'Local clay, reclaimed glass beads, natural soy wax and zero air-freighted materials. 70% of our makers are young women learning a lifelong craft.',
    story:
      'Sankofa — "go back and get it" — is a Jamestown studio where traditional Ga craftsmanship meets modern design. What began as evening pottery classes for six young women is now a 19-member collective whose hand-thrown ceramics and recycled-glass jewellery have been exhibited at the Chale Wote festival. The collective reinvests a fifth of every sale into free apprenticeships for school leavers.',
    founders: [
      { name: 'Abena Osei', role: 'Founder & Creative Director', bio: 'Ceramicist trained in Kumasi and Copenhagen. Named a 2025 Design Network Africa fellow.' },
      { name: 'Naa Adjeley Quaye', role: 'Studio Manager', bio: 'Runs the apprenticeship programme and the collective\'s fair-pay framework.' },
    ],
    year_founded: 2020,
    team_size: 19,
    rating: 4.9,
    review_count: 58,
    total_sales: 640,
    social_links: { instagram: 'https://instagram.com/sankofacrafts', facebook: 'https://facebook.com/sankofacrafts' },
  }),
  vendor({
    id: 'demo-v-ecocycle',
    business_name: 'EcoCycle Ghana',
    slug: 'ecocycle-ghana',
    category: 'recycled_upcycled',
    location: 'Tema',
    region: 'Greater Accra',
    logo_url: '/images/cat-recycled.jpg',
    banner_url: '/images/cat-recycled.jpg',
    business_description:
      'Turning Tema\'s waste stream into everyday products — kraft totes, zero-waste soap and stationery made from reclaimed paper and oils.',
    sustainability_statement:
      'Every product diverts waste from landfill: reclaimed kraft paper, recovered cooking oils saponified into soap, and compostable packaging only.',
    story:
      'EcoCycle was founded by two environmental engineering students who audited their campus bins and found 80% of the "waste" was reusable. Starting with a single paper press in a Tema garage, the team now processes three tonnes of reclaimed paper and oils a month, employs 11 young people, and runs recycling drives in 15 schools.',
    founders: [
      { name: 'Yaw Darko', role: 'Co-founder & Operations Lead', bio: 'Environmental engineer. Designs the reclaimed-material production lines.' },
      { name: 'Esi Nyarko', role: 'Co-founder & Partnerships', bio: 'Runs the schools recycling programme and retail partnerships.' },
    ],
    year_founded: 2023,
    team_size: 11,
    rating: 4.7,
    review_count: 22,
    total_sales: 180,
    social_links: { twitter: 'https://x.com/ecocyclegh' },
  }),
]

// ─── Products ──────────────────────────────────────────────────────────────────

type DemoProduct = Product

function product(
  p: Partial<DemoProduct> &
    Pick<DemoProduct, 'id' | 'title' | 'slug' | 'price_ghs' | 'images' | 'category'> & { vendorId: string },
): DemoProduct {
  const v = DEMO_VENDORS.find(x => x.id === p.vendorId)!
  const { vendorId: _vendorId, ...rest } = p
  return {
    vendor_id: v.id,
    description: '',
    short_description: '',
    price: Math.round(p.price_ghs * 100),
    stock_quantity: 25,
    sdg_tags: ['sdg_12_responsible_consumption'],
    value_tags: [],
    location: v.location,
    region: v.region,
    status: 'approved',
    views: 120,
    order_count: 15,
    created_at: NOW,
    updated_at: NOW,
    vendor: v,
    ...rest,
  } as DemoProduct
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  // ── GreenHarvest Farms (agribusiness)
  product({
    id: 'demo-p-honey', vendorId: 'demo-v-greenharvest',
    title: 'Raw Forest Honey (500ml)', slug: 'demo-raw-forest-honey',
    price_ghs: 65, unit: 'per jar', images: ['/images/prod-honey.jpg'],
    category: 'agribusiness',
    short_description: 'Unfiltered honey from agroforestry hives around Kumasi — harvested by youth-trained beekeepers.',
    description: 'Raw, unheated and unfiltered honey from our agroforestry apiaries in the Ashanti Region. Each jar is traceable to the hive cluster it came from, and every harvest funds our apiary school for young beekeepers.\nTasting notes: wildflower, citrus blossom, soft caramel finish.',
    value_tags: ['organic', 'youth_led', 'locally_sourced'],
    sdg_tags: ['sdg_12_responsible_consumption', 'sdg_8_decent_work', 'sdg_15_life_on_land'],
    views: 342, order_count: 58, stock_quantity: 40,
  }),
  product({
    id: 'demo-p-coffee', vendorId: 'demo-v-greenharvest',
    title: 'Highland Roasted Coffee Beans (250g)', slug: 'demo-highland-coffee-beans',
    price_ghs: 48, unit: 'per bag', images: ['/images/prod-coffee.jpg'],
    category: 'agribusiness',
    short_description: 'Shade-grown Ghanaian arabica, sun-dried and small-batch roasted.',
    description: 'Grown under native canopy trees by our partner smallholders, these beans are hand-picked, sun-dried and roasted in small batches in Kumasi. Medium roast with notes of cocoa and red berries.\nCompostable packaging, roasted to order.',
    value_tags: ['locally_sourced', 'fair_trade'],
    sdg_tags: ['sdg_12_responsible_consumption', 'sdg_13_climate_action'],
    views: 261, order_count: 34, stock_quantity: 30,
  }),
  product({
    id: 'demo-p-seedlings', vendorId: 'demo-v-greenharvest',
    title: 'Vegetable Seedling Starter Tray (24 cells)', slug: 'demo-seedling-starter-tray',
    price_ghs: 35, unit: 'per tray', images: ['/images/impact-seedling.jpg'],
    category: 'agribusiness',
    short_description: 'Nursery-raised tomato, pepper and kontomire seedlings in biodegradable trays.',
    description: 'Give your garden a head start with hardened-off seedlings from our nursery: tomato, chilli pepper and kontomire varieties selected for Ghanaian conditions. The tray is pressed from coconut coir and composts straight into your soil.',
    value_tags: ['biodegradable', 'organic'],
    sdg_tags: ['sdg_12_responsible_consumption', 'sdg_13_climate_action'],
    views: 148, order_count: 19, stock_quantity: 18,
  }),

  // ── Adom Organics (organic produce)
  product({
    id: 'demo-p-vegbox', vendorId: 'demo-v-adom',
    title: 'Weekly Organic Veggie Box', slug: 'demo-weekly-organic-veggie-box',
    price_ghs: 120, unit: 'per box', images: ['/images/prod-veg-box.jpg'],
    category: 'organic_produce',
    short_description: 'A rotating box of 8–10 chemical-free vegetables from Akuapem family farms, delivered in reusable crates.',
    description: 'Our signature box: 8–10 seasonal vegetables harvested within 24 hours of delivery — think garden eggs, kontomire, sweet peppers, spring onions and salad greens. Delivered in returnable crates, never plastic.\nDelivery to Accra & Tema every Saturday.',
    value_tags: ['organic', 'plastic_free', 'locally_sourced'],
    views: 505, order_count: 92, stock_quantity: 20,
  }),
  product({
    id: 'demo-p-tomatoes', vendorId: 'demo-v-adom',
    title: 'Vine-Ripened Tomatoes (1kg)', slug: 'demo-vine-ripened-tomatoes',
    price_ghs: 22, unit: 'per kg', images: ['/images/prod-tomatoes.jpg'],
    category: 'organic_produce',
    short_description: 'Sun-ripened on the vine in the Akuapem hills. No sprays, ever.',
    description: 'Grown in open fields with compost and neem-based pest control only. Picked ripe — not gassed — so they actually taste like tomatoes.',
    value_tags: ['organic', 'locally_sourced'],
    views: 210, order_count: 40, stock_quantity: 50,
  }),
  product({
    id: 'demo-p-bananas', vendorId: 'demo-v-adom',
    title: 'Organic Bananas (bunch)', slug: 'demo-organic-bananas',
    price_ghs: 18, unit: 'per bunch', images: ['/images/prod-bananas.jpg'],
    category: 'organic_produce',
    short_description: 'Naturally ripened bananas from mixed-crop family plots.',
    description: 'Sweet, naturally ripened bananas intercropped with cocoa and plantain — no ripening chemicals, no monoculture.',
    value_tags: ['organic'],
    views: 176, order_count: 28, stock_quantity: 60,
  }),
  product({
    id: 'demo-p-watermelon', vendorId: 'demo-v-adom',
    title: 'Sweet Watermelon', slug: 'demo-sweet-watermelon',
    price_ghs: 25, unit: 'each', images: ['/images/prod-watermelon.jpg'],
    category: 'organic_produce',
    short_description: 'Field-grown watermelon, chemical-free and picked at peak sweetness.',
    description: 'Heavy, crisp and deep red inside. Grown on open fields in the Eastern Region with drip irrigation and zero synthetic inputs.',
    value_tags: ['organic', 'locally_sourced'],
    views: 132, order_count: 21, stock_quantity: 35,
  }),
  product({
    id: 'demo-p-baobab-oil', vendorId: 'demo-v-adom',
    title: 'Cold-Pressed Baobab Oil (100ml)', slug: 'demo-cold-pressed-baobab-oil',
    price_ghs: 85, unit: 'per bottle', images: ['/images/prod-shea.jpg'],
    category: 'organic_produce',
    short_description: 'Single-origin baobab seed oil for skin and hair, pressed in small batches.',
    description: 'Wild-harvested baobab seeds from northern Ghana, cold-pressed within days of collection. Rich in omega fatty acids — a natural moisturiser for skin and hair. Amber glass bottle, zero plastic.',
    value_tags: ['organic', 'plastic_free', 'women_led'],
    views: 298, order_count: 45, stock_quantity: 24,
  }),

  // ── Sankofa Crafts Collective (handmade crafts)
  product({
    id: 'demo-p-vases', vendorId: 'demo-v-sankofa',
    title: 'Hand-Thrown Ceramic Vase Set (3 pieces)', slug: 'demo-ceramic-vase-set',
    price_ghs: 240, unit: 'per set', images: ['/images/prod-pottery.jpg'],
    category: 'handmade_crafts',
    short_description: 'Matte stoneware vases thrown from local clay in our Jamestown studio.',
    description: 'A set of three bottle vases in speckled matte glaze, each thrown by hand from clay dug in the Eastern Region. No two sets are identical — expect beautiful small variations.\nFood-safe glaze, fired with efficient twin kilns.',
    value_tags: ['handmade', 'women_led', 'locally_sourced'],
    views: 387, order_count: 26, stock_quantity: 8,
  }),
  product({
    id: 'demo-p-earrings', vendorId: 'demo-v-sankofa',
    title: 'Recycled-Glass Statement Earrings', slug: 'demo-recycled-glass-earrings',
    price_ghs: 95, unit: 'per pair', images: ['/images/prod-jewelry.jpg'],
    category: 'handmade_crafts',
    short_description: 'Krobo recycled-glass beads set in brass — crafted by our women-led studio.',
    description: 'Statement earrings built around Krobo recycled-glass beads, hand-set in locally cast brass. Each pair supports our free apprenticeship programme for young women in Jamestown.',
    value_tags: ['handmade', 'upcycled', 'women_led'],
    views: 441, order_count: 63, stock_quantity: 15,
  }),
  product({
    id: 'demo-p-candle', vendorId: 'demo-v-sankofa',
    title: 'Soy Wax Candle — Shea & Lemongrass', slug: 'demo-soy-candle-shea-lemongrass',
    price_ghs: 70, unit: 'each', images: ['/images/prod-candle.jpg'],
    category: 'handmade_crafts',
    short_description: '45-hour soy candle poured into a reusable glass, scented with Ghanaian lemongrass.',
    description: 'Clean-burning soy wax, cotton wick, and essential oils of lemongrass and shea blossom. When it burns down, the glass becomes your new cup — bring it back for a refill discount.',
    value_tags: ['handmade', 'zero_waste'],
    views: 265, order_count: 38, stock_quantity: 22,
  }),

  // ── EcoCycle Ghana (recycled & upcycled)
  product({
    id: 'demo-p-tote', vendorId: 'demo-v-ecocycle',
    title: 'Reclaimed Kraft Tote Bag', slug: 'demo-reclaimed-kraft-tote',
    price_ghs: 55, unit: 'each', images: ['/images/prod-totebag.jpg'],
    category: 'recycled_upcycled',
    short_description: 'Washable kraft-paper tote pressed from reclaimed packaging — carries 10kg.',
    description: 'Made from reclaimed kraft paper recovered in Tema, pressed and stitched into a washable, tear-resistant everyday tote. Carries 10kg of market shopping and composts at end of life.',
    value_tags: ['upcycled', 'zero_waste', 'biodegradable'],
    views: 312, order_count: 51, stock_quantity: 45,
  }),
  product({
    id: 'demo-p-soap', vendorId: 'demo-v-ecocycle',
    title: 'Zero-Waste Soap Bars (4 pack)', slug: 'demo-zero-waste-soap-bars',
    price_ghs: 60, unit: 'per pack', images: ['/images/prod-soap.jpg'],
    category: 'recycled_upcycled',
    short_description: 'Cold-process bars from recovered plant oils, wrapped in reclaimed paper.',
    description: 'Four cold-process bars saponified from recovered and filtered plant oils — lavender, neem, charcoal and unscented. Wrapped in our own reclaimed paper. Plastic never touches this product.',
    value_tags: ['upcycled', 'zero_waste', 'plastic_free'],
    views: 289, order_count: 44, stock_quantity: 38,
  }),
]

// ─── Query helpers (mirror ProductGrid filters) ────────────────────────────────

export interface DemoProductFilter {
  limit?: number
  category?: ProductCategory
  valueTags?: string[]
  search?: string
  sort?: string
  vendorId?: string
  region?: string
  minPrice?: number
  maxPrice?: number
}

export function getDemoProducts({
  limit = 20,
  category,
  valueTags,
  search,
  sort = 'newest',
  vendorId,
  region,
  minPrice,
  maxPrice,
}: DemoProductFilter = {}): Product[] {
  let items = [...DEMO_PRODUCTS]

  if (category) items = items.filter(p => p.category === category)
  if (vendorId) items = items.filter(p => p.vendor_id === vendorId)
  if (region) items = items.filter(p => p.region === region)
  if (typeof minPrice === 'number') items = items.filter(p => p.price_ghs >= minPrice)
  if (typeof maxPrice === 'number') items = items.filter(p => p.price_ghs <= maxPrice)
  if (valueTags && valueTags.length > 0) {
    items = items.filter(p => valueTags.every(t => (p.value_tags as string[]).includes(t)))
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase()
    items = items.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.short_description.toLowerCase().includes(q),
    )
  }

  switch (sort) {
    case 'price_asc':  items.sort((a, b) => a.price_ghs - b.price_ghs); break
    case 'price_desc': items.sort((a, b) => b.price_ghs - a.price_ghs); break
    case 'popular':    items.sort((a, b) => b.order_count - a.order_count); break
    default: break // keep curated order for "newest"
  }

  return items.slice(0, limit)
}

export function getDemoProductBySlug(slug: string): Product | undefined {
  return DEMO_PRODUCTS.find(p => p.slug === slug)
}

export function getDemoVendor(idOrSlug: string): VendorProfile | undefined {
  return DEMO_VENDORS.find(v => v.id === idOrSlug || v.slug === idOrSlug)
}
