import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Skip middleware in development for static files
  if (process.env.NODE_ENV === 'development' && req.nextUrl.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

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

// Specify which paths should be handled by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};