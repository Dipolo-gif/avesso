-- O site usa apenas a chave pública (papel anon); nenhuma função precisa do papel authenticated.
-- rls_auto_enable() é o gatilho interno criado pela opção "Enable automatic RLS" do projeto.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.place_order(jsonb, text, text, jsonb) from authenticated;
revoke execute on function public.subscribe_newsletter(text) from authenticated;
revoke execute on function public.get_order(text, text) from authenticated;
