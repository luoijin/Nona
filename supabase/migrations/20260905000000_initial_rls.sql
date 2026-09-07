-- Supabase is the hosted PostgreSQL option. Prisma owns table shape;
-- this migration enables the row-level boundary for direct Supabase access.
alter table if exists "User" enable row level security;
alter table if exists "UserSettings" enable row level security;
alter table if exists "Transaction" enable row level security;

drop policy if exists "users can read their profile" on "User";
create policy "users can read their profile" on "User"
  for select using (id = auth.uid());

drop policy if exists "users can update their profile" on "User";
create policy "users can update their profile" on "User"
  for update using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "users can access their settings" on "UserSettings";
create policy "users can access their settings" on "UserSettings"
  for all using ("userId" = auth.uid())
  with check ("userId" = auth.uid());

drop policy if exists "users can access their transactions" on "Transaction";
create policy "users can access their transactions" on "Transaction"
  for all using ("userId" = auth.uid())
  with check ("userId" = auth.uid());
