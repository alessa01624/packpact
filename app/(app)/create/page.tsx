'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MEMBER_EMOJIS } from '@/lib/utils'

export default function CreateTripPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [tripName, setTripName] = useState('')
  const [deadline, setDeadline] = useState('')
  const [memberNames, setMemberNames] = useState<string[]>([])
  const [nameInput, setNameInput] = useState('')
  const [myName, setMyName] = useState('')
  const [myEmoji, setMyEmoji] = useState(MEMBER_EMOJIS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addMemberName() {
    const trimmed = nameInput.trim()
    if (!trimmed || memberNames.includes(trimmed)) return
    setMemberNames(prev => [...prev, trimmed])
    setNameInput('')
  }

  function removeMemberName(name: string) {
    setMemberNames(prev => prev.filter(n => n !== name))
    if (myName === name) setMyName('')
  }

  async function handleCreate() {
    if (!tripName.trim() || !deadline || !myName) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sessione scaduta, rieffettua il login')
      setLoading(false)
      return
    }

    await supabase.from('profiles').upsert({ id: user.id, display_name: myName })

    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .insert({ name: tripName.trim(), deadline, creator_id: user.id, member_slots: memberNames })
      .select()
      .single()

    if (tripErr || !trip) {
      setError('Errore nella creazione del viaggio')
      setLoading(false)
      return
    }

    const { error: memberErr } = await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: user.id,
      display_name: myName,
      emoji: myEmoji,
    })

    if (memberErr) {
      setError("Errore nell'aggiunta al gruppo")
      setLoading(false)
      return
    }

    router.push(`/trip/${trip.id}`)
  }

  const minDeadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="text-5xl">✈️</div>
          <h1 className="text-2xl font-bold text-white">Crea il tuo viaggio</h1>
          <p className="text-zinc-500 text-xs">Passo {step} di 3</p>
          <div className="flex gap-1 justify-center">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1 w-10 rounded-full transition-all duration-300 ${s <= step ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-zinc-400 text-sm font-medium">Nome del viaggio</label>
              <input
                type="text"
                value={tripName}
                onChange={e => setTripName(e.target.value)}
                placeholder="es. Estate 2025 🌴"
                maxLength={50}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-zinc-400 text-sm font-medium">Deadline votazioni</label>
              <input
                type="datetime-local"
                value={deadline}
                min={minDeadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm [color-scheme:dark]"
              />
              <p className="text-zinc-600 text-xs">Entro questa data tutti devono aver votato. Poi si rivela il podio.</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { if (tripName.trim() && deadline) setStep(2) }}
              disabled={!tripName.trim() || !deadline}
              className="w-full bg-emerald-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-sm"
            >
              Avanti →
            </motion.button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-zinc-400 text-sm font-medium">Chi viaggia?</label>
                <p className="text-zinc-600 text-xs mt-0.5">Aggiungi tutti i nomi del gruppo (incluso te)</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMemberName()}
                  placeholder="es. Marco, Sara..."
                  maxLength={30}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <button
                  onClick={addMemberName}
                  disabled={!nameInput.trim() || memberNames.includes(nameInput.trim())}
                  className="bg-emerald-500 disabled:opacity-40 text-white p-3 rounded-2xl"
                >
                  <Plus size={18} />
                </button>
              </div>
              {memberNames.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {memberNames.map(name => (
                    <motion.div
                      key={name}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1.5 bg-zinc-800 text-white text-sm px-3 py-1.5 rounded-xl"
                    >
                      {name}
                      <button onClick={() => removeMemberName(name)} className="text-zinc-500 hover:text-zinc-300">
                        <X size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-zinc-900 border border-zinc-700 text-white font-semibold py-4 rounded-2xl text-sm"
              >
                ← Indietro
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { if (memberNames.length >= 1) setStep(3) }}
                disabled={memberNames.length < 1}
                className="flex-[2] bg-emerald-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-sm"
              >
                Avanti →
              </motion.button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-zinc-400 text-sm font-medium">Chi sei tu nel gruppo?</label>
              <div className="grid grid-cols-2 gap-2">
                {memberNames.map(name => (
                  <button
                    key={name}
                    onClick={() => setMyName(name)}
                    className={`py-3 px-4 rounded-2xl text-sm font-semibold text-left transition-all ${
                      myName === name
                        ? 'bg-emerald-500/20 border-2 border-emerald-500 text-white'
                        : 'bg-zinc-900 border-2 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {myName && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <p className="text-zinc-400 text-sm font-medium">Il tuo avatar</p>
                <div className="grid grid-cols-6 gap-2">
                  {MEMBER_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setMyEmoji(emoji)}
                      className={`text-2xl p-2 rounded-xl transition-all ${
                        myEmoji === emoji
                          ? 'bg-emerald-500/20 ring-2 ring-emerald-500'
                          : 'bg-zinc-900 hover:bg-zinc-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-zinc-900 border border-zinc-700 text-white font-semibold py-4 rounded-2xl text-sm"
              >
                ← Indietro
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                disabled={loading || !myName}
                className="flex-[2] bg-emerald-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  'Crea viaggio 🚀'
                )}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
