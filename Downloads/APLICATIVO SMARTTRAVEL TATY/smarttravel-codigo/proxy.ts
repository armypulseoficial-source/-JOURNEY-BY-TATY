import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { decideAccess } from './lib/auth/access';
import { loadCurrentUser } from './lib/auth/session';

// Next 16: middleware.ts virou proxy.ts. Aplica a checagem de papel de
// lib/auth/access.ts em /agency e /trip. A RLS continua sendo a proteção real dos dados.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const user = await loadCurrentUser(supabase);
  const { pathname, search } = request.nextUrl;
  const decisao = decideAccess(pathname, user);

  if (decisao.action === 'login') {
    const destino = new URL('/login', request.url);
    destino.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(destino);
  }
  if (decisao.action === 'sem-acesso') {
    return NextResponse.redirect(new URL('/sem-acesso', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/agency/:path*', '/trip/:path*'],
};
