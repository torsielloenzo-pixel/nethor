'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const home=read('runtime/home-runtime.js');
const dashboard=read('runtime/desktop-home-dashboard.js');
function chunk(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing function range: '+start);
 return source.slice(a,b)
}
const team=[
 {id:'inactive',role:'employe',display_name:'Agent Delta',planning_name:'DELTA A',account_enabled:false},
 {id:'active',role:'employe',display_name:'Agent Alpha',planning_name:'ALPHA B',account_enabled:true},
 {id:'manager',role:'role_point-de-vente',display_name:'Manager',account_enabled:true}
];
const rows=[{task_id:7,user_id:'inactive'},{task_id:7,user_id:'active'}];
const normal=value=>String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function fixture(){
 const ctx={homeTaskTeam:team,homeTaskAssignees:rows,homeTaskCompletions:rows,homeTaskAfternoonUserIds:['inactive','active','manager'],homeNorm:normal};
 vm.createContext(ctx);
 vm.runInContext(
  chunk(home,'function homeTaskOperationalUsers(','function homeTaskGroupIcon(')+
  '\n'+chunk(home,'function homeActivePlanningOnly(','function homeQuickPlanningInitials('),
  ctx
 );
 return ctx
}
test('desktop home excludes inactive members from recipients and task progress',()=>{
 const x=fixture();
 assert.deepEqual(Array.from(x.homeTaskOperationalUsers(),u=>u.id),['active']);
 assert.deepEqual(Array.from(x.homeTaskAfternoonUsers(),u=>u.id),['active']);
 assert.equal(x.homeTaskExpectedCount({id:7,all_users:true}),1);
 assert.equal(x.homeTaskExpectedCount({id:7,all_users:false}),1);
 assert.equal(x.homeTaskCompletedCount({id:7}),1);
 assert.equal(x.homeTaskAssigneeLabel({id:7,all_users:false}),'Agent Alpha');
});
test('desktop identity mapping supports planning name and excludes inactive account',()=>{
 const x=fixture();
 assert.equal(x.homeQuickPlanningProfileFor('ALPHA B',team).id,'active');
 assert.equal(x.homeQuickPlanningProfileFor('Agent Alpha',team).id,'active');
 assert.equal(x.homeQuickPlanningProfileFor('DELTA A',team),null);
 const m={employees:[{name:'DELTA A'},{name:'ALPHA B'}],days:{'2026-10-12':{cells:[['g','g'],['b','b']]}}};
 const visible=x.homeActivePlanningOnly(m,team);
 assert.deepEqual(Array.from(visible.employees,u=>u.name),['ALPHA B']);
 assert.deepEqual(Array.from(visible.days['2026-10-12'].cells[0]),['b','b']);
 assert.equal(m.employees.length,2,'published planning must remain unmodified');
});
test('desktop dashboard counts only enabled operational staff',()=>{
 const sandbox={};vm.createContext(sandbox);
 vm.runInContext(chunk(dashboard,'function taskState(','function taskStats('),sandbox);
 const ctx={taskTeam:team,taskAssignees:rows,taskCompletions:rows};
 const direct=sandbox.taskState(ctx,{id:7,all_users:false});
 assert.equal(direct.expected,1);
 assert.equal(direct.completed,1);
 assert.equal(direct.status,'done');
 assert.equal(sandbox.taskState(ctx,{id:7,all_users:true}).expected,1);
});
