import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check for auth cookie
    const authCookie = request.cookies.get('auth');
    const isAuthenticated = authCookie?.value === 'true';

    // Define protected paths
    const protectedPaths = ['/admin', '/pos'];
    const isProtectedPath = protectedPaths.some(path =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (isProtectedPath && !isAuthenticated) {
        // Redirect to login page if not authenticated
        const loginUrl = new URL('/login', request.url);
        // Optional: Add 'from' param to redirect back after login
        // loginUrl.searchParams.set('from', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/pos/:path*'],
};
