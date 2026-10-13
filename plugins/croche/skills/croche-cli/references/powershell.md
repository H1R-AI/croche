<!-- Generated Croche skill content. -->

# PowerShell syntax (Windows verification pending)

Use when the user's terminal is PowerShell. These forms are guidance; do not report Windows
support or a successful Windows run without executing there.

Call plain `croche` in PowerShell. If PowerShell refuses it because running scripts is disabled
(npm's `croche.ps1`), the human runs **`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`**
once, as part of the login request; you never change the execution policy yourself. After you
install the CLI, the user runs **`croche login`** in their private terminal; you never run it or see their key. No
PowerShell environment assignment is needed for onboarding. Login remains pending verification.

Capture authentication output without displaying prefixes; report only a boolean:

```powershell
$raw = croche auth whoami --json 2>$null
$exit = $LASTEXITCODE
$authenticated = $false
try { $authenticated = ($exit -eq 0 -and ($raw | ConvertFrom-Json).ok -eq $true) }
catch { $authenticated = $false }
@{ authenticated = $authenticated } | ConvertTo-Json -Compress
```

Do not echo `$raw`. After the human says done, re-check now and continue to the first authorized
live turn in the same turn; do not stop on a stale missing-file result. For private key files,
check presence/length only, never prefixes/suffixes or masked substrings.

```powershell
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$result = croche projects list --json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Croche failed; inspect the redacted error code." }
# Inspect only necessary project fields, not secrets or unrelated account details.
$result.data.projects | Select-Object id, name
```

- Use `$LASTEXITCODE`, not just `$?`, for the native command's exit class.
- Windows PowerShell 5.1 has no `&&`; run a command then check `$LASTEXITCODE`.
- CLI text/JSON input files must be UTF-8. In Windows PowerShell 5.1, use
  `Set-Content -Path draft.json -Value $json -Encoding UTF8`; `>` / `Out-File` default to
  UTF-16 there and cause `unsupported_encoding`. Preserve the entire fetched draft when editing.
- Single quotes are literal; double quotes expand variables. Quote paths containing spaces.
- Prefer a supported file option over free-text command arguments containing embedded quotes
  or shell metacharacters. For local runtime commands with `--text-file`, write UTF-8 and pass
  the path; check that subcommand's help first. Do not invent a file option for another command.

Do not run POSIX inline assignments (`KEY=value command`), `export`, or Bash heredocs in
PowerShell. If the environment cannot run the command, prepare files and ask the user to run
the check; ask only for a redacted error code and exit status, never their environment dump.
