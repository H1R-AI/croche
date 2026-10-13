<!-- Generated Croche skill content. -->

# App actions

Use when implementing a tool, not for a text-only first turn. Put serializable declarations
in `config.tools` and executable handlers in `handlers`, indexed by the tool's name.

```ts
import type { ToolDeclaration, ToolHandler } from '@h1r-ai/croche';

const inventory: ToolDeclaration = {
  name: 'inventory',
  summary: 'The player inventory.',
  commands: [{
    key: 'inventory_list', name: 'list', reads: true,
    summary: 'List the items this player owns when asked about their inventory.',
  }],
};
// app.inventoryFor is your app function, not a Croche API.
const inventoryHandler: ToolHandler = async ({ key }, context) => {
  if (key !== 'inventory_list') return { status: 'rejected', reason: 'Unknown action.' };
  return { items: await app.inventoryFor(context.user) };
};
// In Croche.open: config: { instructions, tools: [inventory] },
//                handlers: { inventory: inventoryHandler }
```

- Use a globally unique command `key` (for example `inventory_list`). Group related commands;
  flags support `type`, `enum`, `required`, `minimum`, `maximum`, and `list`.
- Mark every read-only command `reads: true`. Its summary should explain when to use it.
- For mutations, say **when the user must request the action** in the command summary or
  `toolGuide`. Enforce authorization, allowed values and current app state in the handler;
  the description is not an access-control boundary.
- For a purchase, deletion or other action needing consent, use the app's confirmation UI.
  Return `{ status: 'waiting_for_approval' }` while waiting; only execute after real approval.
  Croche does not supply a `confirm` declaration field. Do not invent one.
- Return structured expected rejections (reason and next step). A thrown handler error ends
  the turn; do not report a successful change when nothing changed.
- Keep authoritative balances/inventory in the app. Pass bounded current app state as input
  `context`, and deduplicate business operations in app code; a new model request is not a
  guarantee that an earlier effect did not happen.
- Studio drafts must include **every tool the app uses**. Omitting a declaration removes the
  agent's access at the next open; a declaration without a registered handler is not delivered.

Verify one safe read/action and one denial against app state, not just the assistant's words.
