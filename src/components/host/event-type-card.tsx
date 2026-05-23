import { Clock, ExternalLink, Pencil } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { EventType } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface EventTypeCardProps {
  event: EventType
}

const COLOR_TO_CHIP: Record<string, string> = {
  zinc: 'bg-zinc-100 text-zinc-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  sky: 'bg-sky-100 text-sky-700',
}

export function EventTypeCard({ event }: EventTypeCardProps) {
  const chip = COLOR_TO_CHIP[event.color] ?? COLOR_TO_CHIP.zinc
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{event.title}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">/book/{event.slug}</p>
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', chip)}>
          {event.locationKind}
        </span>
      </header>
      {event.description && (
        <p className="line-clamp-2 text-sm text-zinc-600">{event.description}</p>
      )}
      <footer className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <Clock className="size-3" />
          {event.durationMinutes}分
        </span>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/event-types/${event.id}`}>
              <Pencil className="size-3" /> 編集
            </Link>
          </Button>
          <Button asChild size="sm" variant="default">
            <Link href={`/book/${event.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3" /> 予約ページ
            </Link>
          </Button>
        </div>
      </footer>
    </article>
  )
}
