-- ============================================================
-- PortReady · Supabase (PostgreSQL) Şema
-- 3 katman: PUBLIC (ortak) · TENANT (özel/RLS) · DERIVED (türetilmiş)
-- Supabase SQL Editor'a yapıştırıp çalıştırabilirsin.
-- ============================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ============================================================
-- 1) REFERANS + PUBLIC KATMAN  (herkes okur, sadece servis-rolü yazar)
-- ============================================================

create table mou_regions (
  id    uuid primary key default gen_random_uuid(),
  code  text unique not null,          -- 'paris' | 'med' | 'blacksea' | 'tokyo'
  name  text not null
);

create table ports (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  country       text,
  mou_region_id uuid references mou_regions(id),
  unlocode      text
);

create table cic_campaigns (
  id                 uuid primary key default gen_random_uuid(),
  year               int  not null,
  topic              text not null,    -- '2026: Cargo Securing'
  start_date         date,
  end_date           date,
  applicable_regions text[]            -- ['paris','med','blacksea']
);

create table ships (
  id             uuid primary key default gen_random_uuid(),
  imo            text unique not null, -- doğal anahtar
  name           text,
  ship_type      text,                 -- 'General cargo/Multipurpose' | 'Container'...
  flag           text,
  year_built     int,
  gross_tonnage  int,
  dwt            int,
  class_society  text,                 -- 'Bureau Veritas (IACS)' / 'Phoenix Register'
  ism_manager    text,
  call_sign      text,
  previous_names text[],
  updated_at     timestamptz default now()
);

-- PSC denetim olayları. org_id NULL => public (Equasis); dolu => bir kiracı yükledi.
create table psc_inspections (
  id              uuid primary key default gen_random_uuid(),
  ship_id         uuid not null references ships(id) on delete cascade,
  mou_region_id   uuid references mou_regions(id),
  port_id         uuid references ports(id),
  org_id          uuid,                -- NULL=public, dolu=tenant
  report_date     date not null,
  authority       text,                -- 'Turkey', 'Germany'...
  inspection_type text,                -- 'More detailed inspection'...
  detention       boolean default false,
  duration_days   int,
  num_deficiencies int,
  source          text default 'equasis',  -- 'equasis' | 'uploaded'
  physical_group  uuid                 -- aynı fiziksel denetimin çift-kaydını eşler
);

create table deficiencies (
  id              uuid primary key default gen_random_uuid(),
  inspection_id   uuid not null references psc_inspections(id) on delete cascade,
  category        text not null,       -- 'Fire safety', 'Safety of Navigation'...
  sub_category    text,
  deficiency_text text,
  defect_text     text,                -- 'Not as required', 'Corroded'...
  code            text,                -- varsa sayısal kod
  is_detainable   boolean default false,
  count           int default 1
);

-- ============================================================
-- 2) DERIVED (TÜRETİLMİŞ) KATMAN  - public veriden hesaplanır, rapor motoru buradan çeker
-- ============================================================

create table deficiency_baselines (
  id                 uuid primary key default gen_random_uuid(),
  mou_region_id      uuid references mou_regions(id),
  ship_type          text,
  category           text,
  rank               int,              -- bölge+tip içinde sıralama
  pct                numeric,          -- toplam içindeki yüzde
  is_detainable_top  boolean default false,
  period_year        int
);

-- ============================================================
-- 3) TENANT (ÖZEL) KATMAN  - RLS ile korunur, müşteriye özel
-- ============================================================

create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  country    text,
  created_at timestamptz default now()
);

create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid not null references organizations(id) on delete cascade,
  email      text,
  full_name  text,
  role       text default 'dpa',       -- 'dpa' | 'superintendent' | 'viewer'
  created_at timestamptz default now()
);

-- Filo üyeliği: hangi gemi hangi şirketin filosunda
create table organization_ships (
  org_id       uuid not null references organizations(id) on delete cascade,
  ship_id      uuid not null references ships(id) on delete cascade,
  internal_ref text,
  added_at     timestamptz default now(),
  primary key (org_id, ship_id)
);

-- Yüklenen belgeler (PSC rapor taraması, sertifika PDF/foto) - Supabase Storage'a işaret eder
create table documents (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  ship_id     uuid not null references ships(id) on delete cascade,
  doc_type    text not null,           -- 'psc_report' | 'certificate' | 'other'
  file_path   text not null,           -- storage yolu
  parse_status text default 'pending', -- 'pending' | 'done' | 'failed'
  uploaded_by uuid references users(id),
  uploaded_at timestamptz default now()
);

-- Sertifikalar. org_id NULL => public (Equasis); dolu => kiracının yüklediği güncel sertifika.
create table certificates (
  id          uuid primary key default gen_random_uuid(),
  ship_id     uuid not null references ships(id) on delete cascade,
  org_id      uuid,                    -- NULL=public
  cert_type   text not null,
  issuer      text,                    -- RO / bayrak
  issue_date  date,
  expiry_date date,
  source      text default 'equasis'   -- is_interim'i sorguda hesapla (süre kısa mı)
);

-- Üretilen raporlar (cache - maliyet için: veri değişmedikçe yeniden üretme)
create table reports (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  ship_id       uuid not null references ships(id) on delete cascade,
  next_port_id  uuid references ports(id),
  mou_region_id uuid references mou_regions(id),
  content       jsonb,                 -- üretilen rapor gövdesi
  pdf_path      text,
  generated_at  timestamptz default now()
);

-- ============================================================
-- 4) İNDEKSLER (sık sorgular)
-- ============================================================
create index idx_insp_ship      on psc_inspections(ship_id);
create index idx_insp_region    on psc_inspections(mou_region_id);
create index idx_insp_org       on psc_inspections(org_id);
create index idx_def_inspection on deficiencies(inspection_id);
create index idx_def_category   on deficiencies(category);
create index idx_cert_ship      on certificates(ship_id);
create index idx_baseline_lookup on deficiency_baselines(mou_region_id, ship_type);
create index idx_orgships_org   on organization_ships(org_id);

-- ============================================================
-- 5) RLS (ÇOK-KİRACILI GÜVENLİK)
-- ============================================================

-- Giriş yapan kullanıcının org'unu döndüren yardımcı
create or replace function current_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from public.users where id = auth.uid()
$$;

-- --- PUBLIC tablolar: giriş yapan herkes OKUR; yazma sadece servis-rolünde (RLS bypass) ---
alter table mou_regions          enable row level security;
alter table ports                enable row level security;
alter table cic_campaigns        enable row level security;
alter table ships                enable row level security;
alter table deficiency_baselines enable row level security;

create policy read_all_mou       on mou_regions          for select to authenticated using (true);
create policy read_all_ports     on ports                for select to authenticated using (true);
create policy read_all_cic       on cic_campaigns        for select to authenticated using (true);
create policy read_all_ships     on ships                for select to authenticated using (true);
create policy read_all_baselines on deficiency_baselines for select to authenticated using (true);

-- --- PSC inspections / certificates: public (org_id NULL) VEYA kendi org'un ---
alter table psc_inspections enable row level security;
alter table certificates    enable row level security;

create policy read_insp on psc_inspections for select to authenticated
  using (org_id is null or org_id = current_org_id());
create policy write_insp on psc_inspections for insert to authenticated
  with check (org_id = current_org_id());

create policy read_cert on certificates for select to authenticated
  using (org_id is null or org_id = current_org_id());
create policy write_cert on certificates for insert to authenticated
  with check (org_id = current_org_id());

-- deficiencies: bağlı olduğu inspection görünürse görünür
alter table deficiencies enable row level security;
create policy read_def on deficiencies for select to authenticated using (
  exists (select 1 from psc_inspections i
          where i.id = inspection_id
            and (i.org_id is null or i.org_id = current_org_id()))
);

-- --- TAMAMEN ÖZEL tablolar: sadece kendi org'un ---
alter table organizations      enable row level security;
alter table users              enable row level security;
alter table organization_ships enable row level security;
alter table documents          enable row level security;
alter table reports            enable row level security;

create policy own_org      on organizations      for all to authenticated
  using (id = current_org_id())          with check (id = current_org_id());
create policy own_users    on users              for all to authenticated
  using (org_id = current_org_id())      with check (org_id = current_org_id());
create policy own_fleet    on organization_ships for all to authenticated
  using (org_id = current_org_id())      with check (org_id = current_org_id());
create policy own_docs     on documents          for all to authenticated
  using (org_id = current_org_id())      with check (org_id = current_org_id());
create policy own_reports  on reports            for all to authenticated
  using (org_id = current_org_id())      with check (org_id = current_org_id());

-- NOT: Equasis verisini (ships, psc_inspections org_id=NULL, baselines) servis-rolü
-- anahtarıyla (RLS bypass) sen yüklersin; normal kullanıcılar yalnızca okur.
