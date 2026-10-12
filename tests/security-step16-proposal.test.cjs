'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const relative='docs/security/etape16-rpc-hardening-proposal.sql';
const sql=fs.readFileSync(path.join(root,relative),'utf8');
const targets=[
 'private.list_team_members_impl',
 'private.chat_can_manage',
 'public.admin_notification_rules',
 'public.admin_notification_users',
 'public.chat_presence_ping',
 'public.chat_mark_all_read',
 'public.chat_mark_read',
 'public.chat_set_muted',
 'public.chat_set_user_conversation_state',
 'public.my_subrole_keys',
 'public.my_subrole_permissions',
 'public.weekly_poll_results'
];
test('Security step 16 SQL is review-only, atomic, and guarded against concurrent schema changes',()=>{
 assert.match(sql,/REVIEW-ONLY, NOT DEPLOYED/);
 assert.match(sql,/THIS FILE IS NOT AN AUTOMATIC MIGRATION/);
 assert.match(sql,/^BEGIN;$/m);
 assert.match(sql,/^COMMIT;$/m);
 assert.match(sql,/DO \$nethor_preflight\$/);
 assert.equal((sql.match(/md5\(pg_get_functiondef\(p\.oid\)\)/g)||[]).length,targets.length);
 const executable=sql.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n');
 assert.doesNotMatch(executable,/\b(?:GRANT|REVOKE|DROP TABLE|DELETE FROM auth\.sessions|UPDATE public\.profiles)\b/i);
 assert.doesNotMatch(relative,/supabase\/migrations/i);
});
test('Security step 16 preserves each function and installs an explicit session guard',()=>{
 for(let i=0;i<targets.length;i++){
  const name=targets[i];
  const start=sql.indexOf('-- '+name+'(');
  const end=i+1<targets.length?sql.indexOf('-- '+targets[i+1]+'(',start):sql.lastIndexOf('COMMIT;');
  assert.ok(start>=0&&end>start,'Missing '+name);
  const def=sql.slice(start,end);
  assert.ok(def.includes('CREATE OR REPLACE FUNCTION '+name+'('),'Signature changed for '+name);
  assert.match(def,/private\.session_is_active\(\)/,'Missing session guard: '+name);
  assert.match(def,/SECURITY DEFINER/,'Security mode changed: '+name);
  assert.match(def,/SET search_path/,'Search path lost: '+name);
  assert.ok(sql.includes("to_regprocedure('"+name+"("),'Missing preflight: '+name);
 }
});
test('Security step 16 binds sensitive team and chat checks to the caller',()=>{
 const team=sql.slice(sql.indexOf('-- private.list_team_members_impl('),sql.indexOf('-- private.chat_can_manage('));
 assert.match(team,/where \(select auth\.uid\(\)\) is not null[\s\S]*private\.session_is_active\(\)/);
 const manager=sql.slice(sql.indexOf('-- private.chat_can_manage('),sql.indexOf('-- public.admin_notification_rules('));
 assert.match(manager,/p_user = \(select auth\.uid\(\)\)/);
});
