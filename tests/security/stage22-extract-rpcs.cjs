'use strict';
// Use only in disposable local Supabase Auth integration, never in production.
const fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'..','..','docs/security/etape16-rpc-hardening-proposal.sql'),'utf8');
const names=['private.list_team_members_impl()','public.my_subrole_keys()'];
const statements=[];
for(const name of names){
 const marker='-- '+name+'\n';
 const start=sql.indexOf(marker);
 if(start<0||start!==sql.lastIndexOf(marker))throw Error('Missing or duplicate '+name);
 const bodyStart=start+marker.length;
 const next=sql.indexOf('\n\n-- ',bodyStart);
 const end=next>=0?next:sql.indexOf('\n\nCOMMIT;',bodyStart);
 if(end<0)throw Error('Unclosed function '+name);
 const definition=sql.slice(bodyStart,end).trim();
 if(!definition.startsWith('CREATE OR REPLACE FUNCTION '+name.split('(')[0]+'(')||
    !definition.includes('private.session_is_active()')||!definition.endsWith('$function$;')){
  throw Error('Unsafe or altered definition '+name);
 }
 statements.push(definition);
}
process.stdout.write('-- Stage22, local Supabase only; selected proposal functions\n'+statements.join('\n\n')+'\n');
