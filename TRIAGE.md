# How issues are handled

During the closed beta and the hackathon, the Croche team watches this repository every working
day.

| Area | Who triages |
| --- | --- |
| SDK, plugin and docs (the skill, references, examples, release files) | rook, daily |
| Protocol and spec (what the Core sends, config semantics) | Keel |
| Everything else (Studio, Cloud, accounts, billing, roadmap) | Leo assigns |

- **First reply within one working day** on every outside issue: an answer, a request for what
  is missing, or a label saying where it went.
- **Labels:** the template sets `type:*`. Triage adds `area:sdk`, `area:plugin`, `area:docs`,
  `area:protocol` or `area:cloud`, and `status:needs-info`, `status:tracked` or
  `status:answered`.
- **Moving work inside the team:** when an issue needs work, Leo opens the internal tracking
  issue and links nothing back. The public issue gets `status:tracked` and a short public note
  of what will change; it is closed when the fix ships in a release, naming that release.
- **What never goes into a public issue:** internal links or issue numbers, logs from our
  systems, keys or tokens of any kind, other developers' data. If a reporter pastes a key, we
  delete that comment and ask them to rotate the key.
- **Security reports** never stay in issues: see [SECURITY.md](SECURITY.md).
