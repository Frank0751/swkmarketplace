-- ─── SWK Marketplace, sample data seed ────────────────────────────────────────
--
-- Inserts the same 4 sample vendors + 13 sample products that the app shows in
-- demo mode, as REAL database rows. Use on a fresh/local Supabase project:
--
--   npx supabase db reset          (runs migrations, then this seed)
--
-- DO NOT run on production once real vendors exist. Demo accounts sign in with
-- password "Demo1234!" (change or delete them before going live).

do $$
declare
  uid_greenharvest uuid := '11111111-1111-4111-8111-111111111111';
  uid_adom         uuid := '22222222-2222-4222-8222-222222222222';
  uid_sankofa      uuid := '33333333-3333-4333-8333-333333333333';
  uid_ecocycle     uuid := '44444444-4444-4444-8444-444444444444';
  v_greenharvest uuid;
  v_adom         uuid;
  v_sankofa      uuid;
  v_ecocycle     uuid;
begin

  -- ── Auth users (local/dev pattern) ─────────────────────────────
  insert into auth.users
    (id, instance_id, aud, role, email, encrypted_password,
     email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
     created_at, updated_at, confirmation_token, recovery_token,
     email_change, email_change_token_new)
  values
    (uid_greenharvest, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'greenharvest@demo.swkghana.org', crypt('Demo1234!', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kwame Mensah"}',
     now(), now(), '', '', '', ''),
    (uid_adom, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'adom@demo.swkghana.org', crypt('Demo1234!', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ama Asante"}',
     now(), now(), '', '', '', ''),
    (uid_sankofa, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'sankofa@demo.swkghana.org', crypt('Demo1234!', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Abena Osei"}',
     now(), now(), '', '', '', ''),
    (uid_ecocycle, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'ecocycle@demo.swkghana.org', crypt('Demo1234!', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Yaw Darko"}',
     now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  -- ── Public users ───────────────────────────────────────────────
  insert into public.users (id, email, full_name, role, status) values
    (uid_greenharvest, 'greenharvest@demo.swkghana.org', 'Kwame Mensah', 'vendor', 'active'),
    (uid_adom,         'adom@demo.swkghana.org',         'Ama Asante',   'vendor', 'active'),
    (uid_sankofa,      'sankofa@demo.swkghana.org',      'Abena Osei',   'vendor', 'active'),
    (uid_ecocycle,     'ecocycle@demo.swkghana.org',     'Yaw Darko',    'vendor', 'active')
  on conflict (id) do nothing;

  -- ── Vendor profiles ────────────────────────────────────────────
  insert into public.vendor_profiles
    (user_id, business_name, business_description, category, location, region, phone,
     sustainability_statement, story, founders, year_founded, team_size, social_links,
     logo_url, banner_url, status, rating, review_count, total_sales, approved_at)
  values
    (uid_greenharvest, 'GreenHarvest Farms',
     'A youth-run regenerative farm collective producing honey, coffee and organic inputs while restoring degraded farmland in the Ashanti Region.',
     'agribusiness', 'Kumasi', 'Ashanti', '+233 24 111 1111',
     'We practise regenerative agriculture: zero synthetic pesticides, agroforestry intercropping, and beekeeping that pollinates over 40 hectares of smallholder farms around Kumasi.',
     E'GreenHarvest Farms began in 2021 when three agricultural science graduates returned to Kumasi and leased two hectares of exhausted farmland. Instead of chemicals, they rebuilt the soil with compost, cover crops and bees.\nToday the collective works with 35 smallholder farmers, runs Ghana''s first youth-led apiary school, and supplies raw forest honey and specialty coffee to buyers across the country.',
     '[{"name":"Kwame Mensah","role":"Co-founder & Farm Director","bio":"Agronomist (KNUST). Leads regenerative farming operations and the farmer training programme."},{"name":"Efua Boateng","role":"Co-founder & Head of Apiary","bio":"Beekeeper and food scientist. Built the apiary school that has trained 60+ young beekeepers."}]'::jsonb,
     2021, 14, '{"instagram":"https://instagram.com/greenharvestgh"}'::jsonb,
     '/images/cat-agribusiness.jpg', '/images/cat-agribusiness.jpg', 'approved', 4.9, 31, 220, now()),

    (uid_adom, 'Adom Organics',
     'Chemical-free fruits, vegetables and cold-pressed oils grown on family plots in the Akuapem hills and delivered fresh to Accra.',
     'organic_produce', 'Aburi', 'Eastern', '+233 24 222 2222',
     'Certified-organic growing methods, plastic-free crates, and a farm-gate pricing model that pays our 22 partner farmers 30% above market rates.',
     E'Adom Organics started as a weekend farmers'' stall run by siblings Ama and Kofi Asante. Frustrated that Aburi''s best chemical-free produce never reached city buyers, they organised neighbouring family farms into a single delivery network.\nAdom now delivers over 300 veggie boxes a month in reusable crates.',
     '[{"name":"Ama Asante","role":"Co-founder & CEO","bio":"Former nurse turned farmer-organiser. Handles quality, logistics and the veggie-box programme."},{"name":"Kofi Asante","role":"Co-founder & Farm Relations","bio":"Works with the 22 partner family farms on organic certification and fair pricing."}]'::jsonb,
     2022, 9, '{"instagram":"https://instagram.com/adomorganics"}'::jsonb,
     '/images/cat-organic.jpg', '/images/hero-market.jpg', 'approved', 4.8, 47, 415, now()),

    (uid_sankofa, 'Sankofa Crafts Collective',
     'A women-led artisan collective crafting ceramics, jewellery and home goods from natural and reclaimed materials in Jamestown, Accra.',
     'handmade_crafts', 'Accra', 'Greater Accra', '+233 24 333 3333',
     'Local clay, reclaimed glass beads, natural soy wax and zero air-freighted materials. 70% of our makers are young women learning a lifelong craft.',
     E'Sankofa, "go back and get it", is a Jamestown studio where traditional Ga craftsmanship meets modern design. What began as evening pottery classes for six young women is now a 19-member collective.\nThe collective reinvests a fifth of every sale into free apprenticeships for school leavers.',
     '[{"name":"Abena Osei","role":"Founder & Creative Director","bio":"Ceramicist trained in Kumasi and Copenhagen. Named a 2025 Design Network Africa fellow."},{"name":"Naa Adjeley Quaye","role":"Studio Manager","bio":"Runs the apprenticeship programme and the collective''s fair-pay framework."}]'::jsonb,
     2020, 19, '{"instagram":"https://instagram.com/sankofacrafts","facebook":"https://facebook.com/sankofacrafts"}'::jsonb,
     '/images/cat-handmade.jpg', '/images/cat-handmade.jpg', 'approved', 4.9, 58, 640, now()),

    (uid_ecocycle, 'EcoCycle Ghana',
     'Turning Tema''s waste stream into everyday products, kraft totes, zero-waste soap and stationery made from reclaimed paper and oils.',
     'recycled_upcycled', 'Tema', 'Greater Accra', '+233 24 444 4444',
     'Every product diverts waste from landfill: reclaimed kraft paper, recovered cooking oils saponified into soap, and compostable packaging only.',
     E'EcoCycle was founded by two environmental engineering students who audited their campus bins and found 80% of the "waste" was reusable.\nStarting with a single paper press in a Tema garage, the team now processes three tonnes of reclaimed paper and oils a month, employs 11 young people, and runs recycling drives in 15 schools.',
     '[{"name":"Yaw Darko","role":"Co-founder & Operations Lead","bio":"Environmental engineer. Designs the reclaimed-material production lines."},{"name":"Esi Nyarko","role":"Co-founder & Partnerships","bio":"Runs the schools recycling programme and retail partnerships."}]'::jsonb,
     2023, 11, '{"twitter":"https://x.com/ecocyclegh"}'::jsonb,
     '/images/cat-recycled.jpg', '/images/cat-recycled.jpg', 'approved', 4.7, 22, 180, now())
  on conflict do nothing;

  select id into v_greenharvest from public.vendor_profiles where user_id = uid_greenharvest;
  select id into v_adom         from public.vendor_profiles where user_id = uid_adom;
  select id into v_sankofa      from public.vendor_profiles where user_id = uid_sankofa;
  select id into v_ecocycle     from public.vendor_profiles where user_id = uid_ecocycle;

  -- ── Products ───────────────────────────────────────────────────
  insert into public.products
    (vendor_id, title, slug, description, short_description, price_ghs,
     stock_quantity, images, category, sdg_tags, value_tags, location, region,
     unit, status, views, order_count)
  values
    (v_greenharvest, 'Raw Forest Honey (500ml)', 'raw-forest-honey',
     E'Raw, unheated and unfiltered honey from our agroforestry apiaries in the Ashanti Region. Each jar is traceable to the hive cluster it came from.\nTasting notes: wildflower, citrus blossom, soft caramel finish.',
     'Unfiltered honey from agroforestry hives around Kumasi, harvested by youth-trained beekeepers.',
     65, 40, array['/images/prod-honey.jpg'], 'agribusiness',
     array['sdg_12_responsible_consumption','sdg_8_decent_work','sdg_15_life_on_land']::text[],
     array['organic','youth_led','locally_sourced']::text[], 'Kumasi', 'Ashanti', 'per jar', 'approved', 342, 58),

    (v_greenharvest, 'Highland Roasted Coffee Beans (250g)', 'highland-roasted-coffee-beans',
     'Grown under native canopy trees by our partner smallholders, hand-picked, sun-dried and roasted in small batches in Kumasi. Medium roast with notes of cocoa and red berries.',
     'Shade-grown Ghanaian arabica, sun-dried and small-batch roasted.',
     48, 30, array['/images/prod-coffee.jpg'], 'agribusiness',
     array['sdg_12_responsible_consumption','sdg_13_climate_action']::text[],
     array['locally_sourced','fair_trade']::text[], 'Kumasi', 'Ashanti', 'per bag', 'approved', 261, 34),

    (v_greenharvest, 'Vegetable Seedling Starter Tray (24 cells)', 'vegetable-seedling-starter-tray',
     'Hardened-off tomato, chilli pepper and kontomire seedlings selected for Ghanaian conditions. The coir tray composts straight into your soil.',
     'Nursery-raised tomato, pepper and kontomire seedlings in biodegradable trays.',
     35, 18, array['/images/impact-seedling.jpg'], 'agribusiness',
     array['sdg_12_responsible_consumption','sdg_13_climate_action']::text[],
     array['biodegradable','organic']::text[], 'Kumasi', 'Ashanti', 'per tray', 'approved', 148, 19),

    (v_adom, 'Weekly Organic Veggie Box', 'weekly-organic-veggie-box',
     E'8â€“10 seasonal vegetables harvested within 24 hours of delivery, garden eggs, kontomire, sweet peppers, spring onions and salad greens. Delivered in returnable crates, never plastic.\nDelivery to Accra & Tema every Saturday.',
     'A rotating box of 8â€“10 chemical-free vegetables from Akuapem family farms.',
     120, 20, array['/images/prod-veg-box.jpg'], 'organic_produce',
     array['sdg_12_responsible_consumption']::text[],
     array['organic','plastic_free','locally_sourced']::text[], 'Aburi', 'Eastern', 'per box', 'approved', 505, 92),

    (v_adom, 'Vine-Ripened Tomatoes (1kg)', 'vine-ripened-tomatoes',
     'Grown in open fields with compost and neem-based pest control only. Picked ripe, not gassed, so they actually taste like tomatoes.',
     'Sun-ripened on the vine in the Akuapem hills. No sprays, ever.',
     22, 50, array['/images/prod-tomatoes.jpg'], 'organic_produce',
     array['sdg_12_responsible_consumption']::text[],
     array['organic','locally_sourced']::text[], 'Aburi', 'Eastern', 'per kg', 'approved', 210, 40),

    (v_adom, 'Organic Bananas (bunch)', 'organic-bananas',
     'Sweet, naturally ripened bananas intercropped with cocoa and plantain, no ripening chemicals, no monoculture.',
     'Naturally ripened bananas from mixed-crop family plots.',
     18, 60, array['/images/prod-bananas.jpg'], 'organic_produce',
     array['sdg_12_responsible_consumption']::text[],
     array['organic']::text[], 'Aburi', 'Eastern', 'per bunch', 'approved', 176, 28),

    (v_adom, 'Sweet Watermelon', 'sweet-watermelon',
     'Heavy, crisp and deep red inside. Grown on open fields in the Eastern Region with drip irrigation and zero synthetic inputs.',
     'Field-grown watermelon, chemical-free and picked at peak sweetness.',
     25, 35, array['/images/prod-watermelon.jpg'], 'organic_produce',
     array['sdg_12_responsible_consumption']::text[],
     array['organic','locally_sourced']::text[], 'Aburi', 'Eastern', 'each', 'approved', 132, 21),

    (v_adom, 'Cold-Pressed Baobab Oil (100ml)', 'cold-pressed-baobab-oil',
     'Wild-harvested baobab seeds from northern Ghana, cold-pressed within days of collection. Rich in omega fatty acids, a natural moisturiser for skin and hair. Amber glass bottle, zero plastic.',
     'Single-origin baobab seed oil for skin and hair, pressed in small batches.',
     85, 24, array['/images/prod-shea.jpg'], 'organic_produce',
     array['sdg_12_responsible_consumption']::text[],
     array['organic','plastic_free','women_led']::text[], 'Aburi', 'Eastern', 'per bottle', 'approved', 298, 45),

    (v_sankofa, 'Hand-Thrown Ceramic Vase Set (3 pieces)', 'hand-thrown-ceramic-vase-set',
     E'A set of three bottle vases in speckled matte glaze, each thrown by hand from clay dug in the Eastern Region. No two sets are identical.\nFood-safe glaze, fired with efficient twin kilns.',
     'Matte stoneware vases thrown from local clay in our Jamestown studio.',
     240, 8, array['/images/prod-pottery.jpg'], 'handmade_crafts',
     array['sdg_12_responsible_consumption','sdg_8_decent_work']::text[],
     array['handmade','women_led','locally_sourced']::text[], 'Accra', 'Greater Accra', 'per set', 'approved', 387, 26),

    (v_sankofa, 'Recycled-Glass Statement Earrings', 'recycled-glass-statement-earrings',
     'Statement earrings built around Krobo recycled-glass beads, hand-set in locally cast brass. Each pair supports our free apprenticeship programme for young women in Jamestown.',
     'Krobo recycled-glass beads set in brass, crafted by our women-led studio.',
     95, 15, array['/images/prod-jewelry.jpg'], 'handmade_crafts',
     array['sdg_12_responsible_consumption','sdg_8_decent_work']::text[],
     array['handmade','upcycled','women_led']::text[], 'Accra', 'Greater Accra', 'per pair', 'approved', 441, 63),

    (v_sankofa, 'Soy Wax Candle, Shea & Lemongrass', 'soy-wax-candle-shea-lemongrass',
     'Clean-burning soy wax, cotton wick, and essential oils of lemongrass and shea blossom. When it burns down, the glass becomes your new cup, bring it back for a refill discount.',
     '45-hour soy candle poured into a reusable glass, scented with Ghanaian lemongrass.',
     70, 22, array['/images/prod-candle.jpg'], 'handmade_crafts',
     array['sdg_12_responsible_consumption']::text[],
     array['handmade','zero_waste']::text[], 'Accra', 'Greater Accra', 'each', 'approved', 265, 38),

    (v_ecocycle, 'Reclaimed Kraft Tote Bag', 'reclaimed-kraft-tote-bag',
     'Made from reclaimed kraft paper recovered in Tema, pressed and stitched into a washable, tear-resistant everyday tote. Carries 10kg of market shopping and composts at end of life.',
     'Washable kraft-paper tote pressed from reclaimed packaging, carries 10kg.',
     55, 45, array['/images/prod-totebag.jpg'], 'recycled_upcycled',
     array['sdg_12_responsible_consumption','sdg_13_climate_action']::text[],
     array['upcycled','zero_waste','biodegradable']::text[], 'Tema', 'Greater Accra', 'each', 'approved', 312, 51),

    (v_ecocycle, 'Zero-Waste Soap Bars (4 pack)', 'zero-waste-soap-bars',
     'Four cold-process bars saponified from recovered and filtered plant oils, lavender, neem, charcoal and unscented. Wrapped in our own reclaimed paper.',
     'Cold-process bars from recovered plant oils, wrapped in reclaimed paper.',
     60, 38, array['/images/prod-soap.jpg'], 'recycled_upcycled',
     array['sdg_12_responsible_consumption']::text[],
     array['upcycled','zero_waste','plastic_free']::text[], 'Tema', 'Greater Accra', 'per pack', 'approved', 289, 44)
  on conflict do nothing;

end $$;
