'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createBookingAction } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface BookingFormProps {
  slug: string
  eventTypeId: string
  date: string
  startMinute: number
}

export function BookingForm({ slug, eventTypeId, date, startMinute }: BookingFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createBookingAction({
        eventTypeId,
        date,
        startMinute,
        guestName: name,
        guestEmail: email,
        guestNote: note,
      })
      if (result.ok) {
        // Authenticated by cancel token in the URL — not the booking id —
        // so a guessed/leaked id can't reveal PII or the cancel link.
        router.push(`/book/${slug}/confirmed/${result.cancelToken}`)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="name" className="text-xs font-medium text-zinc-700">
          お名前
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          autoComplete="name"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-xs font-medium text-zinc-700">
          メールアドレス
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={200}
          autoComplete="email"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="note" className="text-xs font-medium text-zinc-700">
          メモ <span className="text-zinc-500">(任意)</span>
        </label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-3.5 animate-spin" />} 予約を確定する
      </Button>
    </form>
  )
}
