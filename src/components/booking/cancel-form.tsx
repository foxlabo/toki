'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { cancelBookingByTokenAction } from '@/app/actions'
import { Button } from '@/components/ui/button'

interface CancelFormProps {
  token: string
}

export function CancelForm({ token }: CancelFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onCancel() {
    setError(null)
    startTransition(async () => {
      const result = await cancelBookingByTokenAction(token)
      if (!result.ok) {
        setError(result.error ?? 'キャンセルに失敗しました。')
        return
      }
      // Stay on the page; the parent server component will refresh and show
      // the "cancelled" state. router.refresh() forces the re-fetch.
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="destructive" onClick={onCancel} disabled={pending}>
        {pending && <Loader2 className="size-3.5 animate-spin" />} 予約をキャンセルする
      </Button>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
