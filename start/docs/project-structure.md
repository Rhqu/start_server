# Project Structure

```
src/
├── routes/
│   ├── __root.tsx          # Root layout
│   ├── index.tsx           # Landing page (/)
│   ├── chat.tsx            # Chat page (/chat)
│   ├── api/
│   │   └── chat.ts         # Chat API endpoint (/api/chat)
│   └── demo/               # Demo routes for TanStack Start features
│       ├── api.names.ts
│       ├── start.api-request.tsx
│       ├── start.server-funcs.tsx
│       └── start.ssr.*.tsx
├── components/
│   ├── ai-elements/        # AI Elements UI components
│   ├── ui/                 # shadcn/ui components
│   ├── Chat.tsx            # Main chat component
│   ├── Header.tsx          # Header component
│   └── Footer.tsx          # Footer component
├── data/
│   └── demo.punk-songs.ts  # Demo data
├── db/
│   ├── index.ts            # Database connection
│   └── schema.ts           # Drizzle schema
├── lib/
│   └── utils.ts            # Utility functions (cn helper)
├── router.tsx              # Router configuration
├── routeTree.gen.ts        # Auto-generated route tree
└── styles.css              # Global styles (Tailwind)
```

```
docs/
├── getting-started.md      # Setup guide
├── project-structure.md    # This file
├── database.md             # Database schema docs
├── api.md                  # API routes documentation
└── qplix-references/       # Qplix external API
    ├── api-reference.md    # Auth, endpoints, schemas
    ├── api-docs.md         # 478 command reference
    └── api.js              # Example Node.js client
```

## Key Files

- `CLAUDE.md` - Project guidelines for AI assistants
- `vite.config.ts` - Vite + TanStack Start configuration
- `drizzle.config.ts` - Drizzle ORM configuration
- `components.json` - shadcn/ui configuration
