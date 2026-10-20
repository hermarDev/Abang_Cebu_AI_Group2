-- Local role-privilege regression for the append-only audit log migration.
BEGIN;
SELECT plan(2);

SELECT ok(
    NOT has_table_privilege('anon', 'public.audit_logs', 'TRUNCATE'),
    'anon cannot truncate audit logs'
);
SELECT ok(
    NOT has_table_privilege('authenticated', 'public.audit_logs', 'TRUNCATE'),
    'authenticated cannot truncate audit logs'
);

SELECT * FROM finish();
ROLLBACK;
