'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { MEMBER_EMOJIS } from '@/lib/utils'

interface Props {
  trip: { id: string; name: string; deadline: string; phase: string }
  availableSlots: string[] | null
  takenNames: string[]
}

export default function JoinClient({ trip, availableSlots, takenNames }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedName, setSelectedName] = useState('')
  const [freeTextName, setFreeTextName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState(MEMBER_EMOJIS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const usePicker = availableSlots !== null
  const finalName = usePicker ? selectedName : freeTextName.trim()

  async function handleJoin() {
    if (!finalName) return setError(usePicker ? 'Select who you are in the group' : 'Enter your name')
    if (!usePicker && takenNames.includes(finalName)) return setError('This name is already taken')
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Session expired, please log in again')
      setLoading(false)
      return
    }

    const { error: err } = await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: user.id,
      display_name: finalName,
      emoji: selectedEmoji,
    })

    if (err && err.code !== '23505') {
      setError('Error joining the group')
      setLoading(false)
      return
    }

    router.push(`/trip/${trip.id}`)
  }

  const showEmojiPicker = usePicker ? !!selectedName : !!freeTextName.trim()

  return (
    <div className="min-h-screen bg-[#F5F3FF] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🧳</div>
          <h1 className="text-2xl font-bold text-gray-900">Join the trip</h1>
          <p className="text-gray-500 text-sm">
            You've been invited to <span className="text-purple-700 font-semibold">{trip.name}</span>
          </p>
        </div>

        {/* Name picker or free text */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-gray-700 text-sm font-semibold">
            {usePicker ? 'Who are you in the group?' : 'What\'s your name in the group?'}
          </p>

          {usePicker ? (
            availableSlots!.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-sm">All spots have been taken.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableSlots!.map(name => (
                  <button
                    key={name}
                    onClick={() => setSelectedName(name)}
                    className={`py-3 px-4 rounded-2xl text-sm font-semibold text-left transition-all ${
                      selectedName === name
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={freeTextName}
                onChange={e => setFreeTextName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="e.g. Marco, Sara..."
                maxLength={30}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
              />
              {takenNames.length > 0 && (
                <p className="text-gray-400 text-xs">Already in group: {takenNames.join(', ')}</p>
              )}
            </div>
          )}
        </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm space-y-3"
          >
            <p className="text-gray-700 text-sm font-semibold">Choose your avatar</p>
            <div className="grid grid-cols-6 gap-2">
              {MEMBER_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl p-2 rounded-xl transition-all ${
                    selectedEmoji === emoji
                      ? 'bg-purple-100 ring-2 ring-purple-400'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {error && <p className="text-red-500 text-sm font-semibold text-center">{error}</p>}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleJoin}
          disabled={loading || !finalName || (usePicker && availableSlots?.length === 0)}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md shadow-purple-200"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          ) : finalName ? (
            `Join as ${selectedEmoji} ${finalName}`
          ) : (
            usePicker ? 'Select who you are' : 'Join the group'
          )}
        </motion.button>
      </motion.div>
    </div>
  )
}
