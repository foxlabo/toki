'use client'

import { Loader2, Plus, Save, X } from 'lucide-react'
import { useState, useTransition } from 'react'
import { saveAvailabilityAction } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AvailabilityWindow } from '@/lib/db/schema'
import { formatHHMM, parseHHMM } from '@/lib/scheduling/validate'

interface AvailabilityEditorProps {
  initial: AvailabilityWindow[]
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

interface DraftRow {
  /** Stable client-side key for React. */
  key: string
  dayOfWeek: number
  start: string
  end: string
}

function emptyRow(dayOfWeek: number): DraftRow {
  return { key: crypto.randomUUID(), dayOfWeek, start: '09:00', end: '17:00' }
}

export function AvailabilityEditor({ initial }: AvailabilityEditorProps) {
  const [rows, setRows] = useState<DraftRow[]>(() =>
    initial.map((w) => ({
      key: w.id,
      dayOfWeek: w.dayOfWeek,
      start: formatHHMM(w.startMinute),
      end: formatHHMM(w.endMinute),
    })),
  )
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<
    { kind: 'ok'; message: string } | { kind: 'error'; message: string } | null
  >(null)

  function update(key: string, patch: Partial<DraftRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function remove(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key))
  }
  function addRow(dayOfWeek: number) {
    setRows((rs) => [...rs, emptyRow(dayOfWeek)])
  }

  function onSave() {
    setFeedback(null)
    // Parse rows + validate.
    const parsed: Array<{ dayOfWeek: number; startMinute: number; endMinute: number }> = []
    for (const r of rows) {
      const s = parseHHMM(r.start)
      const e = parseHHMM(r.end)
      if (s === null || e === null) {
        setFeedback({
          kind: 'error',
          message: `行の時刻が不正です: ${DAY_NAMES[r.dayOfWeek]} ${r.start}-${r.end}`,
        })
        return
      }
      if (e <= s) {
        setFeedback({
          kind: 'error',
          message: `終了時刻は開始時刻より後にしてください: ${DAY_NAMES[r.dayOfWeek]}`,
        })
        return
      }
      parsed.push({ dayOfWeek: r.dayOfWeek, startMinute: s, endMinute: e })
    }
    startTransition(async () => {
      const result = await saveAvailabilityAction({ windows: parsed })
      if (result.ok) {
        setFeedback({ kind: 'ok', message: '保存しました。' })
      } else {
        setFeedback({ kind: 'error', message: result.error ?? '保存に失敗しました。' })
      }
    })
  }

  return (
    <div className="grid gap-6">
      {DAY_NAMES.map((label, dow) => {
        const dayRows = rows.filter((r) => r.dayOfWeek === dow)
        return (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-900">{label}曜日</h3>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => addRow(dow)}
                aria-label={`${label}曜日に枠を追加`}
              >
                <Plus className="size-3.5" /> 枠を追加
              </Button>
            </div>
            {dayRows.length === 0 ? (
              <p className="text-xs text-zinc-500">休業日</p>
            ) : (
              <ul className="grid gap-2">
                {dayRows.map((r) => (
                  <li key={r.key} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={r.start}
                      onChange={(e) => update(r.key, { start: e.target.value })}
                      className="w-32"
                      aria-label={`${label}曜日 開始時刻`}
                    />
                    <span className="text-xs text-zinc-500">〜</span>
                    <Input
                      type="time"
                      value={r.end}
                      onChange={(e) => update(r.key, { end: e.target.value })}
                      className="w-32"
                      aria-label={`${label}曜日 終了時刻`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(r.key)}
                      aria-label={`${label}曜日の枠を削除`}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      {feedback && (
        <p
          role="alert"
          className={
            feedback.kind === 'ok'
              ? 'rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700'
              : 'rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700'
          }
        >
          {feedback.message}
        </p>
      )}

      <div>
        <Button size="sm" onClick={onSave} disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}{' '}
          保存
        </Button>
      </div>
    </div>
  )
}
