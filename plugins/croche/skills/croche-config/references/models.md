<!-- Generated Croche skill content. -->

# Model selection and known-model tuning

## Which model

- **Default: `deepseek/deepseek-v4.1-flash`.** Cheap and fast; Croche's recommended default.
- **General alternative: `openai/gpt-6-luna`.**
- **For quality: `anthropic/claude-sonnet-5.5` or `anthropic/claude-opus-5.5`.**

Claude prompt caching applies only when the agent's model and all of its `fallbacks` are
`anthropic/*` models; do not mix another provider into a Claude agent's fallbacks.

If a turn fails with `provider_rejected` and the gateway refused the request (404), the model
ID is usually unknown or not allowed: check the ID against the list below.

## Temperature

Configure `temperature` in `project.defaults` or an agent's run settings in the schema-7
bundle. Core validates the value: finite 0–2, or null to omit the parameter. Do not put run
settings in a language entry. Keep structured-output and model capability constraints in mind;
verify the chosen model on the app's actual workload rather than assuming every parameter works.

The app chooses its model explicitly in `project.defaults.model`. There is no SDK default.
The IDs below are projected from the SDK's known-model tuning data, not an allowlist. Other
model IDs can be used; verify the exact identifier and capabilities with the selected service.
Do not infer input support from a different model's tuning row.

- `anthropic/claude-opus-5.5`
- `anthropic/claude-sonnet-5.5`
- `deepseek/deepseek-v4-flash-0731`
- `deepseek/deepseek-v4-pro-0813`
- `deepseek/deepseek-v4.1-flash`
- `google/gemini-3.1-pro-preview`
- `google/gemini-3.5-flash-lite`
- `google/gemini-3.8-flash`
- `google/gemma-4-31b-it`
- `moonshotai/kimi-k3`
- `openai/gpt-6-astra`
- `openai/gpt-6-luna`
- `openai/gpt-6.1-sol`
- `qwen/qwen3.7-flash`
- `x-ai/grok-4.7`
- `xiaomi/mimo-v2.6-flash`
- `z-ai/glm-5.3`
- `z-ai/glm-5.3-flash`

Match the tuning data to the SDK version you ship. For configuration and language behavior,
read [the config skill](../SKILL.md) or the online [Models page](https://docs.croche.ai/models.md).
The [documentation index](https://docs.croche.ai/llms.txt) lists every public Markdown page.
