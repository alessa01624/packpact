import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const nextFromQuery = searchParams.get('next')
  const nextFromCookie = request.cookies.get('auth_next')?.value

  // If no destination is specified it's a password reset — send to update-password
  // Google OAuth always carries a 'next' param or auth_next cookie
  const next = nextFromQuery
    ?? (nextFromCookie ? decodeURIComponent(nextFromCookie) : null)
    ?? '/update-password'

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
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
