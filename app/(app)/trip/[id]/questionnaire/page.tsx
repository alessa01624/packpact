import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QuestionnaireClient from './QuestionnaireClient'

export default async function QuestionnairePage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: existing } = await supabase
    .from('questionnaire_responses')
    .select('id')
    .eq('trip_id', id)
    .eq('member_id', member.id)
    .single()

  if (existing) redirect(`/trip/${id}`)

  return <QuestionnaireClient tripId={id} memberId={member.id} />
}
