<!-- Generated Croche skill content. -->

# An older store was refused

Use only for `memory_store_too_old`. `Croche.open` can succeed while `croche.agent(id)` refuses
that agent's store; other agents can still open. The refused open does not change the data.

Tell the user plainly: **This agent's saved data cannot be opened by this SDK. Nothing was
changed. Resetting this agent permanently deletes its conversation, memories and saved
documents for this user. Only an older build that still runs can export them first.**
Do not suggest that the current build can migrate or export a store it cannot open.

1. Identify the exact app user, agent ID and storage. Offer export with a still-working older
   build when available; never claim an export happened without checking it.
2. Get explicit consent for that scoped, permanent loss. Without consent, leave the store
   intact and report the version/error. Do not automatically reset inside an error handler.
3. For the **project API**, close the project first, then use the same original open options:

```ts
await croche.close();
await Croche.deleteStore({ ...openOptions, agent: agentId });
const reopened = await Croche.open(openOptions);
const agent = await reopened.agent(agentId);
```

Use `'default'` for the default agent. This removes that agent's conversation, memories,
documents and message history for this user, not other agents. Drop app retry entries already
accepted by the deleted store; their old final status cannot arrive. Verify the intended empty
agent without deleting the whole project directory or another user's data.

Do not apply this recipe blindly to custom single-agent storage or an instance-specific case;
confirm the installed SDK's scoped deletion API first. A busy store must be closed, not forcibly
erased. Native 0.5.2 recovery requires its reviewed API; do not translate this snippet by guesswork.
