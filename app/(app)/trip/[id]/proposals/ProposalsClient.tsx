'use client'
import { useState, useOptimistic } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, ThumbsUp, ExternalLink, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Proposal, TripMember } from '@/lib/types'

interface Props {
  trip: { id: string; name: string; phase: string; deadline: string }
  currentMember: TripMember
  proposals: Proposal[]
  myProposalsCount: number
  members: Pick<TripMember, 'id' | 'display_name' | 'emoji'>[]
  myVotedProposalIds: string[]
  voteCounts: Record<string, number>
}

export default function ProposalsClient({
  trip, currentMember, proposals, myProposalsCount,
  members, myVotedProposalIds, voteCounts,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isRevealed = trip.phase === 'revealed'

  const [showAddModal, setShowAddModal] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set(myVotedProposalIds))
  const [localProposals, setLocalProposals] = useState<Proposal[]>(proposals)
  const [scrapingUrl, setScrapingUrl] = useState('')

  function getMemberDisplay(memberId: string) {
    const m = members.find(x => x.id === memberId)
    return m ? `${m.emoji} ${m.display_name}` : '?'
  }

  async function handleVote(proposalId: string) {
    if (isRevealed) return
    const alreadyVoted = votedIds.has(proposalId)

    // Optimistic update
    setVotedIds(prev => {
      const next = new Set(prev)
      if (alreadyVoted) next.delete(proposalId)
      else next.add(proposalId)
      return next
    })

    if (navigator.vibrate) navigator.vibrate(10)

    if (alreadyVoted) {
      await supabase.from('votes')
        .delete()
        .eq('proposal_id', proposalId)
        .eq('member_id', currentMember.id)
    } else {
      await supabase.from('votes').insert({
        proposal_id: proposalId,
        member_id: currentMember.id,
        trip_id: trip.id,
      })
    }
  }

  async function handleAddProposal() {
    if (!newUrl.trim()) return
    setAddError('')

    let url = newUrl.trim()
    if (!url.startsWith('http')) url = 'https://' + url

    setAddLoading(true)
    setScrapingUrl(url)

    // Scrape OG data
    let ogData = { title: null as string | null, image: null as string | null, description: null as string | null, price: null as string | null, location: null as string | null }
    try {
      const res = await fetch('/api/og-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (res.ok) ogData = await res.json()
    } catch {}

    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert({
        trip_id: trip.id,
        member_id: currentMember.id,
        url,
        og_title: ogData.title,
        og_image: ogData.image,
        og_description: ogData.description,
        og_price: ogData.price,
        og_location: ogData.location,
      })
      .select()
      .single()

    if (error) {
      setAddError(error.message.includes('Maximum') ? 'Hai raggiunto il limite di 3 proposte.' : 'Errore nell\'aggiunta.')
      setAddLoading(false)
      setScrapingUrl('')
      return
    }

    setLocalProposals(prev => [proposal, ...prev])
    setNewUrl('')
    setShowAddModal(false)
    setAddLoading(false)
    setScrapingUrl('')
  }

  const otherProposals = localProposals.filter(p => p.member_id !== currentMember.id)
  const myProposals = localProposals.filter(p => p.member_id === currentMember.id)

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-5 pt-14 pb-4 flex items-center gap-3">
        <Link href={`/trip/${trip.id}`}>
          <button className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center">
            <ArrowLeft size={16} className="text-zinc-300" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">🏠 Proposte</h1>
          <p className="text-zinc-500 text-xs">{localProposals.length} propost{localProposals.length === 1 ? 'a' : 'e'} · voti {isRevealed ? 'visibili' : 'anonimi'}</p>
        </div>
        {!isRevealed && myProposals.length < 3 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            <Plus size={14} /> Aggiungi
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">
        {/* Revealed banner */}
        {isRevealed && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
            <p className="text-amber-400 font-bold">🏆 Deadline scaduta — i voti sono visibili!</p>
            <Link href={`/trip/${trip.id}/reveal`}>
              <p className="text-amber-300/70 text-sm mt-1">Vedi il podio completo →</p>
            </Link>
          </div>
        )}

        {/* Others' proposals */}
        {otherProposals.length === 0 && myProposals.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">🏖️</p>
            <p className="text-white font-semibold">Nessuna proposta ancora</p>
            <p className="text-zinc-500 text-sm">Sii il primo ad aggiungere un alloggio!</p>
          </div>
        )}

        {otherProposals.length > 0 && (
          <div className="space-y-3">
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Proposte del gruppo</p>
            {otherProposals.map((p, i) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                proposerLabel={getMemberDisplay(p.member_id)}
                hasVoted={votedIds.has(p.id)}
                onVote={() => handleVote(p.id)}
                isRevealed={isRevealed}
                voteCount={voteCounts[p.id]}
                index={i}
              />
            ))}
          </div>
        )}

        {/* My proposals */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Le mie proposte ({myProposals.length}/3)</p>
            {!isRevealed && myProposals.length < 3 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-emerald-400 text-xs font-semibold"
              >
                + Aggiungi
              </button>
            )}
          </div>
          {myProposals.length === 0 ? (
            <button
              onClick={() => !isRevealed && setShowAddModal(true)}
              className="w-full border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center space-y-2 hover:border-zinc-600 transition-colors"
            >
              <p className="text-3xl">🔗</p>
              <p className="text-zinc-400 text-sm">Aggiungi un link Airbnb, Booking, VRBO...</p>
              <p className="text-zinc-600 text-xs">Max 3 proposte per persona</p>
            </button>
          ) : (
            myProposals.map((p, i) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                proposerLabel="Tu"
                hasVoted={votedIds.has(p.id)}
                onVote={() => {}}
                isRevealed={isRevealed}
                voteCount={voteCounts[p.id]}
                isMine
                index={i}
                onDelete={async () => {
                  await supabase.from('proposals').delete().eq('id', p.id)
                  setLocalProposals(prev => prev.filter(x => x.id !== p.id))
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Add proposal modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end"
            onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false) }}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">Nuova proposta</h3>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-zinc-300">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-zinc-400 text-sm">Link Airbnb, Booking, VRBO, ...</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddProposal()}
                  placeholder="https://www.airbnb.it/rooms/..."
                  autoFocus
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                {addError && <p className="text-red-400 text-xs">{addError}</p>}
                {scrapingUrl && (
                  <p className="text-zinc-500 text-xs flex items-center gap-1.5">
                    <Loader2 size={11} className="animate-spin" /> Recupero anteprima...
                  </p>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAddProposal}
                disabled={addLoading || !newUrl.trim()}
                className="w-full bg-emerald-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-sm"
              >
                {addLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  'Pubblica proposta 🚀'
                )}
              </motion.button>

              <p className="text-zinc-600 text-xs text-center">
                Rimasti {3 - myProposalsCount} slot su 3 — scegli bene!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface CardProps {
  proposal: Proposal
  proposerLabel: string
  hasVoted: boolean
  onVote: () => void
  isRevealed: boolean
  voteCount?: number
  isMine?: boolean
  index: number
  onDelete?: () => void
}

function ProposalCard({ proposal, proposerLabel, hasVoted, onVote, isRevealed, voteCount, isMine, index, onDelete }: CardProps) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
    >
      {/* OG Image */}
      {proposal.og_image && (
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={proposal.og_image}
            alt={proposal.og_title ?? ''}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            {proposal.og_price && (
              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                {proposal.og_price}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        <div>
          <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
            {proposal.og_title ?? new URL(proposal.url.startsWith('http') ? proposal.url : 'https://' + proposal.url).hostname}
          </p>
          {proposal.og_location && (
            <p className="text-zinc-500 text-xs mt-0.5">📍 {proposal.og_location}</p>
          )}
          {proposal.og_description && (
            <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{proposal.og_description}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs">{proposerLabel}</span>
            <a
              href={proposal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="flex items-center gap-2">
            {isMine && !isRevealed && onDelete && (
              <button
                onClick={() => {
                  if (showDelete) onDelete()
                  else setShowDelete(true)
                }}
                className={`text-xs px-2 py-1 rounded-lg transition-all ${
                  showDelete ? 'bg-red-500/20 text-red-400' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {showDelete ? 'Conferma ✕' : '🗑️'}
              </button>
            )}

            {!isMine && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onVote}
                disabled={isRevealed}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  hasVoted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isRevealed
                    ? 'bg-zinc-800 text-zinc-600 cursor-default'
                    : 'bg-white text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <ThumbsUp size={13} fill={hasVoted ? 'currentColor' : 'none'} />
                {isRevealed
                  ? `${voteCount ?? 0} vot${(voteCount ?? 0) === 1 ? 'o' : 'i'}`
                  : hasVoted ? 'Votato' : 'Vota'
                }
              </motion.button>
            )}

            {isMine && isRevealed && (
              <span className="bg-zinc-800 text-zinc-400 text-sm px-3 py-1.5 rounded-xl font-semibold">
                {voteCount ?? 0} vot{(voteCount ?? 0) === 1 ? 'o' : 'i'}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
