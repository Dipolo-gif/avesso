-- Campos adicionais do perfil: contato, documento, localização e foto.
-- Todos opcionais; RLS já restringe leitura/escrita ao dono (migração 0003).
alter table public.profiles
  add column if not exists phone text
    check (phone is null or char_length(phone) between 8 and 20),
  add column if not exists cpf text
    check (cpf is null or cpf ~ '^[0-9]{11}$'),
  add column if not exists country text
    check (country is null or char_length(country) <= 2),
  add column if not exists state text
    check (state is null or state ~ '^[A-Z]{2}$'),
  add column if not exists avatar text
    check (avatar is null or (avatar like 'data:image/%' and char_length(avatar) <= 80000));

-- Os grants de tabela (0003) já cobrem as colunas novas para o papel authenticated.
