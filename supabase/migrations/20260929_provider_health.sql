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
