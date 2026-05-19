import type { GroupProfile, QuestionnaireResponse, VibeTags } from './types'

export function computeGroupProfile(responses: QuestionnaireResponse[]): GroupProfile {
  if (responses.length === 0) {
    return { avg_budget: 0, top_vibes: [], top_destinations: [], common_dates: [] }
  }

  const avg_budget = Math.round(
    responses.reduce((sum, r) => sum + r.budget_max, 0) / responses.length
  )

  const vibeCounts: Record<string, number> = {}
  for (const r of responses) {
    for (const v of r.vibes) {
      vibeCounts[v] = (vibeCounts[v] ?? 0) + 1
    }
  }
  const top_vibes = (Object.entries(vibeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([v]) => v) as VibeTags[])

  const destCounts: Record<string, number> = {}
  for (const r of responses) {
    for (const d of r.destinations) {
      const key = d.toLowerCase().trim()
      destCounts[key] = (destCounts[key] ?? 0) + 1
    }
  }
  const top_destinations = Object.entries(destCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([d]) => d.charAt(0).toUpperCase() + d.slice(1))

  const dateCounts: Record<string, number> = {}
  for (const r of responses) {
    for (const d of r.available_dates) {
      dateCounts[d] = (dateCounts[d] ?? 0) + 1
    }
  }
  const common_dates = Object.entries(dateCounts)
    .filter(([, count]) => count >= Math.ceil(responses.length / 2))
    .sort(([, a], [, b]) => b - a)
    .map(([d]) => d)

  return { avg_budget, top_vibes, top_destinations, common_dates }
}
