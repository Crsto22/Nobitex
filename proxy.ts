import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
]);

const PUBLIC_PREFIXES = [
  "/_next",
  "/Logo",
  "/img",
  "/image",
  "/Icon",
  "/svg",
  "/font",
  "/mascot",
  "/avatar",
  "/favicon.ico",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!request.cookies.has("nobitex-token")) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
