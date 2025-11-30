# Database

Uses SQLite with Drizzle ORM.

## Commands

```bash
# Generate migrations from schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# Open Drizzle Studio (GUI)
bun run db:studio
```

## Schema

Located in `src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
```

## Usage

```typescript
import { db } from '@/db'
import { messages } from '@/db/schema'

// Insert
await db.insert(messages).values({ role: 'user', content: 'Hello' })

// Query
const allMessages = await db.select().from(messages)
```

## Adding Tables

1. Add table to `src/db/schema.ts`
2. Run `bun run db:generate`
3. Run `bun run db:migrate`
