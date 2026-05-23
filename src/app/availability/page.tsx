import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AvailabilityEditor } from '@/components/host/availability-editor'
import { ensureDbReady } from '@/lib/db/init'
import { listAvailabilityWindows } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export default function AvailabilityPage() {
  ensureDbReady()
  const windows = listAvailabilityWindows()
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" /> 戻る
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900">営業時間</h1>
      <p className="mt-1 text-sm text-zinc-600">
        曜日ごとに予約を受け付ける時間帯を設定します。すべてのイベント種別で共有されます。
      </p>
      <div className="mt-6">
        <AvailabilityEditor initial={windows} />
      </div>
    </div>
  )
}
