import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(req, res);
  const { data: { session } } = await supabase.auth.getSession();

  const url = req.nextUrl.pathname;
  if (url.startsWith('/dashboard')) {
    if (!session) return NextResponse.redirect(new URL('/', req.url));
    const role = session.user.user_metadata.role;
    if (url.startsWith('/dashboard/patient') && role !== 'patient')
      return NextResponse.redirect(new URL('/', req.url));
    if (url.startsWith('/dashboard/doctor') && role !== 'doctor')
      return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}