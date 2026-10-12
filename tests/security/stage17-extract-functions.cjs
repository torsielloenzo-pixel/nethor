'use strict';
// Extract the exact proposed functions into a disposable Postgres job.
// This script intentionally discards the production-targeted MD5 preflight:
// the CI database contains a *minimal fake schema*, not the production functions.
const fs=require('node:fs');
const path=require('node:path');
const proposal=fs.readFileSync(path.join(__dirname,'..','..','docs','security','etape16-rpc-hardening-proposal.sql'),'utf8');
const names=['private.list_team_members_impl()','private.chat_can_manage(uuid,uuid)','public.admin_notification_rules()','public.admin_notification_users()','public.chat_presence_ping(text)','public.chat_mark_all_read()','public.chat_mark_read(uuid)','public.chat_set_muted(uuid,boolean)','public.chat_set_user_conversation_state(uuid,text)','public.my_subrole_keys()','public.my_subrole_permissions()','public.weekly_poll_results(uuid)'];
const extracted=[];
for(const name of names){
 const marker='-- '+name+'\n';
 const first=proposal.indexOf(marker);
 if(first<0||first!==proposal.lastIndexOf(marker))throw new Error('Missing or duplicate: '+name);
 const start=first+marker.length;
 const next=proposal.indexOf('\n\n-- ',start);
 const end=next>=0?next:proposal.indexOf('\n\nCOMMIT;',start);
 if(end<0)throw new Error('Unable to isolate function: '+name);
 const block=proposal.slice(start,end).trim();
 if(!block.startsWith('CREATE OR REPLACE FUNCTION '+name.split('(')[0]+'(')||!block.endsWith('$function$;'))throw new Error('Malformed block: '+name);
 if(!block.includes('private.session_is_active()'))throw new Error('Guard missing: '+name);
 extracted.push(block);
}
process.stdout.write('-- Extracted from stage 16 proposal; disposable DB only.\n'+extracted.join('\n\n')+'\n');
