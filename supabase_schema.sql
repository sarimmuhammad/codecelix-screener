-- Run this in your Supabase SQL Editor
-- Table: applications

create table if not exists applications (
  id            uuid primary key,
  submitted_at  timestamptz not null,
  name          text not null,
  email         text,
  whatsapp      text,
  city          text,
  role          text,
  github        text,

  -- AI Report
  score         integer,
  grade         text,
  verdict       text,        -- 'Hire' | 'Maybe' | 'Reject'
  strengths     text[],
  concerns      text[],
  summary       text,
  recommended_next_step text,

  -- Full data
  transcript    text,        -- readable Q&A text
  full_report   jsonb,       -- raw JSON from Claude

  created_at    timestamptz default now()
);

-- Index for fast dashboard queries
create index if not exists idx_applications_role     on applications(role);
create index if not exists idx_applications_verdict  on applications(verdict);
create index if not exists idx_applications_score    on applications(score desc);
create index if not exists idx_applications_submitted on applications(submitted_at desc);

-- Enable Row Level Security (optional but recommended)
alter table applications enable row level security;

-- Allow service role full access (backend uses service key)
create policy "Service role full access"
  on applications
  using (true)
  with check (true);
