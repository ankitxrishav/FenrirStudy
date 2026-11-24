import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/rooms",
  "/timer",
  "/dashboard",
  "/goals",
  "/routine",
  "/subjects",
  "/history",
  "/settings",
];

function getDefaultAuthedDestination(req: NextRequest): string {
  const activeRoom = req.cookies.get("fenrir_active_room")?.value;
  if (activeRoom) {
    return `/rooms/${activeRoom}`;
  }

  const startPref = req.cookies.get("fenrir_start")?.value;
  if (startPref === "timer") return "/timer";
  if (startPref === "rooms") return "/rooms";
  return "/dashboard";
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const authed = req.cookies.get("fenrir_authed")?.value === "1";

  if (pathname === "/") {
    if (authed) {
      const dest = getDefaultAuthedDestination(req);
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    if (authed) {
      const nextParam = req.nextUrl.searchParams.get("next");
      const safeNext =
        nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
          ? nextParam
          : getDefaultAuthedDestination(req);
      return NextResponse.redirect(new URL(safeNext, req.url));
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !authed) {
    const loginUrl = new URL("/login", req.url);
    const fullDest = `${pathname}${search}`;
    if (fullDest && fullDest !== "/") {
      loginUrl.searchParams.set("next", fullDest);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/rooms/:path*",
    "/timer/:path*",
    "/dashboard/:path*",
    "/goals/:path*",
    "/routine/:path*",
    "/subjects/:path*",
    "/history/:path*",
    "/settings/:path*",
  ],
};
