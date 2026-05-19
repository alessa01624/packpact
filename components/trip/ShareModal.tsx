'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Copy, Check, MessageCircle } from 'lucide-react'

interface Props {
  inviteUrl: string
  tripName: string
  onClose: () => void
}

export default function ShareModal({ inviteUrl, tripName, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareNative() {
    const text = `🧳 Vieni a organizzare il viaggio con noi su PackPact!\n\nClicca qui per unirti a "${tripName}":\n${inviteUrl}`
    if (navigator.share) {
      await navigator.share({ title: `Unisciti a ${tripName}`, text, url: inviteUrl })
    } else {
      await copyLink()
    }
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(
      `🧳 Hey! Stiamo organizzando "${tripName}" su PackPact — unisciti per votare e decidere insieme!\n\n${inviteUrl}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6 z-50 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">Invita amici 👋</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>

        <p className="text-zinc-400 text-sm">
          Condividi il link con il tuo gruppo. Ogni persona potrà unirsi, compilare il questionario e votare.
        </p>

        {/* URL display */}
        <div className="bg-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3">
          <p className="text-zinc-300 text-sm truncate flex-1">{inviteUrl}</p>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={copyLink}
            className={`shrink-0 flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-all ${
              copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiato!' : 'Copia'}
          </motion.button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={shareWhatsApp}
            className="bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
          >
            <MessageCircle size={16} fill="currentColor" />
            WhatsApp
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={shareNative}
            className="bg-zinc-800 border border-zinc-700 text-white font-semibold py-3 rounded-2xl text-sm"
          >
            Altro 📤
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}
