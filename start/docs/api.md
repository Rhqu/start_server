# API Routes

## Internal APIs

### POST /api/chat

Streams AI chat responses using OpenAI GPT-4o.

### Request

```json
{
  "messages": [
    {
      "id": "string",
      "role": "user",
      "parts": [{ "type": "text", "text": "Hello" }]
    }
  ]
}
```

### Response

Streaming response using AI SDK UI message format (`toUIMessageStreamResponse()`).

### Client Example

```typescript
import { useMemo } from 'react'
import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'

const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), [])
const { messages, sendMessage, status } = useChat({ transport })

// Send a message
sendMessage({ text: 'Hello!' })
```

### Server Implementation

```typescript
// src/routes/api/chat.ts
import { createFileRoute } from '@tanstack/react-router'
import { streamText, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = await request.json()
        const result = streamText({
          model: openai('gpt-4o'),
          messages: convertToModelMessages(messages),
        })
        return result.toUIMessageStreamResponse()
      },
    },
  },
})
```

## Adding New API Routes

Create a new file in `src/routes/api/`:

```typescript
// src/routes/api/example.ts
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/example')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ hello: 'world' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      },
      POST: async ({ request }) => {
        const body = await request.json()
        return new Response(JSON.stringify({ received: body }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
})
```

---

## Qplix External API

Investment management platform API for portfolio data, performance metrics, and analytics.

### Quick Reference

| Resource | Description |
|----------|-------------|
| [API Reference](./qplix-references/api-reference.md) | Auth flow, endpoints, response schemas |
| [Command Reference](./qplix-references/api-docs.md) | 478 available commands |
| [Example Client](./qplix-references/api.js) | Node.js implementation |

### Authentication

Dual bearer token system:
1. **F5 Bearer** - Gateway auth token
2. **Q Bearer** - App token via `POST /Token` with username/password

```http
Authorization: Bearer <F5_TOKEN>, Bearer <Q_TOKEN>
```

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /Token` | Get Q Bearer token |
| `GET /qapi/v1/evaluation/preset/{presetId}/legalEntity/{entityId}` | Evaluation data |

### Preset IDs

| ID | Type |
|----|------|
| `691dd7473022610895c23ad9` | Performance Metrics |
| `691dd5953022610895c1aeff` | Time Series (Classification) |
| `691dd48d3022610895c102ea` | Time Series (Security) |

See [api-reference.md](./qplix-references/api-reference.md) for full documentation.
