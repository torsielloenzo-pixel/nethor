'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','ui/mobile/views/home/home-view.js'),'utf8');
function section(start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,'Missing section: '+start);
 return source.slice(a,b)
}
function harness(){
 const state={
  team:[
   {id:'inactive',display_name:'Agent Epsilon',planning_name:'EPSILON A',role:'employe',account_enabled:false},
   {id:'active',display_name:'Agent Alpha',planning_name:'ALPHA B',role:'employe',account_enabled:true},
   {id:'manager',display_name:'Manager',role:'role_point-de-vente',account_enabled:true}
  ],
  afternoonUserIds:['inactive','active','manager'],
  assignees:[{task_id:101,user_id:'inactive'},{task_id:101,user_id:'active'}],
  completions:[{task_id:101,user_id:'inactive'},{task_id:101,user_id:'active'}]
 };
 const sandbox={state,norm:value=>String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')};
 vm.createContext(sandbox);
 vm.runInContext(section('function matchingPlanningMember(','function taskGroups(rows)')+'\n'+section('function activeTaskUserIds(','function taskGroupIcon('),sandbox);
 return sandbox
}
test('inactive imported identities are not displayed in mobile scheduling',()=>{
 const x=harness();
 assert.equal(x.disabledPlanningMember('Epsilon A'),true);
 assert.equal(x.disabledPlanningMember('Alpha B'),false);
 assert.equal(x.disabledPlanningMember('Other'),false);
 assert.equal(x.activePlanningMember('ALPHA B').id,'active');
 assert.equal(x.activePlanningMember('EPSILON A'),null);
 assert.match(source,/if\(disabledPlanningMember\(employee\.name\)\)return;/);
 assert.match(source,/const profile=activePlanningMember\(name\)/);
});
test('inactive profiles are excluded from mobile task audiences and counts',()=>{
 const x=harness();
 assert.deepEqual(Array.from(x.operationalUsers(),v=>v.id),['active']);
 assert.deepEqual(Array.from(x.afternoonUsers(),v=>v.id),['active']);
 assert.equal(x.expectedCount({id:101,all_users:true}),1);
 assert.equal(x.expectedCount({id:101,all_users:false}),1);
 assert.equal(x.completedCount({id:101}),1);
 assert.equal(x.assigneeLabel({id:101,all_users:false}),'Agent Alpha');
});
