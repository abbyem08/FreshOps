-- =========================================================================
-- FreshOps v2 — Full Production Schema (Supabase / PostgreSQL)
-- =========================================================================
-- Run this entire file in Supabase: Project → SQL Editor → New query → paste
-- → Run. It creates every table, the customer-portal auth link, row-level
-- security so customers can only ever see their own data, and views for
-- computed financials (never store margin/remaining-case numbers directly).
-- =========================================================================

-- ---------- Internal staff users & roles ----------
create table users (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  email        text unique not null,
  role         text check (role in ('Admin','Operations','Sales','ReadOnly')) not null default 'Sales',
  active       boolean default true,
  created_at   timestamptz default now()
);

-- ---------- Customers, Suppliers, Products ----------
create table customers (
  customer_id      serial primary key,
  company           text not null,
  buyer_contact     text,
  phone             text,
  email             text,
  delivery_address  text,
  city              text,
  state             text,
  zip               text,
  delivery_notes    text,
  payment_terms     text,
  notes             text,
  active            boolean default true,
  -- portal login link: null until the customer accepts their invite
  portal_auth_id    uuid references auth.users(id),
  portal_invited_at timestamptz,
  created_at        timestamptz default now()
);

create table suppliers (
  supplier_id     serial primary key,
  company          text not null,
  contact          text,
  phone            text,
  email            text,
  pickup_address   text,
  city             text,
  state            text,
  zip              text,
  payment_terms    text,
  paca_license     text,
  notes            text,
  active           boolean default true
);

create table products (
  product_id             serial primary key,
  commodity               text not null,
  pack_size               text not null,
  gross_weight_per_case   numeric,
  cases_per_pallet        int,
  default_origin          text,
  notes                   text,
  active                  boolean default true,
  unique (commodity, pack_size)
);

-- ---------- Prospects (separate from Customers/Suppliers until converted) ----------
create table prospects (
  prospect_id    serial primary key,
  prospect_type    text check (prospect_type in ('Customer','Supplier')) not null,
  company           text not null,
  contact           text,
  phone             text,
  email             text,
  status            text check (status in ('New','Contacted','Quoted','Negotiating','Won','Lost')) default 'New',
  last_contact_date date,
  next_followup_date date,
  notes             text,
  converted_to_id   int, -- points to customer_id or supplier_id once won
  created_at        timestamptz default now()
);

-- ---------- Customer Orders ----------
create table customer_orders (
  customer_order_id   serial primary key,
  acumatica_order_no    text not null,
  customer_id            int references customers(customer_id),
  customer_po            text,
  order_date             date,
  requested_delivery     date,
  salesperson             text,
  order_status            text default 'Open',
  source                  text check (source in ('Internal','Portal Request')) default 'Internal',
  notes                   text
);
create index on customer_orders (acumatica_order_no);

create table order_lines (
  order_line_id       serial primary key,
  customer_order_id     int references customer_orders(customer_order_id),
  supplier_id            int references suppliers(supplier_id),
  shipper_po              text,
  product_id               int references products(product_id),
  cases_ordered             numeric not null,
  sell_price_per_case       numeric,
  fob_cost_per_case         numeric,
  pricing_type              text check (pricing_type in ('FOB','Delivered')),
  line_status                text default 'Open',
  notes                       text
);

-- ---------- Customer Portal: order requests (the review queue) ----------
create table order_requests (
  request_id       serial primary key,
  customer_id        int references customers(customer_id),
  requested_at        timestamptz default now(),
  status               text check (status in ('Pending','Approved','Rejected')) default 'Pending',
  reviewed_by           uuid references users(user_id),
  reviewed_at            timestamptz,
  converted_order_id      int references customer_orders(customer_order_id),
  notes                    text
);
create table order_request_lines (
  request_line_id   serial primary key,
  request_id          int references order_requests(request_id) on delete cascade,
  product_id            int references products(product_id),
  cases_requested        numeric not null,
  notes                   text
);

-- ---------- Jackets (trucks) ----------
create table jackets (
  jacket_id        serial primary key,
  jacket_number      text unique not null,
  jacket_date         date,
  carrier              text,
  driver               text,
  driver_phone         text,
  truck                text,
  trailer              text,
  truck_type           text,
  route                text,
  jacket_status         text check (jacket_status in
                         ('Planning','Booked','Loading','Dispatched',
                          'In Transit','Delivered','Closed','Cancelled')) default 'Planning',
  weight_capacity       numeric default 44000,
  pallet_capacity       numeric default 24,
  closed_at             timestamptz, -- set once finalized; closed jackets are locked from editing
  notes                 text
);

create table jacket_lines (
  jacket_line_id         serial primary key,
  jacket_id                int references jackets(jacket_id),
  order_line_id             int references order_lines(order_line_id),
  planned_cases              numeric,
  cases_to_load               numeric,
  actual_cases_loaded          numeric default 0,
  actual_cases_delivered       numeric default 0,
  estimated_pallets            numeric,
  line_weight                  numeric,
  load_status                  text default 'Planned',
  bol_number                    text,
  exception_notes                text,
  pod_url                        text, -- proof-of-delivery photo/attachment
  updated_at                      timestamptz default now(),
  notes                           text
);

-- Rolled / speculative product loaded but not tied to an order line
create table jacket_extras (
  extra_id       serial primary key,
  jacket_id        int references jackets(jacket_id),
  product_id        int references products(product_id),
  cases              numeric,
  status             text check (status in ('Unsold','Trying to Sell','Sold')) default 'Unsold',
  notes              text
);

create table stops (
  stop_id       serial primary key,
  jacket_id       int references jackets(jacket_id),
  stop_number      int,
  stop_type         text check (stop_type in ('Pickup','Delivery')),
  supplier_id        int references suppliers(supplier_id),
  customer_id         int references customers(customer_id),
  address              text,
  contact              text,
  phone                text,
  appointment          timestamptz,
  status               text default 'Planned',
  notes                text
);

create table stop_lines (
  stop_line_id     serial primary key,
  stop_id            int references stops(stop_id),
  jacket_line_id       int references jacket_lines(jacket_line_id),
  cases_at_stop          numeric,
  pallets_at_stop        numeric,
  notes                  text
);

create table freight_records (
  freight_id             serial primary key,
  jacket_id                int references jackets(jacket_id),
  quote_date                 date,
  carrier                     text,
  truck_type                   text,
  trip_type                     text check (trip_type in
                                 ('One Pick/One Drop','Multi Pick/One Drop',
                                  'One Pick/Multi Drop','Multi Pick/Multi Drop')),
  quoted_rate                    numeric,
  booked_rate                     numeric,
  miles                            numeric,
  status                            text default 'Quoted',
  carrier_invoice_number             text,
  invoice_received                     boolean default false,
  carrier_paid                          boolean default false,
  notes                                  text
);

-- ---------- Carriers (compliance) ----------
create table carriers (
  carrier_id      serial primary key,
  name              text not null,
  mc_number          text,
  dot_number          text,
  insurance_expiry     date,
  contact               text,
  phone                 text,
  active                boolean default true
);

-- ---------- Claims (operational only — AP/AR does the credit memo in Acumatica) ----------
create table claims (
  claim_id          serial primary key,
  jacket_line_id       int references jacket_lines(jacket_line_id),
  claim_type             text,
  description             text,
  date_opened              date default current_date,
  status                    text default 'Open',
  resolution                 text,
  flag_for_credit_memo         boolean default false
);

-- ---------- Market Calls / price quotes (the second workbook, now permanent) ----------
create table call_log (
  call_id           serial primary key,
  call_date            date default current_date,
  party_type             text check (party_type in ('Supplier','Customer','Prospect')),
  supplier_id              int references suppliers(supplier_id),
  customer_id               int references customers(customer_id),
  prospect_id                int references prospects(prospect_id),
  contact_name                 text,
  phone                         text,
  product_id                     int references products(product_id),
  price                           numeric,
  price_type                       text check (price_type in ('FOB','Delivered')),
  availability                      text,
  notes                              text,
  followup_date                      date,
  status                              text check (status in ('Quoted','Follow-up','Booked','Passed')) default 'Quoted'
);
-- price history view is just call_log filtered/grouped by product+date — see view below

-- ---------- Price Sheets ----------
create table price_sheets (
  price_sheet_id   serial primary key,
  sheet_date          date default current_date,
  valid_through         date,
  created_by             uuid references users(user_id),
  notes                   text
);
create table price_sheet_lines (
  price_sheet_line_id  serial primary key,
  price_sheet_id          int references price_sheets(price_sheet_id) on delete cascade,
  product_id                int references products(product_id),
  cost_price                  numeric,
  margin_pct                    numeric default 20,
  source_call_id                  int references call_log(call_id)
);
create table price_sheet_recipients (
  price_sheet_recipient_id  serial primary key,
  price_sheet_id               int references price_sheets(price_sheet_id) on delete cascade,
  customer_id                     int references customers(customer_id),
  sent_at                           timestamptz default now(),
  method                             text default 'Portal Link'
);

create table status_history (
  history_id     serial primary key,
  entity_type      text,
  entity_id          int not null,
  old_status           text,
  new_status            text,
  changed_by             uuid references users(user_id),
  changed_at              timestamptz default now()
);

-- =========================================================================
-- COMPUTED VIEWS — never hand-maintain these as stored columns
-- =========================================================================

create view v_order_line_assignment as
select ol.order_line_id, ol.cases_ordered,
  coalesce(sum(jl.cases_to_load) filter (where j.jacket_status <> 'Cancelled'), 0) as cases_assigned,
  ol.cases_ordered - coalesce(sum(jl.cases_to_load) filter (where j.jacket_status <> 'Cancelled'), 0) as remaining_to_assign
from order_lines ol
left join jacket_lines jl on jl.order_line_id = ol.order_line_id
left join jackets j on j.jacket_id = jl.jacket_id
group by ol.order_line_id, ol.cases_ordered;

create view v_order_line_financials as
select ol.order_line_id,
  ol.cases_ordered * ol.sell_price_per_case as revenue,
  ol.cases_ordered * ol.fob_cost_per_case as cost,
  (ol.cases_ordered * ol.sell_price_per_case) - (ol.cases_ordered * ol.fob_cost_per_case) as gross_margin
from order_lines ol;

create view v_jacket_freight_summary as
select f.freight_id, f.jacket_id, f.booked_rate, f.miles,
  case when f.miles > 0 then f.booked_rate / f.miles else null end as rate_per_mile,
  coalesce(sum(jl.actual_cases_loaded), 0) as loaded_cases,
  case when coalesce(sum(jl.actual_cases_loaded), 0) > 0
       then f.booked_rate / sum(jl.actual_cases_loaded) else null end as freight_per_case
from freight_records f
left join jacket_lines jl on jl.jacket_id = f.jacket_id
group by f.freight_id, f.jacket_id, f.booked_rate, f.miles;

-- price trend view: one row per product per day, showing the lowest quote seen that day
create view v_price_trend as
select product_id, call_date, min(price) as low_price, max(price) as high_price, avg(price) as avg_price
from call_log
where price is not null and party_type in ('Supplier','Prospect')
group by product_id, call_date
order by product_id, call_date;

-- =========================================================================
-- ROW LEVEL SECURITY — customers can only ever see their own data
-- =========================================================================

alter table customers enable row level security;
alter table order_requests enable row level security;
alter table order_request_lines enable row level security;
alter table price_sheets enable row level security;
alter table price_sheet_lines enable row level security;
alter table price_sheet_recipients enable row level security;
alter table products enable row level security;

-- staff (anyone in `users` table) can do anything — enforced via service-role
-- key on the internal app; customers connect with the anon key + these policies:

create policy "customers see only their own row"
  on customers for select
  using (portal_auth_id = auth.uid());

create policy "customers can view price sheets sent to them"
  on price_sheet_recipients for select
  using (customer_id in (select customer_id from customers where portal_auth_id = auth.uid()));

create policy "customers can view lines of sheets sent to them"
  on price_sheet_lines for select
  using (price_sheet_id in (
    select price_sheet_id from price_sheet_recipients
    where customer_id in (select customer_id from customers where portal_auth_id = auth.uid())
  ));

create policy "customers can view active products"
  on products for select
  using (active = true);

create policy "customers can view their own order requests"
  on order_requests for select
  using (customer_id in (select customer_id from customers where portal_auth_id = auth.uid()));

create policy "customers can submit order requests for themselves only"
  on order_requests for insert
  with check (customer_id in (select customer_id from customers where portal_auth_id = auth.uid()));

create policy "customers can add lines to their own requests"
  on order_request_lines for insert
  with check (request_id in (
    select request_id from order_requests
    where customer_id in (select customer_id from customers where portal_auth_id = auth.uid())
  ));

create policy "customers can view their own request lines"
  on order_request_lines for select
  using (request_id in (
    select request_id from order_requests
    where customer_id in (select customer_id from customers where portal_auth_id = auth.uid())
  ));
