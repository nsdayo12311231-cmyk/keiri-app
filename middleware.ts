import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /auth/login を /auth/signin にリダイレクト
  if (pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 認証関連のパスをチェック
    '/auth/:path*',
  ],
};