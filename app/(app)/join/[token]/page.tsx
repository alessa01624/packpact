import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JoinClient from './JoinClient'

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?next=/join/${token}`)
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, deadline, phase, member_slots')
    .eq('invite_token', token)
    .single()

  if (!trip) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="text-4xl">😕</div>
          <p className="text-white font-semibold">Link non valido</p>
          <p className="text-zinc-400 text-sm">Il viaggio non esiste o il link è scaduto.</p>
        </div>
      </div>
    )
  }

  const { data: existingMember } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('user_id', user.id)
    .single()

  if (existingMember) {
    redirect(`/trip/${trip.id}`)
  }

  const { data: members } = await supabase
    .from('trip_members')
    .select('display_name')
    .eq('trip_id', trip.id)

  const takenNames = (members ?? []).map(m => m.display_name)
  const memberSlots = trip.member_slots as string[] | null

  // If trip has predefined slots, filter out taken ones; otherwise null = free text input
  const availableSlots = memberSlots
    ? memberSlots.filter(name => !takenNames.includes(name))
    : null

  return (
    <JoinClient
      trip={trip}
      availableSlots={availableSlots}
      takenNames={takenNames}
    />
  )
}
