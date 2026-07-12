create table if not exists submissions (
  id bigserial primary key,

  submission_id text not null unique,

  event_id text not null default 'raffle-royale-2026',
  participant_id text not null,

  participant_name text not null,
  first_name text not null,
  last_initial text not null,

  mode text not null check (mode in ('pilot', 'live')),

  total_tickets integer not null check (total_tickets = 20),

  p1_tickets integer not null default 0 check (p1_tickets >= 0),
  p2_tickets integer not null default 0 check (p2_tickets >= 0),
  p3_tickets integer not null default 0 check (p3_tickets >= 0),
  p4_tickets integer not null default 0 check (p4_tickets >= 0),
  p5_tickets integer not null default 0 check (p5_tickets >= 0),

  submitted_at timestamptz not null default now(),
  submitted_at_client timestamptz null,
  created_at timestamptz not null default now(),

  constraint submissions_allocations_sum_check
    check ((p1_tickets + p2_tickets + p3_tickets + p4_tickets + p5_tickets) = 20),

  constraint submissions_total_matches_allocations_check
    check (total_tickets = (p1_tickets + p2_tickets + p3_tickets + p4_tickets + p5_tickets)),

  constraint submissions_event_participant_unique
    unique (event_id, participant_id)
);

create index if not exists submissions_submitted_at_idx
  on submissions (submitted_at desc);
