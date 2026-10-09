-- =====================================================================
--  نظام إدارة المهام القانونية — إعداد قاعدة البيانات (الإصدار 1)
--  انسخ هذا الملف كاملاً، والصقه في SQL Editor في Supabase، ثم اضغط Run.
--  تشغيله أكثر من مرة آمن ولا يحذف أي بيانات.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
--  الجداول
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null unique,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  client_name text not null check (char_length(btrim(client_name)) between 1 and 200),
  description text not null check (char_length(btrim(description)) between 1 and 5000),
  case_type text check (case_type is null or char_length(case_type) <= 100),
  assigned_to uuid not null references public.members (id),
  due_at timestamptz not null,
  notes text check (notes is null or char_length(notes) <= 5000),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to);
create index if not exists tasks_due_at_idx on public.tasks (due_at);

create table if not exists public.settings (
  id smallint primary key default 1 check (id = 1),
  office_name text check (office_name is null or char_length(office_name) <= 120),
  logo text check (logo is null or (char_length(logo) <= 400000 and logo like 'data:image/%')),
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
--  دوال داخلية (غير مكشوفة للواجهة)
-- ---------------------------------------------------------------------
create schema if not exists ltm_private;
revoke all on schema ltm_private from public;

create or replace function ltm_private.validate_member(p_name text, p_email text, p_password text)
returns void language plpgsql set search_path = '' as $$
begin
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then
    raise exception 'الاسم مطلوب' using errcode = 'P0001';
  end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'البريد الإلكتروني غير صحيح' using errcode = 'P0001';
  end if;
  if p_password is not null and char_length(p_password) < 8 then
    raise exception 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' using errcode = 'P0001';
  end if;
end $$;

create or replace function ltm_private.create_auth_user(p_email text, p_password text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users u where lower(u.email) = p_email) then
    raise exception 'هذا البريد مسجل مسبقاً' using errcode = 'P0001';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, now(), now(),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true, 'phone_verified', false),
    now(), now(), now()
  );

  return v_id;
end $$;

-- ---------------------------------------------------------------------
--  دوال الصلاحيات
-- ---------------------------------------------------------------------
create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.id = auth.uid() and m.active);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.id = auth.uid() and m.active and m.role = 'admin');
$$;

-- ---------------------------------------------------------------------
--  حماية المهام: الموظف يغيّر الحالة فقط، والتواريخ تُضبط تلقائياً
-- ---------------------------------------------------------------------
create or replace function ltm_private.tasks_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    new.completed_at := case when new.status = 'completed' then now() end;
    if not exists (select 1 from public.members m where m.id = new.assigned_to and m.active) then
      raise exception 'الموظف المكلف غير موجود أو حسابه معطل' using errcode = 'P0001';
    end if;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if not public.is_admin() and (
      new.client_name, new.description, new.case_type, new.assigned_to, new.due_at, new.notes
    ) is distinct from (
      old.client_name, old.description, old.case_type, old.assigned_to, old.due_at, old.notes
    ) then
      raise exception 'يُسمح للموظف بتغيير حالة المهمة فقط' using errcode = '42501';
    end if;
    if new.assigned_to is distinct from old.assigned_to
       and not exists (select 1 from public.members m where m.id = new.assigned_to and m.active) then
      raise exception 'الموظف المكلف غير موجود أو حسابه معطل' using errcode = 'P0001';
    end if;
    if new.status = 'completed' and old.status <> 'completed' then
      new.completed_at := now();
    elsif new.status <> 'completed' then
      new.completed_at := null;
    else
      new.completed_at := old.completed_at;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists tasks_before_write on public.tasks;
create trigger tasks_before_write before insert or update on public.tasks
  for each row execute function ltm_private.tasks_before_write();

create or replace function ltm_private.settings_before_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists settings_before_update on public.settings;
create trigger settings_before_update before update on public.settings
  for each row execute function ltm_private.settings_before_update();

-- ---------------------------------------------------------------------
--  سياسات الوصول (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.members enable row level security;
alter table public.tasks enable row level security;
alter table public.settings enable row level security;

drop policy if exists members_select on public.members;
create policy members_select on public.members for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_admin() or (assigned_to = auth.uid() and public.is_active_member()));

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.is_admin());

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_admin() or (assigned_to = auth.uid() and public.is_active_member()))
  with check (public.is_admin() or (assigned_to = auth.uid() and public.is_active_member()));

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.is_admin());

drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select to anon, authenticated
  using (true);

drop policy if exists settings_update on public.settings;
create policy settings_update on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- صلاحيات الجداول: لا شيء للزائر غير المسجل إلا اسم المكتب وشعاره
revoke all on public.members, public.tasks, public.settings from anon, authenticated;
grant select on public.members to authenticated;
grant select, delete on public.tasks to authenticated;
grant insert (client_name, description, case_type, assigned_to, due_at, notes, status) on public.tasks to authenticated;
grant update (client_name, description, case_type, assigned_to, due_at, notes, status) on public.tasks to authenticated;
grant select on public.settings to anon, authenticated;
grant update (office_name, logo) on public.settings to authenticated;

-- ---------------------------------------------------------------------
--  عمليات متاحة للواجهة
-- ---------------------------------------------------------------------
create or replace function public.system_status()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'version', 1,
    'has_admin', exists (select 1 from public.members m where m.role = 'admin')
  );
$$;

-- إنشاء حساب المدير الأول (يعمل مرة واحدة فقط)
create or replace function public.setup_first_admin(p_name text, p_email text, p_password text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('ltm.setup_first_admin'));
  if exists (select 1 from public.members m where m.role = 'admin') then
    raise exception 'تم إنشاء حساب المدير مسبقاً' using errcode = 'P0001';
  end if;
  perform ltm_private.validate_member(p_name, v_email, coalesce(p_password, ''));
  v_id := ltm_private.create_auth_user(v_email, p_password);
  insert into public.members (id, name, email, role, must_change_password)
  values (v_id, btrim(p_name), v_email, 'admin', false);
end $$;

create or replace function public.admin_create_member(p_name text, p_email text, p_password text, p_role text default 'employee')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'هذه العملية للمدير فقط' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'employee') then
    raise exception 'نوع الحساب غير صحيح' using errcode = 'P0001';
  end if;
  perform ltm_private.validate_member(p_name, v_email, coalesce(p_password, ''));
  v_id := ltm_private.create_auth_user(v_email, p_password);
  insert into public.members (id, name, email, role, must_change_password)
  values (v_id, btrim(p_name), v_email, p_role, true);
  return v_id;
end $$;

create or replace function public.admin_update_member(p_id uuid, p_name text, p_email text, p_role text, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
begin
  if not public.is_admin() then
    raise exception 'هذه العملية للمدير فقط' using errcode = '42501';
  end if;
  if not exists (select 1 from public.members m where m.id = p_id) then
    raise exception 'الحساب غير موجود' using errcode = 'P0001';
  end if;
  if p_role not in ('admin', 'employee') then
    raise exception 'نوع الحساب غير صحيح' using errcode = 'P0001';
  end if;
  if p_id = auth.uid() and (p_role <> 'admin' or not p_active) then
    raise exception 'لا يمكنك تعطيل حسابك أو إلغاء صلاحية المدير عن نفسك' using errcode = 'P0001';
  end if;
  perform ltm_private.validate_member(p_name, v_email, null);
  if exists (select 1 from auth.users u where lower(u.email) = v_email and u.id <> p_id) then
    raise exception 'هذا البريد مسجل مسبقاً' using errcode = 'P0001';
  end if;

  update public.members
     set name = btrim(p_name), email = v_email, role = p_role, active = p_active
   where id = p_id;

  update auth.users
     set email = v_email,
         banned_until = case when p_active then null else '2999-12-31 00:00:00+00'::timestamptz end,
         updated_at = now()
   where id = p_id;
  update auth.identities
     set identity_data = identity_data || jsonb_build_object('email', v_email), updated_at = now()
   where user_id = p_id and provider = 'email';

  if not p_active then
    delete from auth.sessions where user_id = p_id;
  end if;
end $$;

create or replace function public.admin_reset_password(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'هذه العملية للمدير فقط' using errcode = '42501';
  end if;
  if p_password is null or char_length(p_password) < 8 then
    raise exception 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' using errcode = 'P0001';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = p_id;
  if not found then
    raise exception 'الحساب غير موجود' using errcode = 'P0001';
  end if;
  if p_id <> auth.uid() then
    update public.members set must_change_password = true where id = p_id;
    delete from auth.sessions where user_id = p_id;
  end if;
end $$;

create or replace function public.admin_delete_member(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'هذه العملية للمدير فقط' using errcode = '42501';
  end if;
  if p_id = auth.uid() then
    raise exception 'لا يمكنك حذف حسابك' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.tasks t where t.assigned_to = p_id) then
    raise exception 'لا يمكن حذف موظف لديه مهام. انقل مهامه لموظف آخر أو عطّل حسابه بدلاً من ذلك' using errcode = 'P0001';
  end if;
  delete from auth.users where id = p_id;
end $$;

create or replace function public.change_my_password(p_current text, p_new text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول' using errcode = '42501';
  end if;
  select u.encrypted_password into v_hash from auth.users u where u.id = auth.uid();
  if v_hash is null or extensions.crypt(coalesce(p_current, ''), v_hash) <> v_hash then
    raise exception 'كلمة المرور الحالية غير صحيحة' using errcode = 'P0001';
  end if;
  if p_new is null or char_length(p_new) < 8 then
    raise exception 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' using errcode = 'P0001';
  end if;
  if p_new = p_current then
    raise exception 'اختر كلمة مرور مختلفة عن الحالية' using errcode = 'P0001';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_new, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = auth.uid();
  update public.members set must_change_password = false where id = auth.uid();
end $$;

-- صلاحيات تنفيذ الدوال
revoke all on function
  public.is_active_member(), public.is_admin(), public.system_status(),
  public.setup_first_admin(text, text, text),
  public.admin_create_member(text, text, text, text),
  public.admin_update_member(uuid, text, text, text, boolean),
  public.admin_reset_password(uuid, text),
  public.admin_delete_member(uuid),
  public.change_my_password(text, text)
from public, anon, authenticated;

grant execute on function public.system_status(), public.setup_first_admin(text, text, text) to anon, authenticated;
grant execute on function
  public.is_active_member(), public.is_admin(),
  public.admin_create_member(text, text, text, text),
  public.admin_update_member(uuid, text, text, text, boolean),
  public.admin_reset_password(uuid, text),
  public.admin_delete_member(uuid),
  public.change_my_password(text, text)
to authenticated;

revoke all on all functions in schema ltm_private from public, anon, authenticated;

notify pgrst, 'reload schema';

select 'تم إعداد قاعدة البيانات بنجاح ✅' as "النتيجة";
