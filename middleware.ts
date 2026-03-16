import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { env } from "@/lib/config/env";

const isProtectedRoute = (pathname: string) =>
  pathname === "/dashboard" ||
  pathname.startsWith("/dashboard/") ||
  pathname === "/estimate" ||
  pathname.startsWith("/estimate/") ||
  pathname === "/estimations" ||
  pathname.startsWith("/estimations/") ||
  pathname === "/onboarding" ||
  pathname === "/insights" ||
  pathname.startsWith("/insights/") ||
  pathname === "/settings" ||
  pathname.startsWith("/settings/");

export async function middleware(request: NextRequest) {
  // Forward the pathname so server components (layouts) can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (!isProtectedRoute(request.nextUrl.pathname)) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/estimate/:path*",
    "/estimations/:path*",
    "/onboarding",
    "/insights/:path*",
    "/settings/:path*",
  ],
};
