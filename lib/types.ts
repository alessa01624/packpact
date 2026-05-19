export type TripPhase = 'questionnaire' | 'proposals' | 'revealed'

export type VibeTags =
  | 'relax'
  | 'family'
  | 'beach'
  | 'mountains'
  | 'city_culture'
  | 'nature_adventure'
  | 'parties_events'
  | 'chill_budget'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Trip {
  id: string
  name: string
  invite_token: string
  creator_id: string
  deadline: string
  phase: TripPhase
  member_slots: string[] | null
  created_at: string
}

export interface TripMember {
  id: string
  trip_id: string
  user_id: string
  display_name: string
  emoji: string
  joined_at: string
}

export interface QuestionnaireResponse {
  id: string
  trip_id: string
  member_id: string
  budget_max: number
  vibes: VibeTags[]
  destinations: string[]
  available_dates: string[]
  secret_wish: string | null
  completed_at: string
}

export interface Proposal {
  id: string
  trip_id: string
  member_id: string
  url: string
  og_title: string | null
  og_image: string | null
  og_description: string | null
  og_price: string | null
  og_location: string | null
  dates: string | null
  created_at: string
}

export interface Vote {
  id: string
  proposal_id: string
  member_id: string
  trip_id: string
  created_at: string
}

export interface GroupProfile {
  avg_budget: number
  top_vibes: VibeTags[]
  top_destinations: string[]
  common_dates: string[]
}

export interface ProposalWithVotes extends Proposal {
  vote_count: number
  has_voted: boolean
}
