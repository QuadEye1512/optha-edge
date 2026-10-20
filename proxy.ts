import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optimistic check only: sends visitors without a session cookie to sign-in.
 * Every page, action and route handler still verifies the session and
 * permissions on the server.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has('opthaedge_session')) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = '/sign-in';
  url.search = next && next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!sign-in|share|api|_next|icon.svg|manifest.webmanifest|favicon.ico).*)'],
};
