'use strict';
// Extract the exact proposed functions into a disposable Postgres job.
// This script intentionally discards the production-targeted MD5 preflight:
// the CI database contains a *minimal fake schema*, not the production functions.
const fs=require('node:fs');
const path=require('node:path');
const proposal=fs.readFileSync(path.join(__dirname,'..','..','docs','security','etape16-rpc-hardening-proposal.sql'),'utf8');
const names=['private.list_team_members_impl()','private.chat_can_manage(uuid,uuid)'];
const extracted=[];
for(const name of names){
 const marker='-- '+name+'\n';
 const first=proposal.indexOf(marker);
 if(first<0||first!==proposal.lastIndexOf(marker))throw new Error('Missing or duplicate: '+name);
 const start=first+marker.length;
 const end=proposal.indexOf('\n\n-- ',start);
 if(end<0)throw new Error('Unable to isolate function: '+name);
 const block=proposal.slice(start,end).trim();
 if(!block.startsWith('CREATE OR REPLACE FUNCTION '+name.split('(')[0]+'(')||!block.endsWith('$function$;'))throw new Error('Malformed block: '+name);
 if(!block.includes('private.session_is_active()'))throw new Error('Guard missing: '+name);
 extracted.push(block);
}
process.stdout.write('-- Extracted from stage 16 proposal; disposable DB only.\n'+extracted.join('\n\n')+'\n');
