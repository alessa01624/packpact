'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Share2, Clock, ClipboardList, Box, Trophy,
  Plus, ExternalLink, Trash2, ThumbsUp, Loader2,
  CheckCircle, AlertCircle, Settings, X,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Trip, TripMember, GroupProfile, Proposal } from '@/lib/types'
import { VIBE_LABELS, formatCurrency } from '@/lib/utils'
import ShareModal from '@/components/trip/ShareModal'

type Tab = 'overview' | 'proposals' | 'results'

interface Props {
  trip: Trip
  currentMember: TripMember
  members: Pick<TripMember, 'id' | 'display_name' | 'emoji'>[]
  completedMemberIds: string[]
  groupProfile: GroupProfile | null
  hasCompletedQuestionnaire: boolean
  totalResponses: number
  proposals: Proposal[]
  myVotedProposalIds: string[]
  voteCounts: Record<string, number>
  secretWishes: { memberId: string; wish: string }[]
  membersWhoVoted: string[]
}

export default function TripHomeClient({
  trip, currentMember, members, completedMemberIds, groupProfile,
  hasCompletedQuestionnaire, proposals: initialProposals,
  myVotedProposalIds, voteCounts: initialVoteCounts, secretWishes, membersWhoVoted,
}: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('overview')
  const [revealing, setRevealing] = useState(false)

  async function maybeReveal() {
    if (trip.phase === 'revealed') return
    if (new Date(trip.deadline) > new Date()) return
    setRevealing(true)
    await fetch(`/api/trips/${trip.id}/reveal`, { method: 'POST' })
    window.location.reload()
  }
  const [showShare, setShowShare] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsSlots, setSettingsSlots] = useState<string[]>(trip.member_slots ?? members.map(m => m.display_name))
  const [settingsDeadline, setSettingsDeadline] = useState(() => {
    const d = new Date(trip.deadline)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [newSlotName, setNewSlotName] = useState('')
  const [settingsSaving, setSettingsSaving] = useState(false)
  const isCreator = currentMember.user_id === trip.creator_id
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newDates, setNewDates] = useState('')
  const [scraping, setScraping] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals)
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set(myVotedProposalIds))
  const [voteCounts, setVoteCounts] = useState(initialVoteCounts)
  const [whoVoted, setWhoVoted] = useState<Set<string>>(new Set(membersWhoVoted))

  const isRevealed = trip.phase === 'revealed'
  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? '')}/join/${trip.invite_token}`
  const myProposals = proposals.filter(p => p.member_id === currentMember.id)
  const otherProposals = proposals.filter(p => p.member_id !== currentMember.id)

  const phaseLabel = trip.phase === 'questionnaire' ? 'Questionnaire' : trip.phase === 'proposals' ? 'Proposals' : 'Revealed'

  const deadlineDate = new Date(trip.deadline)
  const deadlineStr = deadlineDate.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) + ' ' + deadlineDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  function getMemberName(memberId: string) {
    return members.find(x => x.id === memberId)?.display_name ?? '?'
  }

  async function handleVote(proposalId: string) {
    if (isRevealed) return
    const alreadyVoted = votedIds.has(proposalId)
    setVotedIds(prev => {
      const next = new Set(prev)
      alreadyVoted ? next.delete(proposalId) : next.add(proposalId)
      return next
    })
    // Update whoVoted: add on first vote, remove only if no more votes
    if (!alreadyVoted) {
      setWhoVoted(prev => new Set(prev).add(currentMember.id))
    } else {
      // Check if user still has other votes after removing this one
      const remainingVotes = [...votedIds].filter(id => id !== proposalId)
      if (remainingVotes.length === 0) {
        setWhoVoted(prev => { const s = new Set(prev); s.delete(currentMember.id); return s })
      }
    }
    if (navigator.vibrate) navigator.vibrate(10)
    if (alreadyVoted) {
      await supabase.from('votes').delete().eq('proposal_id', proposalId).eq('member_id', currentMember.id)
    } else {
      await supabase.from('votes').insert({ proposal_id: proposalId, member_id: currentMember.id, trip_id: trip.id })
    }
  }

  async function handleScrape() {
    if (!newUrl.trim()) return
    let url = newUrl.trim()
    if (!url.startsWith('http')) url = 'https://' + url
    setScraping(true)
    try {
      const res = await fetch('/api/og-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (res.ok) {
        const og = await res.json()
        if (og.title && !newTitle) setNewTitle(og.title)
        if (og.price && !newPrice) setNewPrice(og.price)
      }
    } catch {}
    setScraping(false)
  }

  function resetForm() {
    setNewUrl('')
    setNewTitle('')
    setNewPrice('')
    setNewDates('')
    setAddError('')
    setShowAddForm(false)
  }

  async function handleSaveSettings() {
    setSettingsSaving(true)
    const updates: Record<string, unknown> = { member_slots: settingsSlots, deadline: new Date(settingsDeadline).toISOString() }
    await supabase.from('trips').update(updates).eq('id', trip.id)
    // Remove trip_members whose slot name was deleted
    const removedNames = (trip.member_slots ?? []).filter(n => !settingsSlots.includes(n))
    for (const name of removedNames) {
      await supabase.from('trip_members').delete().eq('trip_id', trip.id).eq('display_name', name)
    }
    setSettingsSaving(false)
    setShowSettings(false)
    window.location.reload()
  }

  async function handleAddProposal() {
    if (!newUrl.trim() || !newTitle.trim()) {
      setAddError('URL and title are required.')
      return
    }
    setAddError('')
    let url = newUrl.trim()
    if (!url.startsWith('http')) url = 'https://' + url
    setAddLoading(true)

    // Re-scrape image if not already done
    let ogImage: string | null = null
    let ogLocation: string | null = null
    let ogDescription: string | null = null
    try {
      const res = await fetch('/api/og-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (res.ok) {
        const og = await res.json()
        ogImage = og.image
        ogLocation = og.location
        ogDescription = og.description
      }
    } catch {}

    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert({
        trip_id: trip.id,
        member_id: currentMember.id,
        url,
        og_title: newTitle.trim() || null,
        og_image: ogImage,
        og_description: ogDescription,
        og_price: newPrice.trim() || null,
        og_location: ogLocation,
        dates: newDates.trim() || null,
      })
      .select()
      .single()

    if (error) {
      setAddError(error.message.includes('Maximum') ? 'You have reached the 3 proposal limit.' : 'Error adding proposal.')
      setAddLoading(false)
      return
    }
    setProposals(prev => [proposal, ...prev])
    resetForm()
    setAddLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F3FF]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="flex items-start justify-between gap-3">
          <Link href="/">
            <button className="mt-1 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 shrink-0">
              <ArrowLeft size={15} />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{trip.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Clock size={12} className="text-gray-400 shrink-0" />
              <span className="text-gray-500 text-xs">Deadline: {deadlineStr}</span>
              <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">
                {phaseLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCreator && (
              <button
                onClick={() => setShowSettings(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <Settings size={16} />
              </button>
            )}
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Share2 size={13} />
              Invite
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-1">
        <div className="bg-[#EDE9FE] rounded-2xl p-1 grid grid-cols-3">
          {([
            { key: 'overview', label: 'Overview', icon: <ClipboardList size={13} /> },
            { key: 'proposals', label: 'Proposals', icon: <Box size={13} /> },
            { key: 'results',   label: 'Results',   icon: <Trophy size={13} /> },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key === 'results') maybeReveal() }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-white shadow-sm border border-purple-200 text-purple-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-16">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            {!hasCompletedQuestionnaire && (
              <Link href={`/trip/${trip.id}/questionnaire`}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className="bg-purple-600 rounded-2xl p-4 flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="text-white font-bold">Fill out the questionnaire</p>
                    <p className="text-purple-200 text-xs mt-0.5">Budget, trip type, dates and destinations</p>
                  </div>
                  <span className="text-white text-xl ml-2">→</span>
                </motion.div>
              </Link>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-3">Questionnaire Status</h2>
              <div className="space-y-2">
                {(trip.member_slots ?? members.map(m => m.display_name)).map(slotName => {
                  const joined = members.find(m => m.display_name === slotName)
                  const done = joined ? completedMemberIds.includes(joined.id) : false
                  const notJoined = !joined
                  return (
                    <div
                      key={slotName}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                        notJoined ? 'bg-gray-50' : done ? 'bg-green-50' : 'bg-orange-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {notJoined
                          ? <AlertCircle size={16} className="text-gray-300 shrink-0" />
                          : done
                            ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                            : <AlertCircle size={16} className="text-orange-400 shrink-0" />
                        }
                        <span className="text-gray-800 font-medium text-sm">
                          {joined ? `${joined.emoji} ` : ''}{slotName}
                        </span>
                      </div>
                      <span className={`text-xs font-semibold ${
                        notJoined ? 'text-gray-400' : done ? 'text-green-600' : 'text-orange-500'
                      }`}>
                        {notJoined ? 'Not joined' : done ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {(() => {
              const totalSlots = trip.member_slots?.length ?? members.length
              return totalSlots > 0 && completedMemberIds.length >= totalSlots
            })() && groupProfile ? (
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <h2 className="font-bold text-gray-900">Group Profile</h2>
                <div className="grid grid-cols-2 gap-3">
                  {groupProfile.avg_budget > 0 && (
                    <div className="bg-purple-50 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">Avg budget</p>
                      <p className="text-purple-700 font-bold text-lg">{formatCurrency(groupProfile.avg_budget)}</p>
                    </div>
                  )}
                  {groupProfile.top_vibes.length > 0 && (
                    <div className="bg-purple-50 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">Trip type</p>
                      {groupProfile.top_vibes.slice(0, 2).map(v => (
                        <p key={v} className="text-gray-800 text-xs font-medium">{VIBE_LABELS[v] ?? v}</p>
                      ))}
                    </div>
                  )}
                  {groupProfile.top_destinations.length > 0 && (
                    <div className="bg-purple-50 rounded-xl p-3 col-span-2">
                      <p className="text-gray-500 text-xs mb-2">Top destinations</p>
                      <div className="flex gap-2 flex-wrap">
                        {groupProfile.top_destinations.map(d => (
                          <span key={d} className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {groupProfile.common_dates.length > 0 && (
                    <div className="bg-purple-50 rounded-xl p-3 col-span-2">
                      <p className="text-gray-500 text-xs mb-1">Common dates</p>
                      <p className="text-gray-800 text-sm font-medium">{groupProfile.common_dates.slice(0, 5).join(' · ')}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-3 border-2 border-dashed border-gray-100">
                <div className="text-4xl">📊</div>
                <p className="font-semibold text-gray-700">No overall result yet</p>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Waiting for all members to complete the questionnaire. The group profile will appear here once everyone is done.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── PROPOSALS ── */}
        {tab === 'proposals' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">My Proposals ({myProposals.length}/3)</h2>
              </div>

              {/* Inline add form */}
              {showAddForm ? (
                <div className="bg-[#F5F3FF] rounded-2xl p-4 space-y-3">
                  <p className="font-bold text-gray-900">New Proposal</p>

                  <div className="space-y-1">
                    <label className="text-gray-500 text-xs font-medium">Listing URL *</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                        placeholder="https://airbnb.com/rooms/..."
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                      />
                      <button
                        onClick={handleScrape}
                        disabled={scraping || !newUrl.trim()}
                        className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-purple-600 hover:border-purple-300 disabled:opacity-40 transition-colors"
                        title="Fetch info from URL"
                      >
                        {scraping ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-500 text-xs font-medium">Title *</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="Beautiful villa in Lisbon..."
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-gray-500 text-xs font-medium">Price (€)</label>
                      <input
                        type="text"
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        placeholder="450"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-500 text-xs font-medium">Dates</label>
                      <input
                        type="text"
                        value={newDates}
                        onChange={e => setNewDates(e.target.value)}
                        placeholder="Aug 10–17"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                      />
                    </div>
                  </div>

                  {addError && <p className="text-red-500 text-xs">{addError}</p>}

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={resetForm}
                      className="py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProposal}
                      disabled={addLoading || !newUrl.trim() || !newTitle.trim()}
                      className="py-3 rounded-2xl bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      {addLoading && <Loader2 size={14} className="animate-spin" />}
                      Submit
                    </button>
                  </div>
                </div>
              ) : (
                !isRevealed && myProposals.length < 3 && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 bg-purple-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
                  >
                    <Plus size={14} /> Add Proposal
                  </button>
                )
              )}
            </div>

            {myProposals.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {myProposals.map(p => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    proposerLabel={getMemberName(p.member_id)}
                    hasVoted={votedIds.has(p.id)}
                    onVote={() => handleVote(p.id)}
                    isRevealed={isRevealed}
                    voteCount={voteCounts[p.id]}
                    isMine
                    onDelete={async () => {
                      await supabase.from('proposals').delete().eq('id', p.id)
                      setProposals(prev => prev.filter(x => x.id !== p.id))
                    }}
                    currentMemberId={currentMember.id}
                    tripId={trip.id}
                    allMembers={members}
                  />
                ))}
              </div>
            )}

            {otherProposals.length > 0 && (
              <>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider pt-1">Group Proposals</p>
                <div className="grid grid-cols-2 gap-3">
                  {otherProposals.map(p => (
                    <ProposalCard
                      key={p.id}
                      proposal={p}
                      proposerLabel={getMemberName(p.member_id)}
                      hasVoted={votedIds.has(p.id)}
                      onVote={() => handleVote(p.id)}
                      isRevealed={isRevealed}
                      voteCount={voteCounts[p.id]}
                      currentMemberId={currentMember.id}
                      tripId={trip.id}
                      allMembers={members}
                    />
                  ))}
                </div>
              </>
            )}

            {proposals.length === 0 && (
              <div className="bg-white rounded-2xl p-10 shadow-sm text-center space-y-3 border-2 border-dashed border-gray-100">
                <p className="text-4xl">🏖️</p>
                <p className="font-semibold text-gray-700">No proposals yet</p>
                <p className="text-gray-400 text-xs">Be the first to add an accommodation link!</p>
              </div>
            )}

            {/* Voting status */}
            {!isRevealed && (trip.member_slots ?? members.map(m => m.display_name)).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Who has voted</p>
                </div>
                {(trip.member_slots ?? members.map(m => m.display_name)).map(slotName => {
                  const joined = members.find(m => m.display_name === slotName)
                  const isMe = joined?.id === currentMember.id
                  const hasVoted = joined ? whoVoted.has(joined.id) : false
                  return (
                    <div key={slotName} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                      <span className="text-gray-800 text-sm">
                        {joined ? `${joined.emoji} ` : '👤 '}{slotName}{isMe ? ' (you)' : ''}
                      </span>
                      {!joined ? (
                        <span className="text-gray-300 text-xs">Not joined</span>
                      ) : hasVoted ? (
                        <span className="text-emerald-600 text-xs font-semibold">✓ Voted once</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Never voted</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── RESULTS ── */}
        {tab === 'results' && (
          <>
            {revealing ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-gray-500 text-sm font-medium">Revealing results…</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl shrink-0">⏰</div>
                  <div>
                    <p className="font-bold text-gray-900">Voting deadline</p>
                    <p className="text-gray-500 text-sm">
                      {deadlineDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} – {deadlineDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {isRevealed ? (
                  <div className="space-y-3">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">🏆 Final Podium</p>
                    {[...proposals]
                      .sort((a, b) => (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0))
                      .slice(0, 3)
                      .map((p, i) => (
                        <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                          <span className="text-2xl shrink-0">{['🥇', '🥈', '🥉'][i]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{p.og_title ?? p.url}</p>
                            <p className="text-gray-400 text-xs">by {getMemberName(p.member_id)}</p>
                          </div>
                          <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                            {voteCounts[p.id] ?? 0} votes
                          </span>
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-10 shadow-sm text-center space-y-4">
                    <Trophy size={48} className="text-gray-200 mx-auto" />
                    <div>
                      <p className="font-bold text-gray-700 text-base">Results are hidden until the deadline</p>
                      <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                        Votes are anonymous.{' '}
                        <span className="text-purple-500">The podium will be revealed when voting closes.</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Easter egg: secret wishes */}
                {isRevealed && secretWishes.length > 0 && (
                  <div className="mt-2 space-y-3">
                    <div className="text-center">
                      <p className="text-lg">✨</p>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Secret Wishes</p>
                      <p className="text-gray-400 text-xs mt-0.5">What everyone secretly hoped for…</p>
                    </div>
                    <div className="space-y-2">
                      {secretWishes.map(({ memberId, wish }) => {
                        const m = members.find(x => x.id === memberId)
                        return (
                          <div key={memberId} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl px-4 py-3 border border-purple-100">
                            <p className="text-xs text-gray-400 mb-1">{m?.emoji} {m?.display_name ?? '?'}</p>
                            <p className="text-gray-700 text-sm italic">"{wish}"</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showShare && (
          <ShareModal inviteUrl={inviteUrl} tripName={trip.name} onClose={() => setShowShare(false)} />
        )}
      </AnimatePresence>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => !settingsSaving && setShowSettings(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 overflow-y-auto"
              style={{ maxHeight: '85vh' }}
            >
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
                <h3 className="font-bold text-gray-900 text-base">Trip Settings</h3>
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="bg-purple-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm"
                >
                  {settingsSaving
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : 'Save'
                  }
                </button>
              </div>

              <div className="px-5 py-5 space-y-6">
                {/* Deadline */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Voting deadline</label>
                  <input
                    type="datetime-local"
                    value={settingsDeadline}
                    onChange={e => setSettingsDeadline(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                {/* Members */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">Group members</label>
                  <div className="space-y-2">
                    {settingsSlots.map(name => {
                      const hasJoined = members.some(m => m.display_name === name)
                      return (
                        <div key={name} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-800 text-sm font-medium">{name}</span>
                            {hasJoined && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">joined</span>}
                          </div>
                          <button
                            onClick={() => setSettingsSlots(prev => prev.filter(s => s !== name))}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Add member */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSlotName}
                      onChange={e => setNewSlotName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newSlotName.trim()) {
                          setSettingsSlots(prev => [...prev, newSlotName.trim()])
                          setNewSlotName('')
                        }
                      }}
                      placeholder="Add member name..."
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <button
                      onClick={() => {
                        if (newSlotName.trim()) {
                          setSettingsSlots(prev => [...prev, newSlotName.trim()])
                          setNewSlotName('')
                        }
                      }}
                      className="w-11 h-11 flex items-center justify-center bg-purple-600 text-white rounded-2xl"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Save */}
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="w-full bg-purple-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-sm"
                >
                  {settingsSaving
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    : 'Save changes'
                  }
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Proposal Card ──────────────────────────────────────────────────────────────

interface ProposalComment {
  id: string
  member_id: string
  content: string
}

interface CardProps {
  proposal: Proposal
  proposerLabel: string
  hasVoted: boolean
  onVote: () => void
  isRevealed: boolean
  voteCount?: number
  isMine?: boolean
  onDelete?: () => Promise<void>
  currentMemberId: string
  tripId: string
  allMembers: Pick<TripMember, 'id' | 'display_name' | 'emoji'>[]
}

function ProposalCard({
  proposal, proposerLabel, hasVoted, onVote, isRevealed, voteCount,
  isMine, onDelete, currentMemberId, tripId, allMembers,
}: CardProps) {
  const supabase = createClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [comments, setComments] = useState<ProposalComment[]>([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)

  async function loadComments() {
    if (commentsLoaded) return
    const { data } = await supabase
      .from('proposal_comments')
      .select('id, member_id, content')
      .eq('proposal_id', proposal.id)
    setComments(data ?? [])
    setCommentsLoaded(true)
  }

  function handleFlip() {
    if (!isFlipped) loadComments()
    setIsFlipped(v => !v)
  }

  async function handleSendComment() {
    const text = commentText.trim()
    if (!text || commentSaving) return
    setCommentSaving(true)
    const { data } = await supabase
      .from('proposal_comments')
      .upsert(
        { proposal_id: proposal.id, member_id: currentMemberId, trip_id: tripId, content: text },
        { onConflict: 'proposal_id,member_id' }
      )
      .select('id, member_id, content')
      .single()
    if (data) {
      setComments(prev => [...prev.filter(c => c.member_id !== currentMemberId), data])
      setCommentText('')
    }
    setCommentSaving(false)
  }

  let hostname = ''
  try { hostname = new URL(proposal.url.startsWith('http') ? proposal.url : 'https://' + proposal.url).hostname } catch {}

  const myComment = comments.find(c => c.member_id === currentMemberId)

  const frontVariants = {
    enter: { opacity: 1, rotateY: 0, transition: { duration: 0.22 } },
    exit:  { opacity: 0, rotateY: -15, transition: { duration: 0.18 } },
  }
  const backVariants = {
    enter: { opacity: 1, rotateY: 0, transition: { duration: 0.22 } },
    exit:  { opacity: 0, rotateY: 15, transition: { duration: 0.18 } },
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <AnimatePresence mode="wait" initial={false}>
        {!isFlipped ? (
          <motion.div
            key="front"
            initial={{ opacity: 0, rotateY: 15 }}
            animate={frontVariants.enter}
            exit={frontVariants.exit}
          >
            <a href={proposal.url} target="_blank" rel="noopener noreferrer" className="block relative">
              <div className="h-32 bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center overflow-hidden">
                {proposal.og_image
                  ? <img src={proposal.og_image} alt={proposal.og_title ?? ''} className="w-full h-full object-cover" />
                  : <ExternalLink size={22} className="text-gray-300" />
                }
              </div>
              {isMine && !isRevealed && onDelete && (
                <button
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (confirmDelete) { onDelete() }
                    else setConfirmDelete(true)
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${
                    confirmDelete ? 'bg-red-500 text-white' : 'bg-white/80 backdrop-blur-sm text-gray-500 hover:text-red-500'
                  }`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </a>

            <div className="p-3 space-y-1.5">
              <p className="text-gray-900 font-semibold text-sm leading-tight line-clamp-2">
                {proposal.og_title ?? hostname}
              </p>
              <p className="text-gray-400 text-xs">by {proposerLabel}</p>
              <div className="flex items-center gap-3 flex-wrap">
                {proposal.og_price && (
                  <span className="text-purple-600 text-xs font-semibold">$ {proposal.og_price}</span>
                )}
                {proposal.dates && (
                  <span className="text-gray-400 text-xs">📅 {proposal.dates}</span>
                )}
              </div>

              {isRevealed ? (
                <div className="bg-gray-50 rounded-xl py-2 text-center text-xs font-semibold text-gray-500">
                  🏆 {voteCount ?? 0} {(voteCount ?? 0) === 1 ? 'vote' : 'votes'}
                </div>
              ) : (
                <button
                  onClick={onVote}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    hasVoted
                      ? 'bg-purple-100 text-purple-600 ring-1 ring-purple-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-purple-50 hover:text-purple-500'
                  }`}
                >
                  <ThumbsUp size={14} fill={hasVoted ? 'currentColor' : 'none'} />
                </button>
              )}
              <button
                onClick={handleFlip}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 text-gray-400 text-xs hover:bg-gray-100 transition-colors"
              >
                💬 Comments
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ opacity: 0, rotateY: -15 }}
            animate={backVariants.enter}
            exit={backVariants.exit}
            className="flex flex-col"
            style={{ minHeight: '280px' }}
          >
            <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">💬 Comments</p>
              <button onClick={handleFlip} className="text-gray-400 hover:text-gray-600 p-0.5">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ minHeight: '80px' }}>
              {!commentsLoaded ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={16} className="animate-spin text-gray-300" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-gray-300 text-xs text-center py-6">No comments yet</p>
              ) : (
                comments.map(c => {
                  const m = allMembers.find(x => x.id === c.member_id)
                  return (
                    <div key={c.id} className="bg-gray-50 rounded-xl px-2.5 py-2">
                      <p className="text-gray-400 text-xs mb-0.5">{m?.emoji} {m?.display_name ?? '?'}</p>
                      <p className="text-gray-700 text-xs leading-relaxed">{c.content}</p>
                    </div>
                  )
                })
              )}
            </div>

            <div className="px-3 pb-3 pt-2 border-t border-gray-100 space-y-1.5">
              <div className="relative">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value.slice(0, 100))}
                  placeholder={myComment ? 'Update your comment…' : 'Add a comment…'}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none pr-12"
                />
                <span className="absolute bottom-2.5 right-2.5 text-gray-300 text-xs">{commentText.length}/100</span>
              </div>
              <button
                onClick={handleSendComment}
                disabled={!commentText.trim() || commentSaving}
                className="w-full bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5"
              >
                {commentSaving && <Loader2 size={12} className="animate-spin" />}
                {myComment ? 'Update' : 'Send'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
