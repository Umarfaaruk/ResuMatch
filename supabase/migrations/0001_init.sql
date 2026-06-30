-- ============================================================================
-- ResuMatch — initial schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query),
-- or via the Supabase CLI: `supabase db push`.
--
-- Includes: enums, tables, RLS (owner-only writes; jobs public read),
-- profile auto-create trigger, private "resumes" storage bucket + policies,
-- and 18 seed jobs.
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────────--
do $$
begin
  if not exists (select 1 from pg_type where typname = 'experience_level') then
    create type public.experience_level as enum ('fresher', 'junior', 'mid');
  end if;
  if not exists (select 1 from pg_type where typname = 'application_status') then
    create type public.application_status as enum ('saved', 'applied', 'interview', 'rejected');
  end if;
end$$;

-- ── profiles ─────────────────────────────────────────────────────────────--
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  target_role text,
  location    text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles: select own" on public.profiles;
create policy "Profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Profiles: insert own" on public.profiles;
create policy "Profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ── resumes ──────────────────────────────────────────────────────────────--
create table if not exists public.resumes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  original_file_path text not null,
  parsed_json        jsonb,
  ats_text           text,
  is_active          boolean not null default false,
  created_at         timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on public.resumes(user_id);
create index if not exists resumes_active_idx on public.resumes(user_id) where is_active;

alter table public.resumes enable row level security;

drop policy if exists "Resumes: owner all" on public.resumes;
create policy "Resumes: owner all"
  on public.resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── jobs (public read) ───────────────────────────────────────────────────--
create table if not exists public.jobs (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  company          text not null,
  location         text not null,
  description      text not null,
  required_skills  text[] not null default '{}',
  role_title       text not null,
  experience_level public.experience_level not null default 'fresher',
  source_url       text,
  posted_date      date not null default current_date
);

create index if not exists jobs_posted_date_idx on public.jobs(posted_date desc);

alter table public.jobs enable row level security;

-- Anyone (anonymous or authenticated) can read jobs.
drop policy if exists "Jobs: public read" on public.jobs;
create policy "Jobs: public read"
  on public.jobs for select
  using (true);

-- ── applications ─────────────────────────────────────────────────────────--
create table if not exists public.applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  job_id       uuid not null references public.jobs(id) on delete cascade,
  status       public.application_status not null default 'saved',
  applied_date timestamptz,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists applications_user_id_idx on public.applications(user_id);

alter table public.applications enable row level security;

drop policy if exists "Applications: owner all" on public.applications;
create policy "Applications: owner all"
  on public.applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Profile auto-create trigger ────────────────────────────────────────────
-- Creates a profiles row whenever a new auth user signs up. SECURITY DEFINER
-- so it bypasses RLS during the trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Storage: private "resumes" bucket ──────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- Files are stored under a per-user folder: "<auth.uid()>/<filename>".
-- The first path segment must equal the requesting user's id.
drop policy if exists "Resumes bucket: read own" on storage.objects;
create policy "Resumes bucket: read own"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Resumes bucket: insert own" on storage.objects;
create policy "Resumes bucket: insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Resumes bucket: update own" on storage.objects;
create policy "Resumes bucket: update own"
  on storage.objects for update
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Resumes bucket: delete own" on storage.objects;
create policy "Resumes bucket: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Seed: 18 sample jobs (idempotent — only inserts when jobs table is empty)
-- ============================================================================
insert into public.jobs (title, company, location, description, required_skills, role_title, experience_level, source_url, posted_date)
select * from (values
  ('AI/ML Intern', 'Freshworks', 'Hyderabad, India',
   'Work alongside our applied-ML team on model evaluation, data pipelines, and prototyping LLM features. Great for final-year students passionate about machine learning.',
   array['python','machine learning','pytorch','pandas','numpy','sql'], 'Machine Learning Intern', 'fresher'::public.experience_level, 'https://www.freshworks.com/company/careers/', current_date - 2),

  ('Machine Learning Trainee', 'Innovaccer', 'Hyderabad, India',
   'Join our healthcare-AI trainee program. You will build and ship ML models on real clinical data under mentorship. Strong Python and stats fundamentals required.',
   array['python','scikit-learn','machine learning','statistics','sql','pandas'], 'Machine Learning Engineer', 'fresher'::public.experience_level, 'https://innovaccer.com/careers', current_date - 5),

  ('Data Science Intern', 'Swiggy', 'Bangalore, India',
   'Support demand-forecasting and recommendation experiments. Build dashboards, run A/B analyses, and present insights to product teams.',
   array['python','sql','pandas','statistics','data visualization','machine learning'], 'Data Scientist', 'fresher'::public.experience_level, 'https://careers.swiggy.com/', current_date - 1),

  ('Full Stack Developer (Fresher)', 'Razorpay', 'Bangalore, India',
   'Build payment dashboards end to end with React and Node.js. You will own features across the stack and ship to millions of merchants.',
   array['javascript','react','node.js','postgresql','rest api','git'], 'Full Stack Developer', 'fresher'::public.experience_level, 'https://razorpay.com/jobs/', current_date - 3),

  ('Junior Full Stack Engineer', 'Postman', 'Bangalore, India',
   'Develop features across our API platform using TypeScript, React, and Node services. Comfortable with both frontend and backend work.',
   array['typescript','react','node.js','mongodb','rest api','docker'], 'Full Stack Developer', 'junior'::public.experience_level, 'https://www.postman.com/company/careers/', current_date - 7),

  ('Frontend Developer Intern', 'CRED', 'Bangalore, India',
   'Craft delightful, pixel-perfect UI with React and modern CSS. Collaborate closely with design to ship polished member experiences.',
   array['javascript','react','html','css','tailwind','typescript'], 'Frontend Developer', 'fresher'::public.experience_level, 'https://careers.cred.club/', current_date - 4),

  ('Frontend Engineer (Junior)', 'Meesho', 'Bangalore, India',
   'Own customer-facing web flows with React and Next.js. Optimize for performance and accessibility across low-end devices.',
   array['javascript','react','next.js','css','typescript','redux'], 'Frontend Developer', 'junior'::public.experience_level, 'https://www.meesho.io/jobs', current_date - 6),

  ('Data Analyst', 'PhonePe', 'Bangalore, India',
   'Turn transaction data into product insight. Write SQL, build dashboards, and partner with business teams on metrics and experiments.',
   array['sql','excel','python','data visualization','tableau','statistics'], 'Data Analyst', 'fresher'::public.experience_level, 'https://www.phonepe.com/careers/', current_date - 2),

  ('Junior Data Analyst', 'Darwinbox', 'Hyderabad, India',
   'Analyze HR-tech product usage, build Power BI reports, and support data-driven decisions across teams.',
   array['sql','power bi','excel','python','data visualization'], 'Data Analyst', 'junior'::public.experience_level, 'https://darwinbox.com/careers', current_date - 8),

  ('Backend Developer (Node.js)', 'Hasura', 'Remote, India',
   'Build scalable GraphQL and REST services in Node.js and TypeScript. Work on APIs powering developer tooling used worldwide.',
   array['node.js','typescript','graphql','postgresql','docker','rest api'], 'Backend Developer', 'junior'::public.experience_level, 'https://hasura.io/careers/', current_date - 3),

  ('Backend Engineer Intern', 'Sprinklr', 'Bangalore, India',
   'Develop microservices and data pipelines in Node.js. Learn distributed systems while shipping to a large-scale CXM platform.',
   array['node.js','javascript','mongodb','rest api','redis','git'], 'Backend Developer', 'fresher'::public.experience_level, 'https://www.sprinklr.com/careers/', current_date - 9),

  ('AI Engineer Intern (LLM)', 'Skyflow', 'Remote, India',
   'Prototype LLM-powered features, build retrieval pipelines, and evaluate prompt strategies. Python and curiosity about GenAI required.',
   array['python','llm','prompt engineering','langchain','vector database','rest api'], 'AI Engineer', 'fresher'::public.experience_level, 'https://www.skyflow.com/company/careers', current_date - 1),

  ('Full Stack Trainee', 'HighRadius', 'Hyderabad, India',
   'Structured training program building fintech web apps with React and Java/Node back ends. Hiring freshers with strong CS fundamentals.',
   array['javascript','react','node.js','sql','data structures','git'], 'Full Stack Developer', 'fresher'::public.experience_level, 'https://www.highradius.com/careers/', current_date - 5),

  ('Data Engineering Intern', 'ThoughtSpot', 'Bangalore, India',
   'Help build ETL pipelines and data models. Work with SQL, Python, and cloud data warehouses to power analytics products.',
   array['python','sql','etl','data structures','airflow','aws'], 'Data Engineer', 'fresher'::public.experience_level, 'https://www.thoughtspot.com/careers', current_date - 4),

  ('Junior Backend Developer (Node.js)', 'Chargebee', 'Remote, India',
   'Build and maintain billing microservices in Node.js. Write clean, tested code and collaborate on API design.',
   array['node.js','typescript','postgresql','rest api','jest','docker'], 'Backend Developer', 'junior'::public.experience_level, 'https://www.chargebee.com/careers/', current_date - 10),

  ('ML Trainee (Computer Vision)', 'DeepIntent', 'Hyderabad, India',
   'Train and evaluate computer-vision models. Strong Python, NumPy, and a grasp of deep-learning basics expected.',
   array['python','pytorch','computer vision','numpy','machine learning','opencv'], 'Machine Learning Engineer', 'fresher'::public.experience_level, 'https://deepintent.com/careers', current_date - 6),

  ('Associate Software Engineer (Frontend)', 'Gainsight', 'Hyderabad, India',
   'Build customer-success product UI with React and TypeScript. Ship features, fix bugs, and grow into a frontend specialist.',
   array['javascript','react','typescript','css','redux','rest api'], 'Frontend Developer', 'fresher'::public.experience_level, 'https://www.gainsight.com/company/careers/', current_date - 7),

  ('Full Stack Developer Intern', 'Zoho', 'Remote, India',
   'Work across the stack on business SaaS apps — JavaScript front ends and Java/Node services. Open to freshers eager to learn.',
   array['javascript','react','node.js','mysql','html','css'], 'Full Stack Developer', 'fresher'::public.experience_level, 'https://www.zoho.com/careers/', current_date - 2)
) as seed(title, company, location, description, required_skills, role_title, experience_level, source_url, posted_date)
where not exists (select 1 from public.jobs);
