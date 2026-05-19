'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { createClient } from '@/lib/supabase/client'
import type { VibeTags } from '@/lib/types'
import { VIBE_LABELS } from '@/lib/utils'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const ITALIAN_DESTINATIONS = [
  // Regioni
  'Sicilia','Sardegna','Toscana','Puglia','Calabria','Liguria','Umbria','Lazio',
  'Piemonte','Lombardia','Campania','Abruzzo','Basilicata','Molise','Valle d\'Aosta',
  'Trentino','Friuli','Emilia-Romagna','Veneto','Marche',
  // Città grandi
  'Roma','Milano','Napoli','Venezia','Firenze','Bologna','Torino','Palermo',
  'Catania','Bari','Genova','Verona','Trieste','Trento','Perugia','Cagliari',
  'Reggio Calabria','Messina','Padova','Brescia','Parma','Modena','Ferrara',
  'Ancona','Pescara','Salerno','Foggia','Taranto','Reggio Emilia',
  // Mete costiere/turistiche
  'Costiera Amalfitana','Cinque Terre','Capri','Ischia','Procida','Positano',
  'Amalfi','Ravello','Sorrento','Tropea','Taormina','Cefalù','Agrigento',
  'Siracusa','Ragusa','Marsala','Trapani','Otranto','Lecce','Gallipoli',
  'Alberobello','Matera','Alghero','Olbia','Porto Cervo','San Teodoro',
  'Costa Smeralda','Palau','La Maddalena','Santa Teresa di Gallura',
  // Laghi/montagna
  'Lago di Garda','Lago Maggiore','Lago di Como','Lago d\'Iseo',
  'Dolomiti','Cortina d\'Ampezzo','Madonna di Campiglio','Courmayeur',
  'Livigno','Sestriere','Cervinia','Monte Rosa','Aosta',
  // Altre città belle
  'Siena','Pisa','Lucca','San Gimignano','Assisi','Orvieto','Spoleto',
  'Mantova','Cremona','Pavia','Como','Varese','Bergamo','Vicenza','Treviso',
  'Udine','Gorizia','Pordenone','Ravenna','Rimini','Riccione','Cattolica',
]

const EURO_DESTINATIONS = [
  // Spagna
  'Barcellona','Madrid','Ibiza','Maiorca','Minorca','Formentera','Tenerife',
  'Gran Canaria','Lanzarote','Fuerteventura','Siviglia','Granada','Valencia',
  'Bilbao','San Sebastián','Malaga','Marbella','Cadice','Cordova','Toledo',
  'Palma di Maiorca','Costa Brava','Costa del Sol',
  // Portogallo
  'Lisbona','Porto','Algarve','Funchal','Azzorre','Lagos','Albufeira','Faro',
  // Francia
  'Parigi','Nizza','Monaco','Cannes','Marsiglia','Lione','Bordeaux',
  'Tolosa','Strasburgo','Corsica','Saint-Tropez','Annecy','Chamonix',
  // Grecia
  'Santorini','Mykonos','Atene','Rodi','Corfù','Creta','Kos','Zante',
  'Cefalonia','Lefkada','Skiathos','Paros','Naxos','Milos','Salonicco',
  // Croazia/Balcani
  'Dubrovnik','Split','Hvar','Zara','Brac','Vis','Rovinj','Pola','Zagabria',
  'Kotor','Budva','Tivat','Sarajevo','Mostar','Lubiana','Piran',
  // Europa centrale/nord
  'Amsterdam','Berlino','Vienna','Praga','Budapest','Varsavia','Cracovia',
  'Bruxelles','Lussemburgo','Zurigo','Ginevra','Berna','Basilea','Losanna',
  'Copenhagen','Oslo','Stoccolma','Helsinki','Tallin','Riga','Vilnius',
  'Edimburgo','Londra','Dublino','Reykjavik','Bergen','Tromsø',
  'Monaco di Baviera','Francoforte','Amburgo','Colonia','Dresda',
  'Salisburgo','Innsbruck','Graz',
  // Est Europa
  'Sofia','Bucarest','Cluj-Napoca','Bratislava','Brno','Varsavia','Danzica',
  // Turchia/Mediterraneo Est
  'Istanbul','Antalya','Bodrum','Marmaris','Cappadocia','Izmir','Fethiye',
  'Malta','Cipro','Tel Aviv','Atene',
  // Africa/isole atlantiche
  'Marrakech','Fez','Casablanca','Agadir','Capo Verde','Sharm el-Sheikh',
  'Hurghada','Tunisi','Djerba',
  // Resto del mondo (top mete)
  'Bangkok','Bali','Phuket','Tokyo','Kyoto','Osaka','New York','Miami',
  'Dubai','Maldive','Mauritius','Seychelles','Cuba','Messico','Cancún',
  'New York','Los Angeles','San Francisco','Londra',
]

const ALL_DESTINATIONS = Array.from(new Set(ITALIAN_DESTINATIONS.concat(EURO_DESTINATIONS)))

interface Props {
  tripId: string
  memberId: string
}

type Step = 'budget' | 'vibes' | 'destinations' | 'dates' | 'wish'

const STEPS: Step[] = ['budget', 'vibes', 'destinations', 'dates', 'wish']

export default function QuestionnaireClient({ tripId, memberId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [currentStep, setCurrentStep] = useState(0)
  const [budget, setBudget] = useState('')
  const [vibes, setVibes] = useState<VibeTags[]>([])
  const [destinations, setDestinations] = useState<string[]>([])
  const [destInput, setDestInput] = useState('')
  const [destSuggestions, setDestSuggestions] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<Date[]>([])
  const [secretWish, setSecretWish] = useState('')
  const [loading, setLoading] = useState(false)
  const [direction, setDirection] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)

  const step = STEPS[currentStep]

  function goNext() {
    setDirection(1)
    setCurrentStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function goPrev() {
    setDirection(-1)
    setCurrentStep(s => Math.max(s - 1, 0))
  }

  function toggleVibe(v: VibeTags) {
    setVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  function handleDestInput(val: string) {
    setDestInput(val)
    if (val.length < 2) { setDestSuggestions([]); return }
    const q = val.toLowerCase()
    setDestSuggestions(
      ALL_DESTINATIONS
        .filter(d => d.toLowerCase().includes(q) && !destinations.includes(d))
        .slice(0, 6)
    )
  }

  function addDestination(dest: string) {
    if (destinations.length >= 4) return
    if (!destinations.includes(dest)) setDestinations(prev => [...prev, dest])
    setDestInput('')
    setDestSuggestions([])
    inputRef.current?.focus()
  }

  function removeDestination(dest: string) {
    setDestinations(prev => prev.filter(d => d !== dest))
  }

  async function handleSubmit() {
    setLoading(true)
    const budgetCents = Math.round(parseFloat(budget.replace(',', '.')) * 100)
    const dateStrings = selectedDays.map(d => format(d, 'yyyy-MM-dd'))

    const { error } = await supabase.from('questionnaire_responses').insert({
      trip_id: tripId,
      member_id: memberId,
      budget_max: isNaN(budgetCents) ? 0 : budgetCents,
      vibes,
      destinations,
      available_dates: dateStrings,
      secret_wish: secretWish.trim() || null,
    })

    if (!error) router.push(`/trip/${tripId}`)
    else { setLoading(false) }
  }

  const canProceed = () => {
    if (step === 'budget') return budget.trim() !== '' && !isNaN(parseFloat(budget))
    if (step === 'vibes') return vibes.length > 0
    if (step === 'destinations') return destinations.length > 0
    if (step === 'dates') return selectedDays.length > 0
    return true
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  }

  return (
    <div className="min-h-screen bg-[#F5F3FF]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-900">Trip Questionnaire</h1>
          <span className="text-gray-400 text-sm font-medium">{currentStep + 1} / {STEPS.length}</span>
        </div>
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= currentStep ? 'bg-purple-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="px-5 py-6 space-y-5">

              {/* BUDGET */}
              {step === 'budget' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">💰 Max Budget</h2>
                    <p className="text-gray-500 text-sm mt-1">How much do you want to spend max (all included)?</p>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-semibold">€</span>
                    <input
                      type="number"
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                      placeholder="500"
                      min="0"
                      className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-5 text-gray-900 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[300, 500, 800, 1200].map(v => (
                      <button
                        key={v}
                        onClick={() => setBudget(String(v))}
                        className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          budget === String(v)
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300'
                        }`}
                      >
                        €{v}
                      </button>
                    ))}
                  </div>
                  <p className="text-gray-400 text-xs">🔒 Private answer — only the group aggregate will be visible</p>
                </div>
              )}

              {/* VIBES */}
              {step === 'vibes' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">🎭 Trip Type</h2>
                    <p className="text-gray-500 text-sm mt-1">What are you looking for? You can pick multiple.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(VIBE_LABELS) as [VibeTags, string][]).map(([key, label]) => (
                      <motion.button
                        key={key}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => toggleVibe(key)}
                        className={`flex items-center gap-2 px-3 py-3 rounded-2xl text-left transition-all border-2 ${
                          vibes.includes(key)
                            ? 'bg-purple-50 border-purple-400 text-gray-900'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-purple-200'
                        }`}
                      >
                        <span className="text-xl shrink-0">{label.split(' ')[0]}</span>
                        <span className="text-sm font-semibold leading-tight">{label.split(' ').slice(1).join(' ')}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* DESTINATIONS */}
              {step === 'destinations' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">📍 Destinations</h2>
                    <p className="text-gray-500 text-sm mt-1">Where would you like to go? Max 4 choices.</p>
                  </div>

                  {destinations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {destinations.map(d => (
                        <motion.span
                          key={d}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex items-center gap-2 bg-purple-100 text-purple-700 text-sm font-semibold px-3 py-2 rounded-xl"
                        >
                          📍 {d}
                          <button onClick={() => removeDestination(d)} className="text-purple-400 hover:text-purple-700">✕</button>
                        </motion.span>
                      ))}
                    </div>
                  )}

                  {destinations.length < 4 && (
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={destInput}
                        onChange={e => handleDestInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && destInput.trim()) {
                            const exact = ALL_DESTINATIONS.find(d => d.toLowerCase() === destInput.toLowerCase())
                            addDestination(exact ?? destInput.trim())
                          }
                        }}
                        placeholder="Search a city or region..."
                        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm shadow-sm"
                      />
                      <AnimatePresence>
                        {destSuggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl overflow-hidden z-10 shadow-xl"
                          >
                            {destSuggestions.map(s => (
                              <button
                                key={s}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => addDestination(s)}
                                className="w-full text-left px-4 py-3 text-gray-800 text-sm hover:bg-purple-50 transition-colors flex items-center gap-2"
                              >
                                <span className="text-gray-400">📍</span> {s}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <p className="text-gray-400 text-xs">{4 - destinations.length} choice{4 - destinations.length !== 1 ? 's' : ''} remaining</p>
                </div>
              )}

              {/* DATES */}
              {step === 'dates' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">📅 Available Dates</h2>
                    <p className="text-gray-500 text-sm mt-1">Tap the days you're free — they'll turn purple!</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl p-3 overflow-hidden shadow-sm">
                    <DayPicker
                      mode="multiple"
                      selected={selectedDays}
                      onSelect={days => setSelectedDays(days ?? [])}
                      locale={it}
                      fromDate={new Date()}
                      toDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
                      showOutsideDays={false}
                    />
                  </div>
                  {selectedDays.length > 0 && (
                    <p className="text-purple-600 text-sm font-semibold">
                      ✓ {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}

              {/* WISH */}
              {step === 'wish' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">🌟 Secret Wish</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Is there something you really want to do on this trip? A concert, a restaurant, an experience...
                      Only we see this. (Optional)
                    </p>
                  </div>
                  <textarea
                    value={secretWish}
                    onChange={e => setSecretWish(e.target.value)}
                    placeholder="e.g. Watch a sunset on a boat, eat real Neapolitan pizza, see a music festival..."
                    maxLength={200}
                    rows={4}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm resize-none shadow-sm"
                  />
                  <p className="text-gray-400 text-xs">🔒 Only you and the anonymous group profile will see this</p>
                </div>
              )}

              {/* Nav buttons */}
              <div className="flex gap-3 pt-2 pb-8">
                {currentStep > 0 && (
                  <button
                    onClick={goPrev}
                    className="flex-1 bg-gray-100 text-gray-700 font-semibold py-4 rounded-2xl text-sm"
                  >
                    ← Back
                  </button>
                )}
                {currentStep < STEPS.length - 1 ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={goNext}
                    disabled={!canProceed()}
                    className="flex-[2] bg-purple-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-2xl text-sm transition-colors"
                  >
                    Next →
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-[2] bg-purple-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-sm"
                  >
                    {loading
                      ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                      : 'Submit answers ✓'
                    }
                  </motion.button>
                )}
              </div>

            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
