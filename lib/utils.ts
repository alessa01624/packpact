import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
}

export function getDaysUntilDeadline(deadline: string) {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export const VIBE_LABELS: Record<string, string> = {
  relax: '🧘 Relax',
  family: '👨‍👩‍👧 Family',
  beach: '🏖️ Beach',
  mountains: '⛰️ Mountains',
  city_culture: '🏛️ City & Culture',
  nature_adventure: '🧗 Nature & Adventure',
  parties_events: '🎉 Parties & Events',
  chill_budget: '💸 Chill low-budget',
}

export const MEMBER_EMOJIS = ['🦊', '🐼', '🦁', '🐨', '🦋', '🐬', '🦚', '🦩', '🐙', '🦜', '🦝', '🐸']
