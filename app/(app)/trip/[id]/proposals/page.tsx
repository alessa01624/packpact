import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProposalsClient from './ProposalsClient'

export default async function ProposalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', id)
    .eq('user_id', user.id)
    .single()

  if (!member) redirect(`/trip/${id}`)

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, phase, deadline')
    .eq('id', id)
    .single()

  if (!trip) redirect('/')

  // Get proposals
  const { data: proposals } = await supabase
    .from('proposals')
    .select('*')
    .eq('trip_id', id)
    .order('created_at', { ascending: false })

  // Get my proposals count
  const myProposals = (proposals ?? []).filter(p => p.member_id === member.id)

  // Get members for display
  const { data: members } = await supabase
    .from('trip_members')
    .select('id, display_name, emoji')
    .eq('trip_id', id)

  // Get which members have voted at least once (bypass RLS with service role)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: voterRows } = await admin
    .from('votes')
    .select('member_id')
    .eq('trip_id', id)
  const membersWhoVoted = [...new Set((voterRows ?? []).map(r => r.member_id))]

  // If revealed, get votes
  let myVotedProposalIds: string[] = []
  let voteCounts: Record<string, number> = {}

  if (trip.phase === 'revealed') {
    const { data: allVotes } = await supabase
      .from('votes')
      .select('proposal_id, member_id')
      .eq('trip_id', id)

    for (const v of allVotes ?? []) {
      voteCounts[v.proposal_id] = (voteCounts[v.proposal_id] ?? 0) + 1
      if (v.member_id === member.id) myVotedProposalIds.push(v.proposal_id)
    }
  } else {
    const { data: myVotes } = await supabase
      .from('votes')
      .select('proposal_id')
      .eq('trip_id', id)
      .eq('member_id', member.id)

    myVotedProposalIds = (myVotes ?? []).map(v => v.proposal_id)
  }

  return (
    <ProposalsClient
      trip={trip}
      currentMember={member}
      proposals={proposals ?? []}
      myProposalsCount={myProposals.length}
      members={members ?? []}
      myVotedProposalIds={myVotedProposalIds}
      voteCounts={voteCounts}
      membersWhoVoted={membersWhoVoted}
    />
  )
}
