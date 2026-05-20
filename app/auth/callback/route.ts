import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextFromQuery = searchParams.get('next')
  const nextFromCookie = request.cookies.get('auth_next')?.value
  const pendingReset = request.cookies.get('pending_reset')?.value === '1'
  const next = pendingReset
    ? '/update-password'
    : (nextFromQuery ?? (nextFromCookie ? decodeURIComponent(nextFromCookie) : '/'))

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
    response.cookies.set('auth_next', '', { maxAge: 0, path: '/' })
    response.cookies.set('pending_reset', '', { maxAge: 0, path: '/' })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response  // response already has the auth cookies set
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
