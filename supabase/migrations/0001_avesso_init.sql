-- DOAVESSO — esquema inicial.
-- Princípios: catálogo público somente leitura; pedidos, itens e newsletter sem acesso
-- direto pela chave pública (RLS ativo, sem políticas) — apenas via funções SECURITY DEFINER
-- que validam tudo e recalculam os preços no servidor.

create table public.store_settings (
  key text primary key,
  value jsonb not null
);
alter table public.store_settings enable row level security;
create policy "settings are public" on public.store_settings
  for select to anon, authenticated using (true);

insert into public.store_settings (key, value) values
  ('free_shipping_min_cents', '25000'),
  ('shipping_standard_cents', '1490'),
  ('shipping_express_cents', '2490'),
  ('custom_create_cents', '12990'),
  ('custom_brief_cents', '14990');

create table public.products (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 80),
  category text not null check (category in ('graphic', 'essential')),
  color text not null,
  base text not null check (base in ('white', 'black')),
  price_cents integer not null check (price_cents > 0),
  tag text not null default '',
  graphic text not null default '',
  graphic_class text not null default '',
  description text not null default '',
  print text not null default '',
  fabric text not null default '',
  finish text not null default '',
  fit text not null default '',
  care text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "active products are public" on public.products
  for select to anon, authenticated using (active);

create table public.orders (
  id bigint generated always as identity primary key,
  code text not null unique,
  created_at timestamptz not null default now(),
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento', 'pago', 'em_producao', 'enviado', 'entregue', 'cancelado')),
  payment text not null check (payment in ('Pix', 'Cartão')),
  shipping text not null check (shipping in ('standard', 'express')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_cents integer not null check (delivery_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  customer_name text not null check (char_length(customer_name) between 3 and 80),
  customer_email text not null check (customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(customer_email) <= 120),
  cep text not null check (cep ~ '^[0-9]{5}-?[0-9]{3}$'),
  city text not null check (char_length(city) between 2 and 80),
  address text not null check (char_length(address) between 5 and 160)
);
create index orders_email_created_idx on public.orders (customer_email, created_at desc);
alter table public.orders enable row level security;

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  product_id text references public.products (id),
  kind text not null check (kind in ('catalog', 'custom', 'brief')),
  name text not null,
  base text not null check (base in ('white', 'black')),
  size text not null check (size in ('P', 'M', 'G', 'GG')),
  qty integer not null check (qty between 1 and 10),
  unit_price_cents integer not null check (unit_price_cents > 0),
  design jsonb,
  preview_path text check (preview_path is null or preview_path ~ '^[0-9a-f-]{36}/preview\.jpg$'),
  image_path text check (image_path is null or image_path ~ '^[0-9a-f-]{36}/art\.webp$')
);
create index order_items_order_idx on public.order_items (order_id);
alter table public.order_items enable row level security;

create table public.newsletter_subscribers (
  email text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 120),
  created_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;

-- Bucket privado para prévias e artes enviadas no estúdio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('designs', 'designs', false, 5242880, array['image/webp', 'image/jpeg']);

create policy "anon uploads designs into uuid folders" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'designs'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and storage.filename(name) in ('preview.jpg', 'art.webp')
  );

-- Funções server-side --------------------------------------------------------

create or replace function public.subscribe_newsletter(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(p_email) > 120 then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  insert into public.newsletter_subscribers (email) values (lower(trim(p_email)))
  on conflict (email) do nothing;
end;
$$;

create or replace function public.place_order(
  p_customer jsonb,
  p_shipping text,
  p_payment text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings jsonb;
  v_item jsonb;
  v_product public.products%rowtype;
  v_kind text;
  v_qty integer;
  v_price integer;
  v_subtotal integer := 0;
  v_count integer := 0;
  v_delivery integer;
  v_order_id bigint;
  v_code text;
  v_email text;
  v_design jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'Sacola vazia ou inválida.' using errcode = '22023';
  end if;
  if p_shipping not in ('standard', 'express') then
    raise exception 'Entrega inválida.' using errcode = '22023';
  end if;
  if p_payment not in ('Pix', 'Cartão') then
    raise exception 'Pagamento inválido.' using errcode = '22023';
  end if;

  v_email := lower(trim(p_customer->>'email'));
  if (select count(*) from public.orders
      where customer_email = v_email and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Muitos pedidos em pouco tempo. Tente novamente mais tarde.' using errcode = '53400';
  end if;

  select jsonb_object_agg(key, value) into v_settings from public.store_settings;

  v_code := 'AV-' || upper(to_hex((extract(epoch from now()) * 1000)::bigint)) || '-'
            || upper(substr(md5(gen_random_uuid()::text), 1, 4));

  insert into public.orders (code, payment, shipping, subtotal_cents, delivery_cents, total_cents,
                             customer_name, customer_email, cep, city, address)
  values (v_code, p_payment, p_shipping, 0, 0, 0,
          trim(p_customer->>'name'), v_email, trim(p_customer->>'cep'),
          trim(p_customer->>'city'), trim(p_customer->>'address'))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_kind := v_item->>'kind';
    v_qty := (v_item->>'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 10 then
      raise exception 'Quantidade inválida.' using errcode = '22023';
    end if;

    if v_kind = 'catalog' then
      select * into v_product from public.products where id = v_item->>'product_id' and active;
      if not found then
        raise exception 'Produto indisponível: %', v_item->>'product_id' using errcode = '22023';
      end if;
      v_price := v_product.price_cents;
      insert into public.order_items (order_id, product_id, kind, name, base, size, qty, unit_price_cents)
      values (v_order_id, v_product.id, 'catalog', v_product.name, v_product.base, v_item->>'size', v_qty, v_price);
    elsif v_kind in ('custom', 'brief') then
      v_price := case v_kind when 'brief' then (v_settings->>'custom_brief_cents')::integer
                                          else (v_settings->>'custom_create_cents')::integer end;
      v_design := coalesce(v_item->'design', '{}'::jsonb);
      if v_kind = 'brief' and char_length(coalesce(v_design->>'brief', '')) < 10 then
        raise exception 'Descreva a estampa com pelo menos 10 caracteres.' using errcode = '22023';
      end if;
      if jsonb_typeof(v_design) <> 'object' or pg_column_size(v_design) > 4096 then
        raise exception 'Personalização inválida.' using errcode = '22023';
      end if;
      insert into public.order_items (order_id, kind, name, base, size, qty, unit_price_cents, design, preview_path, image_path)
      values (v_order_id, v_kind,
              case v_kind when 'brief' then 'Sua camiseta · Estampa sob medida' else 'Sua camiseta · Studio' end,
              v_item->>'base', v_item->>'size', v_qty, v_price, v_design,
              v_item->>'preview_path', v_item->>'image_path');
    else
      raise exception 'Item inválido.' using errcode = '22023';
    end if;

    v_subtotal := v_subtotal + v_price * v_qty;
    v_count := v_count + v_qty;
  end loop;

  v_delivery := case
    when p_shipping = 'express' then (v_settings->>'shipping_express_cents')::integer
    when v_subtotal >= (v_settings->>'free_shipping_min_cents')::integer then 0
    else (v_settings->>'shipping_standard_cents')::integer end;

  update public.orders
  set subtotal_cents = v_subtotal, delivery_cents = v_delivery, total_cents = v_subtotal + v_delivery
  where id = v_order_id;

  return jsonb_build_object(
    'code', v_code, 'status', 'aguardando_pagamento', 'count', v_count,
    'subtotal_cents', v_subtotal, 'delivery_cents', v_delivery, 'total_cents', v_subtotal + v_delivery
  );
end;
$$;

create or replace function public.get_order(p_code text, p_email text)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'code', o.code, 'status', o.status, 'created_at', o.created_at,
    'total_cents', o.total_cents, 'payment', o.payment, 'shipping', o.shipping,
    'items', (select jsonb_agg(jsonb_build_object('name', i.name, 'base', i.base, 'size', i.size, 'qty', i.qty, 'unit_price_cents', i.unit_price_cents) order by i.id)
              from public.order_items i where i.order_id = o.id)
  )
  from public.orders o
  where o.code = upper(trim(p_code)) and o.customer_email = lower(trim(p_email));
$$;

-- Exposição manual (o projeto não expõe tabelas novas automaticamente):
-- apenas leitura do catálogo e das configurações; nenhuma tabela de escrita é exposta.
grant usage on schema public to anon, authenticated;
grant select on public.products, public.store_settings to anon, authenticated;

-- Só as funções ficam acessíveis pela chave pública.
revoke all on function public.place_order(jsonb, text, text, jsonb) from public;
revoke all on function public.subscribe_newsletter(text) from public;
revoke all on function public.get_order(text, text) from public;
grant execute on function public.place_order(jsonb, text, text, jsonb) to anon, authenticated;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;
grant execute on function public.get_order(text, text) to anon, authenticated;
