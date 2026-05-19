import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RevealClient from './RevealClient'

export default async function RevealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single()

  if (!trip || trip.phase !== 'revealed') redirect(`/trip/${id}`)

  const { data: member } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', id)
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/')

  const { data: allVotes } = await supabase
    .from('votes')
    .select('proposal_id')
    .eq('trip_id', id)

  const voteCounts: Record<string, number> = {}
  for (const v of allVotes ?? []) {
    voteCounts[v.proposal_id] = (voteCounts[v.proposal_id] ?? 0) + 1
  }

  const { data: proposals } = await supabase
    .from('proposals')
    .select('*')
    .eq('trip_id', id)

  const ranked = (proposals ?? [])
    .map(p => ({ ...p, vote_count: voteCounts[p.id] ?? 0 }))
    .sort((a, b) => b.vote_count - a.vote_count)

  return <RevealClient trip={trip} rankedProposals={ranked} memberName={member.display_name} />
}
