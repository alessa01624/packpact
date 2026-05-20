import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Prefer query param, fall back to cookie (Supabase OAuth may strip query params)
  const nextFromQuery = searchParams.get('next')
  const nextFromCookie = request.cookies.get('auth_next')?.value
  const next = nextFromQuery ?? (nextFromCookie ? decodeURIComponent(nextFromCookie) : '/')

  if (code) {
    // Create the redirect response FIRST so setAll can write directly to it
    const response = NextResponse.redirect(`${origin}${next}`)
    // Clear the auth_next cookie
    response.cookies.set('auth_next', '', { maxAge: 0, path: '/' })

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
