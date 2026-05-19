import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { url } = await req.json() as { url: string }

  if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 })

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PackPactBot/1.0; +https://packpact.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })

    const html = await res.text()

    const getMeta = (property: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
      ]
      for (const p of patterns) {
        const m = html.match(p)
        if (m?.[1]) return m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim()
      }
      return null
    }

    const title = getMeta('title') ?? html.match(/<title[^>]*>([^<]+)/i)?.[1]?.trim() ?? null
    const image = getMeta('image')
    const description = getMeta('description')

    // Price extraction — works for Airbnb, Booking, VRBO
    const pricePatterns = [
      /€\s?[\d.,]+/,
      /\$\s?[\d.,]+/,
      /£\s?[\d.,]+/,
      /[\d.,]+\s?€/,
    ]
    let price: string | null = null
    for (const p of pricePatterns) {
      const m = html.match(p)
      if (m) { price = m[0].trim(); break }
    }

    // Location extraction from og:locale or title patterns
    const location = getMeta('locale:alternate') ?? getMeta('place:location:latitude') ? 'Posizione rilevata' : null

    return NextResponse.json({ title, image, description, price, location })
  } catch {
    return NextResponse.json({ error: 'Scrape failed' }, { status: 500 })
  }
}
