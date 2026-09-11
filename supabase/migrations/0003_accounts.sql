-- Contas de cliente (Supabase Auth). Senhas, confirmação de e-mail, redefinição e limites de
-- tentativa ficam no Auth; aqui só o perfil e o vínculo dos pedidos ao usuário.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  cep text not null default '' check (cep = '' or cep ~ '^[0-9]{5}-?[0-9]{3}$'),
  city text not null default '' check (char_length(city) <= 80),
  address text not null default '' check (char_length(address) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "owner reads profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "owner inserts profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "owner updates profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
grant select, insert, update on public.profiles to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Cria o perfil automaticamente no cadastro (nome vindo do Google ou do formulário).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''), 80))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Pedidos ligados à conta (visitantes continuam podendo comprar).
alter table public.orders add column user_id uuid references auth.users (id) on delete set null;
create index orders_user_idx on public.orders (user_id, created_at desc);
create policy "owner reads orders" on public.orders for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner reads order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
grant select on public.orders, public.order_items to authenticated;
grant select on public.products, public.store_settings to authenticated;
grant execute on function public.place_order(jsonb, text, text, jsonb) to authenticated;
grant execute on function public.subscribe_newsletter(text) to authenticated;
grant execute on function public.get_order(text, text) to authenticated;

-- place_order: grava user_id quando há sessão e usa o e-mail da conta.
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
  v_user uuid := (select auth.uid());
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
  if v_user is not null then
    select lower(email) into v_email from auth.users where id = v_user;
  end if;
  if (select count(*) from public.orders
      where customer_email = v_email and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Muitos pedidos em pouco tempo. Tente novamente mais tarde.' using errcode = '53400';
  end if;

  select jsonb_object_agg(key, value) into v_settings from public.store_settings;

  v_code := 'AV-' || upper(to_hex((extract(epoch from now()) * 1000)::bigint)) || '-'
            || upper(substr(md5(gen_random_uuid()::text), 1, 4));

  insert into public.orders (code, payment, shipping, subtotal_cents, delivery_cents, total_cents,
                             customer_name, customer_email, cep, city, address, user_id)
  values (v_code, p_payment, p_shipping, 0, 0, 0,
          trim(p_customer->>'name'), v_email, trim(p_customer->>'cep'),
          trim(p_customer->>'city'), trim(p_customer->>'address'), v_user)
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

  -- Guarda o endereço no perfil para o próximo checkout.
  if v_user is not null then
    update public.profiles
    set name = coalesce(nullif(trim(p_customer->>'name'), ''), name),
        cep = trim(p_customer->>'cep'), city = trim(p_customer->>'city'), address = trim(p_customer->>'address')
    where id = v_user;
  end if;

  return jsonb_build_object(
    'code', v_code, 'status', 'aguardando_pagamento', 'count', v_count,
    'subtotal_cents', v_subtotal, 'delivery_cents', v_delivery, 'total_cents', v_subtotal + v_delivery
  );
end;
$$;

-- Uploads do estúdio também para clientes logados.
create policy "users upload designs into uuid folders" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'designs'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and storage.filename(name) in ('preview.jpg', 'art.webp')
  );
