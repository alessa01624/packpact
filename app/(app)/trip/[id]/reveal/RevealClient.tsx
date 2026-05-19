'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Share2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { Trip, Proposal } from '@/lib/types'

interface RankedProposal extends Proposal {
  vote_count: number
}

interface Props {
  trip: Trip
  rankedProposals: RankedProposal[]
  memberName: string
}

const MEDALS = ['🥇', '🥈', '🥉']
const COLORS = [
  'from-amber-500/30 to-amber-500/5 border-amber-500/40',
  'from-zinc-400/20 to-zinc-400/5 border-zinc-500/30',
  'from-orange-600/20 to-orange-600/5 border-orange-600/30',
]

export default function RevealClient({ trip, rankedProposals, memberName }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [showCount, setShowCount] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!revealed) return
    let count = 0
    const interval = setInterval(() => {
      count++
      setShowCount(count)
      if (count >= Math.min(3, rankedProposals.length)) clearInterval(interval)
    }, 600)
    return () => clearInterval(interval)
  }, [revealed, rankedProposals.length])

  const winner = rankedProposals[0]
  const inviteUrl = typeof window !== 'undefined' ? window.location.origin + `/trip/${trip.id}` : ''

  async function handleShare() {
    const text = `🏆 PackPact ha deciso: andiamo a ${winner?.og_title ?? winner?.url ?? 'destinazione top votata'}!\n\nOrganizzato con PackPact — la vacanza di gruppo, senza litigi. 🧳\n${inviteUrl}`
    if (navigator.share) {
      await navigator.share({ title: 'PackPact — Abbiamo deciso!', text })
    } else {
      await navigator.clipboard.writeText(text)
      alert('Messaggio copiato! Incollalo nel tuo gruppo WhatsApp 📋')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-5 pt-14 pb-4 flex items-center gap-3">
        <Link href={`/trip/${trip.id}`}>
          <button className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center">
            <ArrowLeft size={16} className="text-zinc-300" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">🏆 Il podio</h1>
          <p className="text-zinc-500 text-xs">{trip.name}</p>
        </div>
        {winner && (
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-zinc-800 text-white text-sm font-medium px-3 py-2 rounded-xl"
          >
            <Share2 size={13} /> Condividi
          </button>
        )}
      </div>

      <div className="px-5 py-6 space-y-5">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-5xl"
          >
            🎉
          </motion.div>
          <h2 className="text-white font-bold text-xl">Le votazioni sono chiuse!</h2>
          <p className="text-zinc-400 text-sm">
            Ciao {memberName}! Ecco i risultati del gruppo.
          </p>
        </motion.div>

        {rankedProposals.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-4xl">😶</p>
            <p className="text-white font-semibold">Nessuna proposta ricevuta</p>
            <p className="text-zinc-500 text-sm">Forse il gruppo non ha aggiunto alloggi in tempo.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rankedProposals.slice(0, 3).map((proposal, index) => (
              <AnimatePresence key={proposal.id}>
                {showCount > index && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22, delay: index === 0 ? 0.1 : 0 }}
                    className={`bg-gradient-to-b ${COLORS[index]} border rounded-2xl overflow-hidden`}
                  >
                    {/* Image */}
                    {proposal.og_image && (
                      <div className="relative h-36 overflow-hidden">
                        <img src={proposal.og_image} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
                        <div className="absolute bottom-3 left-4 text-3xl">{MEDALS[index]}</div>
                        {proposal.og_price && (
                          <div className="absolute bottom-3 right-4 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                            {proposal.og_price}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        {!proposal.og_image && (
                          <span className="text-3xl mt-1">{MEDALS[index]}</span>
                        )}
                        <div className="flex-1">
                          <p className="text-white font-bold text-base leading-tight">
                            {proposal.og_title ?? proposal.url}
                          </p>
                          {proposal.og_location && (
                            <p className="text-zinc-400 text-sm mt-0.5">📍 {proposal.og_location}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
                          <p className="text-white font-extrabold text-2xl">{proposal.vote_count}</p>
                          <p className="text-zinc-400 text-xs">vot{proposal.vote_count === 1 ? 'o' : 'i'}</p>
                        </div>

                        <a
                          href={proposal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white text-zinc-900 font-bold text-sm px-4 py-2.5 rounded-xl"
                        >
                          <ExternalLink size={13} />
                          Apri link
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
          </div>
        )}

        {/* Remaining proposals */}
        {rankedProposals.length > 3 && showCount >= 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <p className="text-zinc-600 text-xs font-semibold uppercase tracking-wider">Tutte le proposte</p>
            {rankedProposals.slice(3).map((p, i) => (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm font-medium line-clamp-1">{p.og_title ?? p.url}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 text-sm">{p.vote_count} voti</span>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={12} className="text-zinc-600" />
                  </a>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Share CTA */}
        {winner && showCount >= 1 && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleShare}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2"
          >
            <Share2 size={16} />
            Condividi il risultato su WhatsApp 📱
          </motion.button>
        )}
      </div>
    </div>
  )
}
