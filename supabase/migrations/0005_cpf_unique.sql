-- Uma conta por CPF: índice único parcial (contas sem CPF continuam permitidas).
create unique index if not exists profiles_cpf_unique
  on public.profiles (cpf) where cpf is not null;
