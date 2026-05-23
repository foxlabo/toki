import { CheckCircle2, Clock, ExternalLink, MapPin } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ensureDbReady } from '@/lib/db/init'
import { getBookingByCancelToken, getEventTypeBySlug } from '@/lib/db/queries'
import { formatBookingDateTime } from '@/lib/scheduling/format'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string; token: string }>
}

/** Same shape used by the cancel route. */
const TOKEN_REGEX = /^[A-Za-z0-9_-]{8,64}$/

export default async function ConfirmedPage({ params }: PageProps) {
  ensureDbReady()
  const { slug, token } = await params
  if (!TOKEN_REGEX.test(token)) notFound()
  // The URL itself is gated on knowing the cancel token, so id-only lookups
  // can't reveal PII or the cancel link.
  const booking = getBookingByCancelToken(token)
  const event = getEventTypeBySlug(slug)
  if (!event || !booking || booking.eventTypeId !== event.id) notFound()

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <CheckCircle2 className="size-4" /> 予約が確定しました。
      </div>
      <h1 className="mt-6 text-xl font-semibold text-zinc-900">{event.title}</h1>
      <dl className="mt-4 grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 text-zinc-500" />
          <div>
            <dt className="text-xs text-zinc-500">日時</dt>
            <dd className="text-zinc-900">{formatBookingDateTime(booking.startAtMs)}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 text-zinc-500" />
          <div>
            <dt className="text-xs text-zinc-500">場所</dt>
            <dd className="text-zinc-900">
              {event.locationKind}
              {event.locationDetail && (
                <span className="block text-xs text-zinc-600">{event.locationDetail}</span>
              )}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
        <p className="text-xs text-zinc-500">予約者</p>
        <p className="font-medium text-zinc-900">{booking.guestName}</p>
        <p className="text-xs text-zinc-600">{booking.guestEmail}</p>
        {booking.guestNote && (
          <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-700">{booking.guestNote}</p>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700">
        <p className="font-medium text-zinc-900">キャンセル用リンク</p>
        <p className="mt-1">予定が変わった場合は以下のリンクからキャンセルできます。</p>
        <Link
          href={`/cancel/${token}`}
          className="mt-2 inline-flex items-center gap-1 break-all font-mono text-[11px] text-zinc-700 underline"
        >
          /cancel/{token} <ExternalLink className="size-3" />
        </Link>
      </div>
    </div>
  )
}
