import { resolve } from 'node:path'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db, sqliteHandle } from './index'
import {
  availabilityWindows,
  eventTypes,
  type NewAvailabilityWindow,
  type NewEventType,
} from './schema'

let initialized = false

const SAMPLE_EVENT_TYPES: Array<NewEventType & { id: string }> = [
  {
    id: 'sample-30min',
    slug: '30min',
    title: '30分ミーティング',
    description: '初対面のキックオフや簡単な相談に。',
    durationMinutes: 30,
    locationKind: 'video',
    locationDetail: 'Google Meet (確定後にリンクをお送りします)',
    color: 'emerald',
  },
  {
    id: 'sample-60min',
    slug: '60min',
    title: '1時間ディスカッション',
    description: '設計レビューや深い相談向け。',
    durationMinutes: 60,
    locationKind: 'video',
    locationDetail: 'Google Meet (確定後にリンクをお送りします)',
    color: 'indigo',
  },
]

/** Mon–Fri 09:00–17:00 default schedule. */
const DEFAULT_WINDOWS: Array<Omit<NewAvailabilityWindow, 'id'>> = [1, 2, 3, 4, 5].map(
  (dayOfWeek) => ({
    dayOfWeek,
    startMinute: 9 * 60,
    endMinute: 17 * 60,
  }),
)

/**
 * Apply pending migrations and seed sample data idempotently. Safe to call
 * many times — the migration is no-op after the first call, and the seed
 * uses INSERT OR IGNORE / row-count checks.
 */
export function ensureDbReady(): void {
  if (initialized) return
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') })

  // Raw SQL bypasses Drizzle's $defaultFn, so we explicitly fill timestamps.
  const seedTs = Date.now()
  for (const ev of SAMPLE_EVENT_TYPES) {
    sqliteHandle
      .prepare(
        `INSERT OR IGNORE INTO event_types
         (id, slug, title, description, duration_minutes, location_kind,
          location_detail, color, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        ev.id,
        ev.slug,
        ev.title,
        ev.description ?? '',
        ev.durationMinutes,
        ev.locationKind ?? 'video',
        ev.locationDetail ?? '',
        ev.color ?? 'zinc',
        seedTs,
        seedTs,
      )
  }

  const windowCount = sqliteHandle
    .prepare('SELECT COUNT(*) AS c FROM availability_windows')
    .get() as { c: number }
  if (windowCount.c === 0) {
    const insert = sqliteHandle.prepare(
      'INSERT INTO availability_windows (id, day_of_week, start_minute, end_minute) VALUES (?, ?, ?, ?)',
    )
    const tx = sqliteHandle.transaction(() => {
      for (const w of DEFAULT_WINDOWS) {
        insert.run(`seed-${w.dayOfWeek}`, w.dayOfWeek, w.startMinute, w.endMinute)
      }
    })
    tx()
  }

  initialized = true
  // Silence unused-warning if availability/eventTypes happens to drop out.
  void availabilityWindows
  void eventTypes
}
