-- Tek sorgu: 0047/0048 doğrulaması + 0049'un ihtiyaç duyduğu iki liste.
-- Supabase SQL editöründe çalıştır, dönen tek JSON'u olduğu gibi yapıştır.

select jsonb_pretty(jsonb_build_object(

  -- 0047: family_password_hash üzerindeki UPDATE hakkı gitti mi? (beklenen: 0)
  'family_password_update_grant', (
    select count(*) from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'households'
      and column_name = 'family_password_hash'
      and grantee = 'authenticated' and privilege_type = 'UPDATE'),

  -- 0047 + 0048: fonksiyonlar yerinde mi? (beklenen: 4 isim)
  'new_functions', (
    select jsonb_agg(p.proname order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in
      ('set_family_password','verify_family_password','enforce_attempt_limit','record_attempt')),

  -- 0048: deneme tablosu private şemada mı? (beklenen: true)
  'auth_attempts_in_private', to_regclass('private.auth_attempts') is not null,

  -- 0049 için: households'ın GERÇEK kolonları (ezberden yazmıyoruz)
  'households_columns', (
    select jsonb_agg(jsonb_build_object('col', column_name, 'type', data_type, 'gen', is_generated)
                     order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'households'),

  -- Chat'in 4. sorusu: KOLON SEVİYESİNDE kısıtlanmış her şey.
  -- (Tablo seviyesinde zaten verilmiş yetkiler elenir, sadece özel olarak
  --  daraltılmış olanlar kalır — gürültüsüz gerçek durum.)
  'column_level_only_grants', (
    select jsonb_agg(jsonb_build_object('tbl', table_name, 'priv', privilege_type, 'col', column_name)
                     order by table_name, privilege_type, column_name)
    from information_schema.column_privileges cp
    where cp.grantee = 'authenticated' and cp.table_schema = 'public'
      and not exists (
        select 1 from information_schema.table_privileges tp
        where tp.grantee = 'authenticated' and tp.table_schema = 'public'
          and tp.table_name = cp.table_name and tp.privilege_type = cp.privilege_type)),

  -- forum_posts.score gerçekten client INSERT'inden kaldırılmış mı?
  -- Eğer burada 'INSERT' görünüyorsa TABLO seviyesinde açık demektir,
  -- yani threat model'in "düzeltildi" kaydı yanlış.
  'forum_posts_table_privs', (
    select jsonb_agg(privilege_type order by privilege_type)
    from information_schema.table_privileges
    where grantee = 'authenticated' and table_schema = 'public' and table_name = 'forum_posts'),

  -- authenticated'a TABLO seviyesinde hiç yetki verilmemiş tablolar
  -- (coin_grants gibi — doğru davranış, kayıt için)
  'tables_with_no_table_grant', (
    select jsonb_agg(t.table_name order by t.table_name)
    from information_schema.tables t
    where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
      and not exists (
        select 1 from information_schema.table_privileges tp
        where tp.grantee = 'authenticated' and tp.table_schema = 'public'
          and tp.table_name = t.table_name))
));
