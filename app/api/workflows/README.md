# Workflow Routes

| Route | Kind | UI Caller | Claimable | Returns |
|---|---|---|---|---|
| `generate` | queue | `components/wizard/CreationWizard.tsx` | yes | queue |
| `stories` | queue | NONE (API only) | yes | queue |
| `ai-videos` | queue | NONE (API only) | yes | queue |
| `auto` | queue | `create/auto` | yes | queue |
| `micro-drama` | queue | `create/drama` | yes | queue |
| `extract-shorts` | queue | `create/shorts` | yes | queue |
| `avatar` | queue | `create/avatar` | yes | queue |
| `whiteboard` | queue | `create/whiteboard` | yes | queue |
| `bulk-plan/push` | queue | `create/bulk` | yes | queue |
| `images` | terminal | NONE (API only) | no | terminal |
| `whiteboard/character-sheet` | plan-only | `create/whiteboard` | no | plan-only |
| `mission` | plan-only | `create/mission/[id]` | no | plan-only |
| `bulk-plan` | utility | `create/bulk` | no | utility |
| `scrape` | utility | `create/url` | no | utility |
