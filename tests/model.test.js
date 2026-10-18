import test from 'node:test';
import assert from 'node:assert/strict';
import {createModel} from '../site/model.js';
const a={id:'0-0',status:'pending',priority:'normal',notes:'',dueDate:null,assigneeId:null,version:0};
test('refresh replaces saved records but preserves editor draft',()=>{
 const model=createModel();model.applySnapshot({tasks:[a],members:[]});
 model.openTask('0-0');model.draft.notes='Unsaved measurements';
 model.applySnapshot({tasks:[{...a,notes:'Other member',version:1}],members:[]});
 assert.equal(model.draft.notes,'Unsaved measurements');assert.equal(model.expectedVersion,0);
 assert.equal(model.tasks.find(t=>t.id==='0-0').notes,'Other member');
 model.rebase();assert.equal(model.expectedVersion,1);assert.equal(model.draft.notes,'Unsaved measurements');
});
test('sign-out clears private notes and draft',()=>{
 const m=createModel();m.applySnapshot({tasks:[{...a,notes:'private'}],members:[{id:'a',name:'Member'}]});m.openTask('0-0');m.clear();
 assert.equal(m.draft,null);assert.equal(m.members.length,0);assert.equal(m.tasks.find(t=>t.id==='0-0').notes,'');
});
test('simultaneous refresh calls use a single active request',async()=>{
 const m=createModel();let resolve;let calls=0;
 const fetch=()=>{calls++;return new Promise(r=>resolve=r);};
 const one=m.refresh(fetch),two=m.refresh(fetch);assert.equal(calls,1);
 resolve({tasks:[a],members:[]});await Promise.all([one,two]);assert.equal(calls,1);
});
test('a refresh finishing after sign-out cannot restore private data',async()=>{
 const m=createModel();let resolve;const request=m.refresh(()=>new Promise(r=>resolve=r));m.clear();
 resolve({tasks:[{...a,notes:'private'}],members:[]});await request;
 assert.equal(m.tasks.find(t=>t.id==='0-0').notes,'');
});
test('conflict reconciliation pins the version actually shown, not a later background refresh',()=>{
 const m=createModel();m.applySnapshot({tasks:[a],members:[]});m.openTask('0-0');m.draft.notes='My draft';
 m.applySnapshot({tasks:[{...a,notes:'Shown comparison',version:1}],members:[]});
 const displayedVersion=1;
 m.applySnapshot({tasks:[{...a,notes:'Unseen newer note',version:2}],members:[]});
 m.rebase(displayedVersion);
 assert.equal(m.expectedVersion,1);assert.equal(m.draft.notes,'My draft');
});
