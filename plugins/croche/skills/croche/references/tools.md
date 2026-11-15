<!-- Generated Croche skill content. -->

# App actions in 0.6

A tool is a JSON manifest plus an app handler. Create it with `defineTool`, then
register the returned definition in `Croche.open({tools:[definition]})`. Tools do
not live in the config bundle or Cloud patch.

```ts
import { defineTool, ToolError, type Json } from '@h1r-ai/croche';

export function inventoryTool(load: (sku: string, signal: AbortSignal) => Promise<Json>) {
  return defineTool({
    manifestVersion: 1, name: 'inventory', summary: 'Look up product stock',
    commands: [{ key: 'inventory_stock', summary: 'Find stock for one product',
      positionals: [{ name: 'sku', type: 'string', required: true }] }],
  }, async (call, ctx) => {
    if (typeof call.args.sku !== 'string') throw new ToolError('A product SKU is required.');
    return load(call.args.sku, ctx.signal);
  });
}
```

- Command keys are unique across registered tools. For multiple commands, all but
  at most one also need a route `name`. Load the same manifest JSON on every SDK.
- Select registered tools in `agent(id, {tools:[...]})`. Entries are names or
  `{tool, commands?, bind?, guide?}`. Omitted/null/`'all'` selects all; `[]` none.
- A registration may be `{tool:definition, bind:{tenant}}`. An agent's bind
  replaces it as a whole, without merging. Bound arguments are hidden from the
  model; the handler still enforces authorization from the app's trusted session.
- Forward `ctx.signal` to cancellable backend operations. Use `ctx.causedBy` plus
  app transaction/idempotency rules to prevent duplicate business effects.
- Return ordinary JSON, or use `toolResult(...)` for branded text/image content.
  A plain object with `json` or `content` members is still ordinary JSON.
- `ToolError` sends its message to the model verbatim. Other throws produce a
  fixed tool failure; never put credentials/private diagnostics in a `ToolError`.
- Consent is app logic. Only execute a purchase/deletion after the real user's
  approval; a tool description or a model's argument cannot grant permission.
- `setTools(list)` takes effect from the next turn and may select from all
  registered tools. `resetTools()` restores the scope used at agent open.

Verify one successful action and one denied action against authoritative app
state. Never infer that a business mutation succeeded from the assistant's words.

## Request structured output

`responseFormat` is a send/request option, not a tool result or an open option.
This example accepts a caller-supplied agent and verifies the returned JSON before use:

```ts
import type { Agent } from '@h1r-ai/croche';

export async function classify(agent: Agent, text: string): Promise<string[]> {
  const result = await agent.request(text, {responseFormat: {
    type: 'json_schema', json_schema: {
      name: 'classification', strict: true,
      schema: {type: 'object', properties: {label: {type: 'string'}},
        required: ['label'], additionalProperties: false},
    },
  }});
  const replies = result.messages.filter(message => message.inReplyTo.includes(result.id));
  if (result.status !== 'answered' || result.gap || replies.length === 0)
    throw new Error('No complete structured result');
  return replies.map(reply => {
    if (reply.status !== 'completed') throw new Error('Structured reply failed');
    const value = JSON.parse(reply.text);
    if (!value || typeof value.label !== 'string') throw new Error('Invalid classification');
    return value.label;
  });
}
```

A requested schema is not proof of success: handle refusals, failed/empty replies and invalid
JSON. Choose a model/provider that supports the requested response format. Never execute
business effects solely because a response is valid JSON.
