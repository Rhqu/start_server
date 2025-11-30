# Chat Tools & Chain-of-Thought Reference

This guide documents the existing `randomList` tool used by the AI chat endpoint and explains how to add additional tools, how the chatbot decides to invoke them, and how their outputs propagate through the UI.

## Current Tool Implementation (Example: `randomList`)

Use the `randomList` tool as the canonical example when referencing tooling in future AI work. The chat API (`src/routes/api/chat.ts`) wires tools through the [Vercel AI SDK](https://ai-sdk.dev/docs/tools). Each tool is defined with a schema plus an `execute` function and registered under the `tools` option of `streamText`.

```ts
const randomListTool = tool({
  description: 'Returns short random context lists.',
  inputSchema: z.object({
    count: z.number().int().min(1).max(8).default(3),
    topic: z.string().trim().optional(),
  }),
  async execute({ count, topic }) {
    const label = topic?.length ? topic : 'context'
    return {
      items: Array.from({ length: count }, (_, index) => {
        const value = Math.floor(Math.random() * 10_000)
        return `${label}-${index + 1}-${value}`
      }),
    }
  },
})
```

- **Schema** – The `inputSchema` (here using Zod) is converted into JSON Schema automatically by the SDK and sent to OpenAI. Models see the typed arguments (`count`, `topic`) and must stay within the allowed range.
- **Execution** – `execute` runs inside your server route when the model calls the tool. The return value becomes the `output` visible to both the model (for follow-up reasoning) and the UI (via tool UI parts).
- **Registration** – In `streamText`, the tool is made available via `tools: { randomList: randomListTool }`, `toolChoice: 'auto'`, and a `stopWhen` condition such as `stepCountIs(4)` to permit multiple LLM/tool steps. The SDK handles calling the model, parsing tool inputs, invoking `execute`, and replaying outputs.

The system prompt also tells the assistant when to consider this tool and to summarize tool usage at the end of every reply (e.g., `Tools: randomList mit count=3` vs. `Tools: keine`).

## When Does the Chatbot Call a Tool?

Tool invocation is driven by three inputs:

1. **System policy** – The prompt nudges the assistant to call `randomList` whenever the user explicitly requests random/contextual lists or when placeholder context would be useful.
2. **User request semantics** – During each `streamText` step, the model reviews the latest messages and decides whether fulfilling the instruction benefits from an available tool. Phrases like “Generate a random to-do list” or “Grab a few quick context bullet points” almost always trigger `randomList`.
3. **Model control options** – Because `toolChoice: 'auto'`, GPT-4o freely decides between responding directly or returning a `tool-call`. Combine that with `stopWhen: stepCountIs(4)` (or similar) to allow alternating between thinking and tool usage (LLM → tool → LLM …). You can force tools with `'required'`, disable them with `'none'`, or restrict to a subset via `activeTools`.

While the tool runs, the UI receives intermediate reasoning + tool parts (`type: 'reasoning'`, `type: 'tool-randomList'`, etc.). The assistant resumes generation after the tool output is streamed back into the model context.

## Surfacing Tool Output in the UI

`Chat.tsx` inspects the AI SDK message parts:

- **Reasoning parts** show the model’s internal steps.
- **Tool parts** include `toolName`, `toolCallId`, `input`, `output`, `errorText`, and `state` (`input-available`, `output-available`, etc.).

These parts feed into the `ChainOfThought` component, giving users a collapsible trace (status, parameters, JSON payloads). Because tool parts follow a consistent structure, additional tools will automatically appear without extra UI work.

## Adding Another Tool

1. **Define the tool** – Import `tool` from `ai`, build a schema (`jsonSchema`, `zod`, or manual function), and implement `execute`. Return serializable data (objects, arrays, strings, numbers, booleans, null).
2. **Register it** – Extend the `tools` object and allow multiple steps:
   ```ts
   import { stepCountIs, streamText } from 'ai'

   const tools = {
     randomList: randomListTool,
     myNewTool: myNewToolDefinition,
   }
   const result = streamText({
     model,
     tools,
     toolChoice: 'auto',
     stopWhen: stepCountIs(4),
   })
   ```
   Optionally tweak `toolChoice`, stop conditions (`stopWhen`), or `activeTools` per request.
3. **Update instructions** – Mention when to call the new tool, what inputs to provide, and how to blend tool outputs into natural language responses.
4. **Handle primary data flows** – Inside `execute`, you can reach databases, APIs, or local functions. The tool output becomes available to:
   - The model (as `tool`/`dynamic-tool` parts) for follow-up reasoning.
   - The client UI (via Streamdown + ChainOfThought) for transparency and debugging.
5. **Control multi-step runs** – The AI SDK stops after one LLM step by default. Set `stopWhen: stepCountIs(n)` (e.g., `stepCountIs(4)`) in `streamText` so the model can call tools and then continue responding.
6. **Test** – Use prompts that should and should not trigger the tool to ensure the model follows instructions. Watch the ChainOfThought trace to confirm inputs/outputs.

## Working With Multiple Tools

The AI SDK supports arbitrarily many tools in a single request. Best practices:

- **Purpose-specific schemas** – Keep inputs tightly scoped so the model knows which tool fits which request.
- **Instruction hierarchy** – In the system prompt, list each tool with a short when-to-use guideline. If two tools overlap, explain priority (“Prefer `fetchDocs` over `randomList` when the user asks for factual company data.”).
- **Chained reasoning** – After each `tool` result, GPT-4o automatically receives the JSON output. You can instruct it to:
  - Summarize or transform the data.
  - Call another tool if needed (e.g., `fetchDocs` → `analyzeDocs`).
  - Combine multiple tool outputs before responding.
- **UI handling** – Because the chat client renders tool parts generically, you get a trace per tool call, even if several tools run in one message.

## Reusing Tool Data Further Downstream

Tool outputs can influence both the conversation and other services:

- **Assistant reply** – The LLM sees the output JSON and can weave it into human-readable text.
- **Client-side logic** – If certain tool types should trigger extra UI widgets (maps, tables), inspect the `UIMessage` stream for matching `tool-*` parts and render specialized components.
- **Server hooks** – `onStepFinish` callbacks let you log tool calls, persist outputs, or kick off background work before the message finishes streaming.
- **Multi-turn memory** – Because each tool call is appended to the conversation history, later prompts can refer back to earlier outputs (“Take the first random item you gave me and elaborate on it.”).

## Example Prompts & Expected Behavior

| Prompt | Expected Tool Behavior |
|--------|-----------------------|
| “Erzeuge fünf zufällige Ideen zum Thema Nachhaltigkeit.” | `randomList` called with `count=5`, `topic="Nachhaltigkeit"` |
| “Listen Sie drei neue Gedanken zum Produkt-Roadmap-Kapitel auf.” | Likely tool call to provide placeholder bullets |
| “Erkläre mir das Konzept von Hash Maps.” | No tool call (`Tools: keine`) because no contextual list needed |

Use these patterns when crafting prompts to exercise or avoid specific tools during demos and tests.

---

With this reference you can confidently extend the chat agent with richer tooling, guide the model’s decision-making, and keep the UI transparent for debugging and user trust. Let the AI SDK handle orchestration while you focus on the business logic each tool encapsulates. When in doubt, refer back to the `randomList` example as the baseline pattern for naming, documenting, and integrating future tools.
