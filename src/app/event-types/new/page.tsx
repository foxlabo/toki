import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EventTypeForm } from '@/components/host/event-type-form'

export const dynamic = 'force-dynamic'

export default function NewEventTypePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" /> 戻る
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900">新規イベント種別</h1>
      <p className="mt-1 text-sm text-zinc-600">ゲストが予約できるイベント種別を作成します。</p>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
        <EventTypeForm />
      </div>
    </div>
  )
}
