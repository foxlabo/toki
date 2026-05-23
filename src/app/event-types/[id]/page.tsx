import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EventTypeForm } from '@/components/host/event-type-form'
import { ensureDbReady } from '@/lib/db/init'
import { getEventType } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EventTypeDetailPage({ params }: PageProps) {
  ensureDbReady()
  const { id } = await params
  const event = getEventType(id)
  if (!event) notFound()

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" /> 戻る
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900">{event.title}</h1>
      <p className="mt-1 text-sm text-zinc-600">/book/{event.slug}</p>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
        <EventTypeForm event={event} />
      </div>
    </div>
  )
}
