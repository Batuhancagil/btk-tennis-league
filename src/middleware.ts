import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { UserRole, UserStatus } from "@prisma/client"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // If no token, allow access to auth pages only
    if (!token) {
      if (path.startsWith("/auth")) {
        return NextResponse.next()
      }
      return NextResponse.redirect(new URL("/auth/signin", req.url))
    }

    // Check if user is approved
    if (token.status !== UserStatus.APPROVED) {
      if (path.startsWith("/auth") || path === "/pending") {
        return NextResponse.next()
      }
      return NextResponse.redirect(new URL("/pending", req.url))
    }

    // Role-based access control
    // SUPERADMIN can access all dashboards
    if (token.role === UserRole.SUPERADMIN) {
      return NextResponse.next()
    }

    if (path.startsWith("/admin") && token.role !== UserRole.SUPERADMIN) {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }

    if (path.startsWith("/manager") && token.role !== UserRole.MANAGER) {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }

    if (path.startsWith("/captain") && token.role !== UserRole.CAPTAIN && token.role !== UserRole.MANAGER) {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/manager/:path*",
    "/captain/:path*",
    "/player/:path*",
    "/pending",
    "/unauthorized",
  ],
}

