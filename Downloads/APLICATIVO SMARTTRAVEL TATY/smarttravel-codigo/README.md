# SmartTravel

Aplicativo de viagens construído com Next.js e Supabase.

## Desenvolvimento local

1. Instale as dependências com `npm ci`.
2. Crie `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` do projeto Supabase de desenvolvimento.
3. Aplique as migrações em `supabase/migrations/` no banco de desenvolvimento.
4. Execute `supabase/seed.sql` somente no banco de desenvolvimento para inserir a viagem de demonstração. O seed pode ser executado novamente sem duplicar os mesmos itens.
5. Entre uma vez com magic link. Para tornar sua conta administradora da agência de demonstração, substitua o e-mail e execute no SQL Editor **do banco de desenvolvimento**:

```sql
update public.users
set organization_id = (select id from public.organizations where slug = 'army-pulse'),
    role = 'agency_admin'
where email = 'seu-email@exemplo.com';
```

6. Inicie o app:

```bash
npm run dev
```

Não habilite login simulado no cliente: use magic link e convites reais para validar permissões. O botão **Sair** encerra a sessão e remove o cache de páginas e documentos privados deste dispositivo. Configure variáveis de produção diretamente no ambiente de deploy; arquivos `.env*` não devem ser versionados.
