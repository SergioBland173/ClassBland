import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
)

const COOKIE_NAME = 'classbland-session'

// Rate limiting store (in-memory, resets on server restart)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMITS = {
  '/api/auth/login': { max: 5, windowMs: 60000 }, // 5 per minute
  '/api/auth/register': { max: 3, windowMs: 60000 }, // 3 per minute
  '/api/courses/join': { max: 10, windowMs: 60000 }, // 10 per minute
}

function getRateLimitKey(ip: string, path: string): string {
  return `${ip}:${path}`
}

function checkRateLimit(ip: string, path: string): boolean {
  const limit = Object.entries(RATE_LIMITS).find(([p]) => path.startsWith(p))
  if (!limit) return true

  const [, config] = limit
  const key = getRateLimitKey(ip, path)
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs })
    return true
  }

  if (record.count >= config.max) {
    return false
  }

  record.count++
  return true
}

async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: string; email: string; role: string; displayName: string | null }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown'

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    if (!checkRateLimit(ip, pathname)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  // Public routes - no auth needed
  const publicRoutes = ['/', '/login', '/register']
  const isPublicRoute = publicRoutes.includes(pathname)
  const isPublicApi = pathname.startsWith('/api/auth/')
  const isStaticFile = pathname.startsWith('/_next') ||
                       pathname.startsWith('/favicon') ||
                       pathname.includes('.')

  if (isStaticFile) {
    return NextResponse.next()
  }

  const session = await getSessionFromRequest(request)

  // Redirect to login if accessing protected route without session
  if (!session && !isPublicRoute && !isPublicApi) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect to dashboard if accessing auth pages while logged in
  if (session && (pathname === '/login' || pathname === '/register')) {
    const dashboardUrl = session.role === 'TEACHER'
      ? '/teacher/dashboard'
      : '/student/dashboard'
    return NextResponse.redirect(new URL(dashboardUrl, request.url))
  }

  // Teacher-only routes
  if (pathname.startsWith('/teacher') || pathname.startsWith('/api/teacher')) {
    if (!session || session.role !== 'TEACHER') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Student-only routes
  if (pathname.startsWith('/student') || pathname.startsWith('/api/student')) {
    if (!session || session.role !== 'STUDENT') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Add session to headers for API routes
  if (session && pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    response.headers.set('x-user-id', session.userId)
    response.headers.set('x-user-role', session.role)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
