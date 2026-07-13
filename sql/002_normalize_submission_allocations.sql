-- 002_normalize_submission_allocations.sql
-- Additive migration only.
-- - Creates normalized submission_allocations table
-- - Backfills non-zero legacy p1..p5 allocations
-- - Safe to rerun with ON CONFLICT
-- - Does not alter or drop legacy columns

begin;

create table if not exists submission_allocations (
  id bigserial primary key,
  submission_id text not null references submissions(submission_id) on delete cascade,
  prize_id text not null,
  tickets_allocated integer not null check (tickets_allocated > 0),
  created_at timestamptz not null default now(),
  constraint submission_allocations_submission_prize_unique
    unique (submission_id, prize_id)
);

create index if not exists submission_allocations_submission_id_idx
  on submission_allocations (submission_id);

create index if not exists submission_allocations_prize_id_idx
  on submission_allocations (prize_id);

insert into submission_allocations (submission_id, prize_id, tickets_allocated)
select s.submission_id, x.prize_id, x.tickets_allocated
from submissions s
cross join lateral (
  values
    ('p1', s.p1_tickets),
    ('p2', s.p2_tickets),
    ('p3', s.p3_tickets),
    ('p4', s.p4_tickets),
    ('p5', s.p5_tickets)
) as x(prize_id, tickets_allocated)
where x.tickets_allocated > 0
on conflict (submission_id, prize_id)
do update set tickets_allocated = excluded.tickets_allocated;

commit;

-- Verification queries to run manually after migration:
-- 1) Expected vs actual normalized allocation row count
-- select
--   (
--     select count(*)
--     from submissions s
--     cross join lateral (
--       values (s.p1_tickets), (s.p2_tickets), (s.p3_tickets), (s.p4_tickets), (s.p5_tickets)
--     ) as v(t)
--     where v.t > 0
--   ) as expected_nonzero_alloc_rows,
--   (
--     select count(*) from submission_allocations
--   ) as actual_normalized_alloc_rows;
--
-- 2) Per-submission parity check between legacy and normalized totals
-- select
--   s.submission_id,
--   (s.p1_tickets + s.p2_tickets + s.p3_tickets + s.p4_tickets + s.p5_tickets) as legacy_total,
--   coalesce(sum(sa.tickets_allocated), 0) as normalized_total
-- from submissions s
-- left join submission_allocations sa on sa.submission_id = s.submission_id
-- group by s.submission_id, legacy_total
-- having (s.p1_tickets + s.p2_tickets + s.p3_tickets + s.p4_tickets + s.p5_tickets) <> coalesce(sum(sa.tickets_allocated), 0);
--
-- 3) Quick sample
-- select * from submission_allocations order by id desc limit 25;
