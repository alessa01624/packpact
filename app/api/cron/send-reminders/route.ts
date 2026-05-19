import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const windowEnd = new Date(now.getTime() + 2.5 * 60 * 60 * 1000)

  // Trips whose deadline is within the next 2.5h and haven't been notified yet
  const { data: trips } = await supabase
    .from('trips')
    .select('id, name, invite_token, deadline')
    .eq('reminder_sent', false)
    .gte('deadline', now.toISOString())
    .lte('deadline', windowEnd.toISOString())

  if (!trips || trips.length === 0) {
    return NextResponse.json({ sent: 0, trips: 0 })
  }

  let totalSent = 0

  for (const trip of trips) {
    const { data: members } = await supabase
      .from('trip_members')
      .select('user_id, display_name, emoji')
      .eq('trip_id', trip.id)

    if (!members?.length) continue

    const tripUrl = `${process.env.NEXT_PUBLIC_APP_URL}/trip/${trip.id}`
    const deadline = new Date(trip.deadline)
    const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60))
    const deadlineLabel = deadline.toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long',
    }) + ' alle ' + deadline.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

    for (const member of members) {
      const { data: { user } } = await supabase.auth.admin.getUserById(member.user_id)
      if (!user?.email) continue

      await resend.emails.send({
        from: 'PackPact <noreply@packpact.app>',
        to: user.email,
        subject: `⏰ ${hoursLeft}h rimaste per votare — ${trip.name}`,
        html: buildEmail({ memberName: member.display_name, memberEmoji: member.emoji, tripName: trip.name, hoursLeft, tripUrl, deadlineLabel }),
      })
      totalSent++
    }

    await supabase.from('trips').update({ reminder_sent: true }).eq('id', trip.id)
  }

  return NextResponse.json({ sent: totalSent, trips: trips.length })
}

function buildEmail({ memberName, memberEmoji, tripName, hoursLeft, tripUrl, deadlineLabel }: {
  memberName: string
  memberEmoji: string
  tripName: string
  hoursLeft: number
  tripUrl: string
  deadlineLabel: string
}) {
  return `<!DOCTYPE html>
<html lang="it">
<body style="margin:0;padding:20px;background:#F5F3FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">✈️</div>
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">PackPact</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:16px;margin:0 0 4px;">Ciao ${memberEmoji} <strong>${memberName}</strong>,</p>
      <h2 style="color:#111827;font-size:22px;font-weight:700;margin:12px 0 16px;">⏰ Mancano solo ${hoursLeft} ore!</h2>
      <p style="color:#6B7280;font-size:15px;line-height:1.7;margin:0 0 12px;">
        La deadline per votare la proposta di alloggio per
        <strong style="color:#111827;">${tripName}</strong>
        scade <strong style="color:#7c3aed;">${deadlineLabel}</strong>.
      </p>
      <p style="color:#6B7280;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Non dimenticare di votare la tua proposta preferita prima che scada il tempo — i voti sono anonimi e il podio si rivela solo alla deadline! 🏆
      </p>
      <div style="text-align:center;">
        <a href="${tripUrl}"
           style="display:inline-block;background:#7c3aed;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:16px;text-decoration:none;">
          Vota ora →
        </a>
      </div>
    </div>
    <div style="padding:16px 24px;background:#F9FAFB;text-align:center;border-top:1px solid #F3F4F6;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">PackPact — organizza il tuo viaggio di gruppo senza drama 🌍</p>
    </div>
  </div>
</body>
</html>`
}
