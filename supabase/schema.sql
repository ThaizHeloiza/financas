-- Finanças: estrutura do banco no Supabase
-- Rode este arquivo inteiro em: Supabase > SQL Editor > New query > Run

-- Cada registro do app (lançamento, conta fixa, meta, depósito, salário recebido
-- e a configuração) fica numa linha, com o conteúdo em JSON.
create table if not exists public.docs (
  col        text        not null check (col in ('config','lanc','fixas','metas','aportes','receb')),
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  updated_by uuid        default auth.uid(),
  primary key (col, id)
);

-- Segurança: só usuários logados leem e escrevem.
-- Como o cadastro público fica DESLIGADO (ver README), só as contas criadas
-- por vocês no painel conseguem entrar.
alter table public.docs enable row level security;

drop policy if exists "logados podem ler"      on public.docs;
drop policy if exists "logados podem inserir"  on public.docs;
drop policy if exists "logados podem alterar"  on public.docs;
drop policy if exists "logados podem apagar"   on public.docs;

create policy "logados podem ler"     on public.docs for select to authenticated using (true);
create policy "logados podem inserir" on public.docs for insert to authenticated with check (true);
create policy "logados podem alterar" on public.docs for update to authenticated using (true) with check (true);
create policy "logados podem apagar"  on public.docs for delete to authenticated using (true);

-- Sincronização ao vivo entre os aparelhos
do $$
begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null;
end $$;
