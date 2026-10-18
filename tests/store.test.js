import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore,ConflictError,StorageError,STORAGE_KEY} from '../site/store.js';
const fields={status:'completed',priority:'high',dueDate:null,notes:'Measured',assigneeId:'Saqib'};
function memory(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};}
test('any visitor can save without an account and recover progress after reopening',async()=>{
 const storage=memory(),store=createStore(storage);
 const initial=await store.loadTracker();assert.equal(initial.tasks.length,74);
 const saved=await store.saveTask('0-0',0,fields);assert.equal(saved.version,1);assert.ok(saved.updatedAt);
 const reopened=await createStore(storage).loadTracker();assert.equal(reopened.tasks[0].notes,'Measured');assert.equal(reopened.tasks[0].assigneeId,'Saqib');
});
test('separate browsers keep separate progress',async()=>{
 await createStore(memory()).saveTask('0-0',0,fields);
 assert.equal((await createStore(memory()).loadTracker()).tasks[0].status,'pending');
});
test('another tab changing a task causes a conflict instead of silently overwriting',async()=>{
 const storage=memory(),first=createStore(storage),second=createStore(storage);
 await first.saveTask('0-0',0,fields);
 await assert.rejects(()=>second.saveTask('0-0',0,{...fields,notes:'Stale draft'}),ConflictError);
 assert.equal((await first.loadTracker()).tasks[0].notes,'Measured');
});
test('storage failure never reports success or destroys earlier progress',async()=>{
 const storage=memory(),store=createStore(storage);await store.saveTask('0-0',0,fields);
 const before=storage.getItem(STORAGE_KEY);storage.setItem=()=>{throw new Error('quota');};
 await assert.rejects(()=>store.saveTask('0-0',1,{...fields,notes:'New draft'}),StorageError);
 assert.equal(storage.getItem(STORAGE_KEY),before);
});
test('corrupted stored progress is preserved and never silently reset',async()=>{
 const storage=memory();storage.setItem(STORAGE_KEY,'{bad');const s=createStore(storage);
 await assert.rejects(()=>s.loadTracker(),StorageError);await assert.rejects(()=>s.saveTask('0-0',0,fields),StorageError);
 assert.equal(s.readRaw(),'{bad');
});
test('import validates every task before replacing any local progress',async()=>{
 const storage=memory(),s=createStore(storage);await s.saveTask('0-0',0,fields);const before=storage.getItem(STORAGE_KEY);
 await assert.rejects(()=>s.restoreTasks([{id:'0-0',version:1,...fields},{id:'0-1',version:0,...fields,notes:null}]));
 assert.equal(storage.getItem(STORAGE_KEY),before);
});
test('restoring an older backup is intentional and advances current local versions',async()=>{
 const s=createStore(memory());await s.saveTask('0-0',0,fields);await s.saveTask('0-0',1,{...fields,notes:'More recent'});
 const r=await s.restoreTasks([{id:'0-0',version:0,...fields,notes:'Restored'}]);assert.equal(r[0].notes,'Restored');assert.equal(r[0].version,3);
});
