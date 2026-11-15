<!-- Generated Croche skill content. -->

# An older store was refused

Use only for `memory_store_too_old`. `Croche.open` can succeed while `croche.agent(id)` refuses
that agent's store; other agents can still open. The refused open does not change the data.

Tell the user plainly: **This agent's saved data cannot be opened by this SDK. Nothing was
changed. Resetting this agent permanently deletes its conversation, memories and stored
agent state for this user. Only an older build that still runs can export them first.**
Do not suggest that the current build can migrate or export a store it cannot open.

1. Identify the exact app user, agent ID and storage. Offer export with a still-working older
   build when available; never claim an export happened without checking it.
2. Get explicit consent for that scoped, permanent loss. Without consent, leave the store
   intact and report the version/error. Do not automatically reset inside an error handler.
3. For the **project API**, use the already-open Croche for the same user and storage.
   Delete through that open instance, then acquire a fresh agent:

```ts
await croche.deleteData({ agent: agentId });
const agent = await croche.agent(agentId);
```

Use `'default'` for the default agent. This removes that agent's conversation, memories,
message history and stored agent state for this user, not other agents. Drop app retry entries already
accepted by the deleted store; their old final status cannot arrive. Verify the intended empty
agent without deleting the whole project directory or another user's data.

Do not apply this recipe blindly to custom single-agent storage or an instance-specific case;
confirm the installed SDK's scoped deletion API first. A busy store must be closed, not forcibly
erased. Core closes in-scope agents of sibling handles; callers must reacquire them after deletion.

If `Croche.open` itself fails because the project record is corrupt/too new or storage is full,
recovery is a separate, whole-user operation. Obtain explicit consent for that broader loss first:

```ts
const recovery = await Croche.open(openOptions, { recover: 'delete' });
try {
  await recovery.deleteData();
} finally {
  await recovery.close();
}
```

Recovery supports only `deleteData()` / `deleteData({})` and `close()`. Agent scopes and all other
members reject `invalid_request`. It deletes this user's local namespace and background enrolment
without parsing the project record, registering tools or writing new metadata. It preserves the
installation record and other users; no Cloud data is deleted. Unreadable project records can retain
dangling instance entries. A corrupt backing-store identity refuses with `corrupt_store`.
A store locked by another process is retained with `store_busy`; other unlocked stores may already
be deleted, so close the holder and retry. Native SDKs use the same instance/recovery contract.
