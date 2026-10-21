# Spec: provider health / circuit breaker (g4f pattern)

Status: DRAFT — awaiting sign-off. No code written yet.
Date: 2026-09-29
Slug: provider-health-circuit
File: `.opencode/spec-provider-health-circuit.md`

---

## 1. Goal

Stop retrying providers that are known-dead. Today every `complete()` call and
every TTS beat re-attempts each provider from scratch, so a permanently failing
provider costs real wall-clock on every single call forever.

Port the `ProviderCircuitBreaker` pattern from
[g4f](https://github.com/xtekky/gpt4free) (`g4f/providers/retry_provider.py:147-181`)
into this codebase, backed by Supabase so the web app and the render worker
share one view.

**Decisions taken (user):**

| Decision | Choice |
|---|---|
| State store | **Supabase table**, shared across processes |
| Classification | **All failures equal, exactly g4f** — 3 strikes → 60 s cooldown |
| Scope now | **Shared module + `llm.ts` only.** `tts.ts` is wired in a follow-up session |

## 2. Research findings — measured 2026-09-29

### 2a. The project already *declares itself* health-aware — and never uses it

`lib/api-router.ts:4-6` header:

> "Provides automatic health-aware failover across all configured AI providers.
> Each provider is pinged with a lightweight health check before being selected."

It exports `checkProviderHealth()` (`:592`), `getBestProvider()` (`:686`),
`getAllProviderHealth()` (`:744`). But those are **active pings**, and only two
consumers exist: `app/api/settings/health/route.ts` and
`app/api/settings/keys/check/route.ts` — both settings-screen display endpoints.
`lib/engine/llm.ts:3` imports `PROVIDER_REGISTRY` and uses only
`id/name/baseUrl/models/category/isFree/defaultPriority`. **No routing code
reads health.**

So this is wiring, not invention: the health vocabulary exists, the consumer
does not.

### 2b. The cascade scaffold is already complete

`lib/engine/llm.ts` has: 3 tiers (`:274` gateway, `:310` direct keys, `:345`
keyless), per-tier timeouts (`GATEWAY_TIMEOUT_MS` 60 s, `PROVIDER_TIMEOUT_MS` 9 s),
a total `FALLBACK_BUDGET_MS` 30 s (`:306`), a 20 s chain cache
(`CHAIN_TTL_MS` / `:142`), and full per-attempt error aggregation into `errors[]`
(`:330-335`). **The only missing piece is the failure memory.**

The ordering score is static: `llm.ts:174`
`score: entry.priority * 1000 + provider.defaultPriority` — no health term.

### 2c. The measured waste

Probe of `complete()` with the gateway down (2026-09-29): **10 consecutive
`Direct provider attempt failed` warnings in 14.8 s** before falling through to
OpenRouter. ElevenLabs returns `402 Payment Required` and OpenAI `429 Too Many
Requests` — neither will self-heal, and both are re-tried on every call.

Render-worker log confirms the same shape for TTS: per beat, `elevenlabs 402`
then `omniroute 429`, then keyless. At 7 beats that is ~14 wasted round trips per
video.

### 2d. Zero existing breaker

`grep` for `cooldown|circuitBreak|circuit_break|consecutiveFailure` across `lib/`
→ **no matches.** Nothing to reuse; nothing to conflict with.

### 2e. Test-surface risk — measured, and benign

- **No unit test calls `complete()` or `parseJson`** from `lib/engine/llm`
  (verified across `test/**/*.test.ts`). Nothing existing breaks.
- `test/setup.ts:359` mocks `@/lib/db` wholesale, and `:273` stubs
  `rpc()` → `{ data: null, error: null }`.
- The e2e runner's `mockSupabase.records` is an explicit map (`render_jobs`,
  `settings` at `standalone-runner.js:13-15` and `:116-118`) — an unknown table
  will not throw, but will not resolve either.

⇒ **The module must fail open.** Any DB error, missing table, null row, or thrown
RPC must mean "provider is available". This is both the safe default and what
keeps the existing suite green without touching a single mock.

## 3. Non-goals

- **No `tts.ts` change in this session.** The module is built for it and the
  follow-up is specced in §10. Its providers are namespaced `tts:*` from day one
  so the follow-up is additive, not a schema change.
- **No status-aware classification.** The user chose g4f's uniform rule. §7 states
  the consequence honestly.
- **No change to the existing active health-ping API.** `checkProviderHealth` /
  `getBestProvider` / `getAllProviderHealth` and their two settings routes are
  untouched — they serve a different purpose (a human-readable health panel).
- **No change to the tier order, timeouts, budget, or chain cache.** This change
  only *adds* a skip decision.
- **No g4f dependency.** The pattern is reimplemented in this codebase's idiom.
- **No provider registry changes**, no new keys, no reordering of priorities.

## 4. Design

### 4a. Table + atomic RPCs — `supabase/migrations/20260929_provider_health.sql` (new)

Mirrors the project's existing `claim_render_job` pattern: logic in Postgres so
two processes cannot lose a concurrent increment.

```sql
create table if not exists provider_health (
  id                    text primary key,          -- '<domain>:<providerId>'
  consecutive_failures  integer not null default 0,
  cooldown_until        timestamptz,
  last_error            text,
  updated_at            timestamptz not null default now()
);

create or replace function record_provider_failure(p_id text, p_reason text)
returns void language plpgsql as $$
declare v_failures integer;
begin
  insert into provider_health as ph (id, consecutive_failures, last_error)
  values (p_id, 1, p_reason)
  on conflict (id) do update
    set consecutive_failures = ph.consecutive_failures + 1,
        last_error          = p_reason,
        updated_at          = now()
  returning consecutive_failures into v_failures;

  -- Exactly g4f: 3 strikes puts the provider in cooldown.
  if v_failures >= 3 then
    update provider_health
       set cooldown_until = now() + interval '60 seconds', updated_at = now()
     where id = p_id;
  end if;
end $$;

create or replace function record_provider_success(p_id text)
returns void language sql as $$
  insert into provider_health as ph (id, consecutive_failures, last_error)
  values (p_id, 0, null)
  on conflict (id) do update
    set consecutive_failures = 0, cooldown_until = null,
        last_error = null, updated_at = now();
$$;

create or replace function get_provider_health()
returns table (id text, consecutive_failures integer, cooldown_until timestamptz, last_error text)
language sql stable as $$
  select ph.id, ph.consecutive_failures, ph.cooldown_until, ph.last_error from provider_health ph;
$$;
```

Service-role only (deny-by-default RLS), consistent with how `render_jobs` is
written. Also added to `schema.sql` so the docker seed and the existing schema
drift assertion (see `standalone-runner.js:2425`) stay in step.

### 4b. Module — `lib/engine/provider-health.ts` (new)

```ts
export type HealthDomain = 'llm' | 'tts'
export function healthId(domain: HealthDomain, providerId: string): string

export async function loadHealth(): Promise<Map<string, ProviderHealth>>  // fail-open
export async function isProviderAvailable(domain, providerId): Promise<boolean>
export async function recordProviderFailure(domain, providerId, reason): Promise<void>
export async function recordProviderSuccess(domain, providerId): Promise<void>
export function resetProviderHealthCache(): void   // tests + manual flush
```

**g4f semantics, replicated exactly** (`retry_provider.py:147-181`):

| Rule | Value |
|---|---|
| Strikes to cooldown | 3 |
| Cooldown | 60 s |
| Success | clears both `consecutive_failures` and `cooldown_until` |
| **Cooldown expiry** | becomes available again **and `consecutive_failures` is set to 2** — so one further failure re-cools-down immediately |

That last row is g4f's deliberate relapse-fast behaviour (`:162`,
`cls._failures[provider_name] = cls.MAX_CONSECUTIVE_FAILURES - 1`). It is easy to
get wrong and it is a real behavioural property, so it is pinned by a test.

**`isProviderAvailable` is pure pass/fail and never throws** — DB problems
resolve to `true`.

### 4c. Bounding the read cost

`llm.ts:310-311` is a nested loop (providers × up to 3 models). A DB read per
iteration would be N×3 reads per call. Instead:

- `complete()` takes **one snapshot** via `loadHealth()` before entering Tier 2
  and passes it down; `isProviderAvailable` is served from that snapshot.
- Writes update an in-memory map **synchronously first**, so the current call
  sees its own failures immediately, then fire the RPC without awaiting it.

Result: **≤ 1 health read and ≤ 1 write per `complete()` call**, regardless of
provider count.

### 4d. `lib/engine/llm.ts` (modify)

- Tier 1 (gateway, `:275`): the gateway is `llm:omniroute`. A transport failure
  is recorded; a success is recorded. `ECONNREFUSED` already fails fast, so this
  mainly protects against a *hanging* gateway costing 60 s repeatedly.
- Tier 2 (`:310`): **skip** any provider where `isProviderAvailable` is false,
  pushing a reason onto `errors[]` (`"<name>: in cooldown until <ts>"`) so the
  aggregate error still explains itself. **This is the whole point** — a skipped
  provider must be *visible*, not silently absent.
- On success (`:323`): `recordProviderSuccess(target.id)`.
- On failure (`:326-335`): `recordProviderFailure(target.id, message)`.
- Tier 3 keyless (`:345`): same treatment, so a dead keyless endpoint is also
  skipped. **The keyless tier is the last resort and must never be skipped when
  it is the only option** — if every provider is in cooldown, the cascade still
  attempts the keyless endpoint (a skip is a demotion, never a total refusal).

## 5. Affected files

**New (4):**
- `supabase/migrations/20260929_provider_health.sql` — table + 3 RPCs
- `lib/engine/provider-health.ts` — the shared module
- `test/provider-health.test.ts` — vitest unit tests
- `tests/e2e/standalone-runner.js` — **modified**, `Tier 26`

**Modified (3):**
- `lib/engine/llm.ts` — the three call sites (§4d)
- `schema.sql` — add the table for the docker seed
- `tests/e2e/standalone-runner.js` — add `'Tier 26: Provider Health Circuit'` to
  **both** the `tiers` array and a `tests.push` block (per `AGENTS.md`, a tier
  name missing from the array silently never runs)

**Explicitly untouched:** `lib/engine/tts.ts` (follow-up), `lib/api-router.ts`
and its two settings routes, `lib/keys.ts`, `PROVIDER_REGISTRY`, every other
route and page, all three other open specs.

## 6. Acceptance criteria

### g4f semantics (vitest — the load-bearing tests)
- `T29-SEM-01` — a fresh provider is available; `consecutive_failures` 0.
- `T29-SEM-02` — failures 1 and 2 leave it **available**; the 3rd makes it
  **unavailable**.
- `T29-SEM-03` — a 3rd-failure cooldown lasts 60 s and is not shortened by
  `recordProviderSuccess` being called on *another* provider.
- `T29-SEM-04` — `recordProviderSuccess` clears both the counter and the cooldown.
- `T29-SEM-05` — **after expiry the provider is available again and
  `consecutive_failures === 2`**, so one more failure re-cools-down. (g4f's
  relapse-fast rule, `:162`.)
- `T29-SEM-06` — a `Retry-After` header, or any status-specific behaviour, is
  **absent** — uniform 60 s only, per the user's decision.

### Persistence + fail-open (vitest)
- `T29-PSH-01` — failure state survives a cache reset (a fresh module instance
  with a cold cache still reports the provider unavailable), proving the table is
  the source of truth rather than memory.
- `T29-PSH-02` — concurrent `recordProviderFailure` calls do not lose an
  increment (exercises the atomic `on conflict … + 1`).
- `T29-FOP-01` — a rejected query, a missing table, or a null row all resolve to
  **available**, never to a throw.
- `T29-FOP-02` — the module imports and works against `test/setup.ts`'s existing
  `@/lib/db` mock with **no mock changes** (proves the fail-open requirement
  against the real suite).
- `T29-FOP-03` — `tts:*` and `llm:*` ids never collide.

### `llm.ts` wiring (vitest with fetch mocked)
- `T29-WIR-01` — a provider in cooldown is **skipped with zero `fetch` calls** to
  its URL.
- `T29-WIR-02` — a skipped provider still appears in the thrown aggregate error.
- `T29-WIR-03` — a successful attempt calls `recordProviderSuccess` for that
  provider.
- `T29-WIR-04` — a failed attempt calls `recordProviderFailure` with the error
  message.
- `T29-WIR-05` — **when every direct provider is in cooldown, the keyless tier is
  still attempted.** A demotion is never a total refusal.
- `T29-WIR-06` — `complete()` performs **at most one** health read per call
  (counts RPC invocations) even when the provider chain is long.
- `T29-WIR-07` — `clearDirectLLMChainCache()` and `resetProviderHealthCache()`
  both exist and are exported (the chain cache and health cache are independent).

### Drift guards (`Tier 26`, source + schema)
- `T29-MIG-01` — the migration contains `CREATE TABLE provider_health` and all
  three function names.
- `T29-MIG-02` — `schema.sql` contains `CREATE TABLE provider_health`, matching
  the existing assertion style at `standalone-runner.js:2425`.
- `T29-MIG-03` — the RPC increments rather than overwrites
  (`consecutive_failures = ph.consecutive_failures + 1` must appear in the SQL),
  so the guard fails if someone "simplifies" it into a lost-update bug.
- `T29-MIG-04` — `'Tier 26: Provider Health Circuit'` is present in **both** the
  `tiers` array and a `tests.push` block.

### Measured outcome (the point of the whole change)
- `T29-GAUGE-01` — with the gateway down and the same provider set as the
  2026-09-29 probe, the second `complete()` call attempts **strictly fewer**
  providers and completes in **strictly less** wall-clock than the first.
- `T29-GAUGE-02` — a 3-consecutive-`402` provider is not re-attempted within the
  cooldown window (observed in `logs/app.log`).

### No regression
- `T29-NOR-01` — `pnpm exec vitest run --no-file-parallelism` green **without any
  change to `test/setup.ts`**.
- `T29-NOR-02` — `pnpm test` (201 e2e) green.
- `T29-NOR-03` — `pnpm lint:scoped` + `pnpm typecheck` clean, or proven
  pre-existing by a baseline run on the clean tree first.
- `T29-NOR-04` — the migration is applied to the live Supabase project and
  `record_provider_failure` / `get_provider_health` respond.

## 7. Risks

| Risk | Sev | Mitigation |
|---|---|---|
| **Uniform 60 s cooldown means an ElevenLabs `402` is still retried every 60 s forever.** This is the user's explicit choice (g4f parity), and it is the known cost. | Med | Stated, not hidden. §10 notes status-aware classification as the first follow-up. A `402` costs one 9 s-bounded attempt per minute instead of one per call — a real improvement, not a fix. |
| **A blanket skip could starve the cascade** if every provider is in cooldown | High | `T29-WIR-05` pins that the keyless tier is never skipped, and a demotion is never a total refusal. A skipped provider is recorded in `errors[]` (`T29-WIR-02`) so it can never be invisible. |
| **Stale health after a provider recovers** — a fixed 60 s of unnecessary skipping | Low | By design. Bounded and small; `recordProviderSuccess` clears immediately for the provider that answers. |
| **Cross-process lost update** if the increment were a read-modify-write | Med | The increment lives in Postgres (`on conflict … + 1`), pinned by `T29-MIG-03` and `T29-PSH-02`. |
| **Per-call health read adds latency to `complete()`** | Med | One snapshot per call, not per iteration (`T29-WIR-06`). Negligible against the 30 s fallback budget it protects. |
| **New table must be applied to the live project** or every call silently fails open — correct but *invisible* | Med | `T29-NOR-04` requires applying the migration and calling the RPCs. Fail-open is the right default but means a missing migration is invisible; the `T29-MIG-*` source guards plus `T29-NOR-04` cover it. |
| **`test/setup.ts` mocks `@/lib/db`** — a non-fail-open implementation would break the suite | Med | `T29-FOP-02` requires it to work against the existing mock untouched. |
| **Adding a table to `schema.sql` may drift from the migration** | Low | `T29-MIG-02` asserts both contain it. |
| **Pre-existing red** in `app/api/settings/keys/route.ts` (`logger` undefined) | Low | Baseline the command on the clean tree first; report both runs. Never claim a green that was not green before. |
| **vitest flakes at full-suite scale** | Low | `--no-file-parallelism`; a single failing full run is not a signal — re-run the file alone, then the suite twice. |

## 8. Implementation order (next session, after sign-off)

1. Baseline `pnpm lint:scoped` + `pnpm typecheck` on the clean tree; record the
   pre-existing result so §6 can distinguish mine from the repo's.
2. Failing tests for §6 (red) — `test/provider-health.test.ts` + `'Tier 26'`.
3. `supabase/migrations/20260929_provider_health.sql` + `schema.sql`;
   `T29-MIG-*` green.
4. `lib/engine/provider-health.ts`; `T29-SEM-*`, `T29-PSH-*`, `T29-FOP-*` green.
5. `lib/engine/llm.ts` wiring; `T29-WIR-*` green.
6. Refactor.
7. `pnpm lint:scoped` → `pnpm typecheck` → `pnpm exec vitest run --no-file-parallelism` → `pnpm test`.
8. Apply the migration to the live project; `T29-NOR-04`.
9. `T29-GAUGE-*` — re-run the gateway-down probe and show the before/after
   numbers side by side.
10. Update this spec with the final state.

## 9. Follow-ups deliberately left out

1. **Wire `tts.ts`** (the agreed next session). The module already namespaces
   `tts:*`; the change is three call sites in `TTSEngine.synthesize`
   (`tts.ts:781-787` provider loop). This is where the larger per-beat win is.
2. **Status-aware classification** — long cooldown for `401/402/403`, honour
   `Retry-After` on `429`, per-model skip on `404`. This is the change that would
   fully solve the ElevenLabs `402`, and it is strictly better than g4f.
3. **Surface health in the settings UI** — `getAllProviderHealth()` currently
   pings; it could additionally show the passive failure counters and cooldown
   expiry, so a dead provider is visible instead of inferred from logs.
4. **The three other open specs** — `scrape-mixkit-workflows`,
   `workflow-route-isolation`, `render-worker-media-sourcing`. The last one's
   `T28-E2E-01` makes the gateway a precondition, and this spec makes that
   gateway's *failure* cheap. They compose; none of them blocks this one.
