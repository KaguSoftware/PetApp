-- Behavioural security probes. Read-only in effect: wrap in begin/rollback.
-- Dry run before applying migrations:
--   (echo begin; cat supabase/migrations/0050_*.sql ... 0057_*.sql; cat supabase/tests/security_probes.sql; echo rollback;) > /tmp/b.sql
--   npx supabase db query --linked -f /tmp/b.sql
-- After applying: (echo begin; cat supabase/tests/security_probes.sql; echo rollback;)
-- Every row must read "blocked ..." or "ok"; anything with "!!" is a failure.

-- ===== behavioural probes (run after migrations, inside the same rolled-back txn) =====
create temp table probe (n serial, name text, outcome text);
grant all on probe to authenticated, anon;
grant usage, select on sequence probe_n_seq to authenticated, anon;

create temp table fx as
select hm.user_id as uid, hm.household_id as hid,
       (select h2.id from households h2 where h2.id <> hm.household_id limit 1) as other_hid
from household_members hm
where hm.role = 'owner'
order by (select count(*) from household_members x where x.household_id = hm.household_id) desc
limit 1;
grant select on fx to authenticated, anon;
insert into pets (household_id, name, species, breed, emoji, gradient_from, gradient_to)
  select other_hid, 'ForeignPet', 'dog', '', 'x', '#000', '#000' from fx;
create temp table fx2 as select p.id as foreign_pet from pets p, fx where p.household_id = fx.other_hid and p.name = 'ForeignPet' limit 1;
grant select on fx2 to authenticated, anon;

select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true) from fx;
set local role authenticated;

do $$ begin update households set premium = true where id = (select hid from fx);
  insert into probe(name,outcome) values ('premium self-grant', case when found then 'ALLOWED!!' else 'no rows' end);
exception when others then insert into probe(name,outcome) values ('premium self-grant', 'blocked '||sqlstate); end $$;

do $$ begin update households set coins = 99999 where id = (select hid from fx);
  insert into probe(name,outcome) values ('coins self-grant', case when found then 'ALLOWED!!' else 'no rows' end);
exception when others then insert into probe(name,outcome) values ('coins self-grant', 'blocked '||sqlstate); end $$;

do $$ begin update households set units = 'lb', timezone = 'Europe/Istanbul' where id = (select hid from fx);
  insert into probe(name,outcome) values ('set units+timezone (should work)', case when found then 'ok' else 'NO ROWS!!' end);
exception when others then insert into probe(name,outcome) values ('set units+timezone (should work)', 'FAILED!! '||sqlstate||' '||sqlerrm); end $$;

do $$ begin delete from households where id = (select hid from fx);
  insert into probe(name,outcome) values ('direct household delete', case when found then 'ALLOWED!!' else 'no rows' end);
exception when others then insert into probe(name,outcome) values ('direct household delete', 'blocked '||sqlstate); end $$;

do $$ begin execute 'select public.join_household($1)' using (select other_hid from fx);
  insert into probe(name,outcome) values ('join_household', 'ALLOWED!!');
exception when others then insert into probe(name,outcome) values ('join_household', 'blocked '||sqlstate); end $$;

do $$ begin insert into household_members (household_id, user_id, role) select other_hid, uid, 'member' from fx;
  insert into probe(name,outcome) values ('self-insert membership elsewhere', 'ALLOWED!!');
exception when others then insert into probe(name,outcome) values ('self-insert membership elsewhere', 'blocked '||sqlstate); end $$;

do $$ begin update household_members set member_id = null where user_id = (select uid from fx);
  insert into probe(name,outcome) values ('change own member_id', case when found then 'ALLOWED!!' else 'no rows' end);
exception when others then insert into probe(name,outcome) values ('change own member_id', 'blocked '||sqlstate); end $$;

do $$ declare pid uuid; begin
  insert into pets (household_id, name, species) select hid, 'Bun', 'rabbit' from fx returning id into pid;
  insert into probe(name,outcome) values ('add rabbit, no emoji/gradient (should work)', 'ok');
  insert into activities (household_id, pet_id, member_id, type, ts)
    select hid, pid, null, 'fed', (extract(epoch from now())*1000)::bigint from fx;
  insert into probe(name,outcome) values ('log with member_id null (should work)',
    (select case when a.member_id is not null and a.user_id = (select uid from fx) then 'ok (stamped)' else 'NOT STAMPED!!' end
     from activities a where a.pet_id = pid limit 1));
exception when others then insert into probe(name,outcome) values ('add pet / log (should work)', 'FAILED!! '||sqlstate||' '||sqlerrm); end $$;

do $$ begin
  insert into activities (household_id, pet_id, type, ts)
    select hid, (select foreign_pet from fx2), 'fed', (extract(epoch from now())*1000)::bigint from fx;
  insert into probe(name,outcome) values ('log for a pet in another household', 'ALLOWED!!');
exception when others then insert into probe(name,outcome) values ('log for a pet in another household', 'blocked '||sqlstate); end $$;

do $$ begin
  insert into activities (household_id, pet_id, type, ts)
    select hid, (select id from pets where name = 'Bun' and household_id = fx.hid), 'fed', (extract(epoch from now())*1000)::bigint + 86400000 from fx;
  insert into probe(name,outcome) values ('log 1 day in the future', 'ALLOWED!!');
exception when others then insert into probe(name,outcome) values ('log 1 day in the future', 'blocked '||sqlstate); end $$;

do $$ begin
  update activities set pet_id = (select foreign_pet from fx2) where pet_id = (select id from pets where name = 'Bun' and household_id = (select hid from fx));
  insert into probe(name,outcome) values ('move a log to another pet', case when found then 'ALLOWED!!' else 'no rows' end);
exception when others then insert into probe(name,outcome) values ('move a log to another pet', 'blocked '||sqlstate); end $$;

do $$ begin
  update activities set note = 'edited' where pet_id = (select id from pets where name = 'Bun' and household_id = (select hid from fx));
  insert into probe(name,outcome) values ('edit a log note (should work)', case when found then 'ok' else 'NO ROWS!!' end);
exception when others then insert into probe(name,outcome) values ('edit a log note (should work)', 'FAILED!! '||sqlstate||' '||sqlerrm); end $$;

insert into probe(name,outcome)
  select 'streak after logging today', 'streak='||coalesce(streak::text,'null')||' day='||coalesce(streak_day::text,'null')||' tz='||coalesce(timezone,'null')
  from households where id = (select hid from fx);

do $$ declare nid uuid; begin
  insert into pet_notes (household_id, pet_id, ts, kind, body)
    select hid, (select id from pets where name = 'Bun' and household_id = fx.hid), (extract(epoch from now())*1000)::bigint, 'symptom', 'sneezing' from fx
    returning id into nid;
  insert into probe(name,outcome) values ('add symptom note (should work)', 'ok');
  begin
    update pet_notes set user_id = null where id = nid;
    insert into probe(name,outcome) values ('re-attribute a note', case when found then 'ALLOWED!!' else 'no rows' end);
  exception when others then insert into probe(name,outcome) values ('re-attribute a note', 'blocked '||sqlstate); end;
  update pet_notes set body = 'sneezing a lot' where id = nid;
  insert into probe(name,outcome) values ('edit note text (should work)', 'ok');
exception when others then insert into probe(name,outcome) values ('notes (should work)', 'FAILED!! '||sqlstate||' '||sqlerrm); end $$;

do $$ begin perform 1 from forum_posts limit 1;
  insert into probe(name,outcome) values ('read retired forum_posts', 'ALLOWED!!');
exception when others then insert into probe(name,outcome) values ('read retired forum_posts', 'blocked '||sqlstate); end $$;

do $$ declare r jsonb; i int; last text; begin
  for i in 1..11 loop r := public.redeem_invite('ZZZZ-ZZZ' || i::text); last := r->>'reason'; end loop;
  insert into probe(name,outcome) values ('11th wrong invite code', coalesce(last, 'null'));
exception when others then insert into probe(name,outcome) values ('11th wrong invite code', 'error '||sqlstate||' '||sqlerrm); end $$;

do $$ declare inv household_invites; begin
  select * into inv from public.create_invite((select hid from fx));
  insert into probe(name,outcome) values ('owner creates invite (should work)', case when inv.code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}$' then 'ok' else 'BAD CODE!!' end);
exception when others then insert into probe(name,outcome) values ('owner creates invite (should work)', 'FAILED!! '||sqlstate||' '||sqlerrm); end $$;

reset role;
select set_config('request.jwt.claims', '', true);

set local role anon;
do $$ begin perform public.redeem_invite('AAAA-AAAA');
  insert into probe(name,outcome) values ('anon calls redeem_invite', 'ALLOWED!!');
exception when others then insert into probe(name,outcome) values ('anon calls redeem_invite', 'blocked '||sqlstate); end $$;
reset role;

do $$ begin perform public.prepare_account_deletion((select uid from fx));
  insert into probe(name,outcome) values ('prepare_account_deletion of owner (should work)', 'ok');
exception when others then insert into probe(name,outcome) values ('prepare_account_deletion of owner (should work)', 'FAILED!! '||sqlstate||' '||sqlerrm); end $$;

select n, name, outcome from probe order by n;
