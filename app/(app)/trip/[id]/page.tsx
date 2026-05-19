import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TripHomeClient from './TripHomeClient'
import { computeGroupProfile } from '@/lib/trip'

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const user = session.user

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single()

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#F5F3FF] flex items-center justify-center">
        <p className="text-gray-400">Trip not found.</p>
      </div>
    )
  }

  const { data: member } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', id)
    .eq('user_id', user.id)
    .single()

  if (!member) redirect(`/join/${trip.invite_token}`)

  const { data: members } = await supabase
    .from('trip_members')
    .select('id, display_name, emoji')
    .eq('trip_id', id)

  const { data: questResponses } = await supabase
    .from('questionnaire_responses')
    .select('*')
    .eq('trip_id', id)

  const completedMemberIds = (questResponses ?? []).map(r => r.member_id)
  const groupProfile = questResponses && questResponses.length > 0
    ? computeGroupProfile(questResponses)
    : null
  const hasCompletedQuestionnaire = completedMemberIds.includes(member.id)

  // Secret wishes — only revealed after trip ends
  const secretWishes: { memberId: string; wish: string }[] = trip.phase === 'revealed'
    ? (questResponses ?? [])
        .filter(r => r.secret_wish)
        .map(r => ({ memberId: r.member_id, wish: r.secret_wish as string }))
    : []

  // Fetch proposals
  const { data: proposals } = await supabase
    .from('proposals')
    .select('*')
    .eq('trip_id', id)
    .order('created_at', { ascending: false })

  // Fetch votes
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
    <TripHomeClient
      trip={trip}
      currentMember={member}
      members={members ?? []}
      completedMemberIds={completedMemberIds}
      groupProfile={groupProfile}
      hasCompletedQuestionnaire={hasCompletedQuestionnaire}
      totalResponses={questResponses?.length ?? 0}
      proposals={proposals ?? []}
      myVotedProposalIds={myVotedProposalIds}
      voteCounts={voteCounts}
      secretWishes={secretWishes}
    />
  )
}
