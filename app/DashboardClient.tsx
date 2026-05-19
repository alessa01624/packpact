'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Clock, X, ArrowRight, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Trip {
  id: string
  name: string
  deadline: string
  phase: string
  invite_token: string
  creator_id: string
}

interface Props {
  trips: Trip[]
  participantCounts: Record<string, number>
  userId: string
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  questionnaire: { label: 'Questionnaire', color: 'bg-purple-100 text-purple-700' },
  proposals:     { label: 'Proposals',     color: 'bg-blue-100 text-blue-700' },
  revealed:      { label: 'Revealed 🏆',   color: 'bg-amber-100 text-amber-700' },
}

export default function DashboardClient({ trips: initialTrips, participantCounts, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [trips, setTrips] = useState<Trip[]>(initialTrips)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [joinError, setJoinError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null)
  const [deleting, setDeleting] = useState(false)

  function handleJoin() {
    const trimmed = joinInput.trim()
    if (!trimmed) return
    let token = trimmed
    try {
      const url = new URL(trimmed)
      const parts = url.pathname.split('/')
      const joinIdx = parts.indexOf('join')
      if (joinIdx !== -1 && parts[joinIdx + 1]) token = parts[joinIdx + 1]
    } catch {}
    if (!token) { setJoinError('Paste a valid invite link'); return }
    router.push(`/join/${token}`)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const isCreator = deleteTarget.creator_id === userId

    if (isCreator) {
      await supabase.from('trips').delete().eq('id', deleteTarget.id)
    } else {
      await supabase.from('trip_members').delete()
        .eq('trip_id', deleteTarget.id)
        .eq('user_id', userId)
    }

    setTrips(prev => prev.filter(t => t.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-purple-50/50 to-white">
      {/* Hero */}
      <div className="px-6 pt-20 pb-10 text-center max-w-lg mx-auto">
        <h1 className="text-4xl font-black text-gray-900 leading-tight tracking-tight">
          Plan your group trip
          <br />
          <span className="text-purple-600">without the chaos</span>
        </h1>
        <p className="text-gray-500 mt-4 text-base leading-relaxed">
          No more endless WhatsApp threads. Collect preferences privately,
          propose accommodations, vote anonymously, and decide together.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <Link href="/create">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-purple-600 text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-md shadow-purple-200"
            >
              Create a Trip <ArrowRight size={15} />
            </motion.button>
          </Link>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold px-6 py-3 rounded-2xl text-sm shadow-sm"
          >
            Join a Trip
          </motion.button>
        </div>
      </div>

      {/* My Trips */}
      <div className="px-4 pb-16 max-w-lg mx-auto">
        {trips.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              ✈️ My Trips
            </h2>
            <div className="space-y-3">
              {trips.map((trip, i) => {
                const phase = PHASE_LABELS[trip.phase] ?? { label: trip.phase, color: 'bg-gray-100 text-gray-600' }
                const deadline = new Date(trip.deadline)
                const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                const count = participantCounts[trip.id] ?? 1
                const isCreator = trip.creator_id === userId

                return (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative"
                  >
                    <Link href={`/trip/${trip.id}`}>
                      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.99] transition-transform pr-12">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center text-base">
                            📍
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${phase.color}`}>
                            {phase.label}
                          </span>
                        </div>
                        <p className="font-bold text-gray-900 text-base">{trip.name}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1 text-gray-400 text-xs">
                            <Users size={11} /> {count} participant{count !== 1 ? 's' : ''}
                          </span>
                          <span className={`flex items-center gap-1 text-xs ${
                            daysLeft <= 2 ? 'text-red-400' : daysLeft <= 5 ? 'text-amber-500' : 'text-gray-400'
                          }`}>
                            <Clock size={11} />
                            {daysLeft > 0
                              ? `Deadline: ${deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                              : 'Deadline passed'
                            }
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Delete button — outside Link to avoid navigation */}
                    <button
                      onClick={e => { e.preventDefault(); setDeleteTarget(trip) }}
                      className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation popup */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => !deleting && setDeleteTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-6"
            >
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                <div className="text-center space-y-2">
                  <div className="text-4xl">🗑️</div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {deleteTarget.creator_id === userId ? 'Delete this trip?' : 'Leave this trip?'}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    <span className="font-semibold text-gray-700">"{deleteTarget.name}"</span>
                    {deleteTarget.creator_id === userId
                      ? ' will be permanently deleted for all members.'
                      : ' — you will be removed from this trip.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm"
                  >
                    No, keep it
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="py-3 rounded-2xl bg-red-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {deleting
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : 'Yes, delete'
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Join modal */}
      <AnimatePresence>
        {showJoinModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => { setShowJoinModal(false); setJoinInput(''); setJoinError('') }}
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 space-y-4 max-w-lg mx-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-lg">Join a Trip</h3>
                <button
                  onClick={() => { setShowJoinModal(false); setJoinInput(''); setJoinError('') }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-500 text-sm">Paste the invite link you received</p>
              <input
                type="text"
                value={joinInput}
                onChange={e => { setJoinInput(e.target.value); setJoinError('') }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="https://packpact.app/join/abc123"
                autoFocus
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
              />
              {joinError && <p className="text-red-500 text-xs">{joinError}</p>}
              <button
                onClick={handleJoin}
                disabled={!joinInput.trim()}
                className="w-full bg-purple-600 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-sm"
              >
                Join →
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
