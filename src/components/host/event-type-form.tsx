'use client'

import { Loader2, Save, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { createEventTypeAction, deleteEventTypeAction, updateEventTypeAction } from '@/app/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { EventType } from '@/lib/db/schema'
import { COLOR_TOKENS, LOCATION_KINDS } from '@/lib/scheduling/validate'

interface EventTypeFormProps {
  /** Pass a row to edit it, omit to create a new one. */
  event?: EventType
}

const DURATIONS = [15, 20, 30, 45, 60, 90, 120, 180] as const

export function EventTypeForm({ event }: EventTypeFormProps) {
  const isEdit = !!event
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function onSubmit(formData: FormData) {
    setError(null)
    const result = isEdit
      ? await updateEventTypeAction(event.id, formData)
      : await createEventTypeAction(formData)
    if (!result.ok) setError(result.error ?? 'Failed.')
    // On success, the server action calls redirect() — no client-side nav needed.
  }

  function onDelete() {
    if (!event) return
    startTransition(async () => {
      await deleteEventTypeAction(event.id)
    })
  }

  return (
    <form action={onSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="title" className="text-xs font-medium text-zinc-700">
          タイトル
        </label>
        <Input
          id="title"
          name="title"
          defaultValue={event?.title ?? ''}
          required
          placeholder="30分ミーティング"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="slug" className="text-xs font-medium text-zinc-700">
          スラッグ <span className="text-zinc-500">(/book/&lt;slug&gt;)</span>
        </label>
        <Input
          id="slug"
          name="slug"
          defaultValue={event?.slug ?? ''}
          required
          placeholder="30min"
          pattern="[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?"
          title="lowercase letters, digits, and dashes only"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="description" className="text-xs font-medium text-zinc-700">
          説明
        </label>
        <Textarea
          id="description"
          name="description"
          defaultValue={event?.description ?? ''}
          rows={3}
          placeholder="このイベントの目的や事前準備を書きます。"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="durationMinutes" className="text-xs font-medium text-zinc-700">
            所要時間
          </label>
          <Select
            id="durationMinutes"
            name="durationMinutes"
            defaultValue={String(event?.durationMinutes ?? 30)}
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d}分
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="color" className="text-xs font-medium text-zinc-700">
            カラー
          </label>
          <Select id="color" name="color" defaultValue={event?.color ?? 'zinc'}>
            {COLOR_TOKENS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="locationKind" className="text-xs font-medium text-zinc-700">
            場所の種類
          </label>
          <Select
            id="locationKind"
            name="locationKind"
            defaultValue={event?.locationKind ?? 'video'}
          >
            {LOCATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="locationDetail" className="text-xs font-medium text-zinc-700">
            場所の詳細
          </label>
          <Input
            id="locationDetail"
            name="locationDetail"
            defaultValue={event?.locationDetail ?? ''}
            placeholder="Google Meet リンク / 住所 / 電話番号など"
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}{' '}
          {isEdit ? '更新する' : '作成する'}
        </Button>
        {isEdit && (
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="destructive">
                <Trash2 className="size-3.5" /> 削除
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>イベント種別を削除しますか？</DialogTitle>
                <DialogDescription>
                  「{event.title}」を削除します。関連する予約も全て削除されます。
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="destructive" onClick={onDelete} disabled={pending}>
                  削除する
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </form>
  )
}
