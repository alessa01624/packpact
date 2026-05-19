import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: trip } = await supabase
    .from('trips')
    .select('id, deadline, phase')
    .eq('id', id)
    .single()

  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (trip.phase === 'revealed') return NextResponse.json({ ok: true })

  if (new Date(trip.deadline) > new Date()) {
    return NextResponse.json({ error: 'Deadline not reached' }, { status: 400 })
  }

  await supabase.from('trips').update({ phase: 'revealed' }).eq('id', id)
  return NextResponse.json({ ok: true })
}
