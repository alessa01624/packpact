import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // All trips the user belongs to
  const { data: memberships } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const tripIds = memberships?.map(m => m.trip_id) ?? []

  let trips: { id: string; name: string; deadline: string; phase: string; invite_token: string }[] = []
  let participantCounts: Record<string, number> = {}

  if (tripIds.length > 0) {
    const { data: tripsData } = await supabase
      .from('trips')
      .select('id, name, deadline, phase, invite_token, creator_id')
      .in('id', tripIds)
      .order('created_at', { ascending: false })

    trips = tripsData ?? []

    const { data: allMembers } = await supabase
      .from('trip_members')
      .select('trip_id')
      .in('trip_id', tripIds)

    for (const m of allMembers ?? []) {
      participantCounts[m.trip_id] = (participantCounts[m.trip_id] ?? 0) + 1
    }
  }

  return <DashboardClient trips={trips} participantCounts={participantCounts} userId={user.id} />
}
