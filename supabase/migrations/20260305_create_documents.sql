-- Phase 5: Documents system (metadata + storage).

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimation_id uuid references public.estimations (id) on delete set null,
  title text not null,
  original_name text not null,
  bucket text not null default 'jitwise-documents',
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "documents_select_own"
  on public.documents
  for select
  using (auth.uid() = user_id);

create policy "documents_insert_own"
  on public.documents
  for insert
  with check (auth.uid() = user_id);

create policy "documents_update_own"
  on public.documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "documents_delete_own"
  on public.documents
  for delete
  using (auth.uid() = user_id);

-- Storage bucket (private) for documents.
insert into storage.buckets (id, name, public)
values ('jitwise-documents', 'jitwise-documents', false)
on conflict (id) do nothing;

-- Storage policies aligned with documents ownership.
create policy "documents_storage_select"
  on storage.objects
  for select
  using (
    bucket_id = 'jitwise-documents'
    and auth.uid() = owner
  );

create policy "documents_storage_insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'jitwise-documents'
    and auth.uid() = owner
  );

create policy "documents_storage_update"
  on storage.objects
  for update
  using (
    bucket_id = 'jitwise-documents'
    and auth.uid() = owner
  );

create policy "documents_storage_delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'jitwise-documents'
    and auth.uid() = owner
  );
