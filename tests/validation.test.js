import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize, filterTasks, validateImport, migrateLegacy, toCsv, isDate} from '../site/validation.js';
const ids = new Set(['0-0','0-1']);
const task = (extra = {}) => ({id:'0-0',title:'Read paper',phaseId:0,status:'pending',priority:'normal',dueDate:null,notes:'',assigneeId:null,version:0,...extra});
const backup = (...tasks) => ({format:'puc5-tracker',version:1,tasks});
test('progress and overdue use status and local calendar date', () => {
  assert.deepEqual(summarize([task({status:'completed',dueDate:'2000-01-01'}),task({id:'0-1',status:'in-progress',dueDate:'2026-10-17'}),task({id:'0-2',dueDate:'2026-10-18'})], '2026-10-18'),{total:3,completed:1,inProgress:1,pending:1,overdue:1,percent:33});
  assert.equal(summarize([]).percent,0);
});
test('filters combine phase, query, priority and status including notes', () => {
  const items=[task({notes:'Measure ESR',priority:'high',phaseId:1}), task({id:'0-1',notes:'Measure ESR',status:'completed',phaseId:1})];
  assert.deepEqual(filterTasks(items,{query:' esr ',phaseId:'1',priority:'high',status:'pending'}).map(t=>t.id),['0-0']);
  assert.equal(filterTasks(items,{query:'absent'}).length,0);
});
test('dates reject impossible calendar days', () => {
  for(const value of ['2026-02-30','2026-13-01','2026-1-01','anything','0000-01-01']) assert.equal(isDate(value),false);
  assert.equal(isDate('2024-02-29'),true);
});
test('valid backup keeps only editable fields and version', () => {
  const records=validateImport(backup(task({updatedBy:'spoof',notes:'<script>alert(1)</script>'})),ids);
  assert.equal(records[0].notes,'<script>alert(1)</script>');
  assert.equal('updatedBy' in records[0],false);
  assert.equal('title' in records[0],false);
});
test('malformed and unsupported backups fail before writes', () => {
  for(const value of [null,[],{}, {format:'puc5-tracker',version:2,tasks:[]},backup(),backup(task(),task())]) assert.throws(()=>validateImport(value,ids));
});
test('unknown IDs, invalid fields and excessive notes are rejected', () => {
  for(const extra of [{id:'unknown'},{status:'other'},{priority:'urgent'},{dueDate:'2026-02-30'},{notes:'x'.repeat(10001)},{notes:null},{assigneeId:5},{assigneeId:'x'.repeat(121)},{version:-1},{version:0.5}]) assert.throws(()=>validateImport(backup(task(extra)),ids));
});
test('legacy migration is explicit and rejects bad IDs or non-boolean values', () => {
  assert.deepEqual(migrateLegacy({'0-0':true,'0-1':false},ids),[{id:'0-0',status:'completed'},{id:'0-1',status:'pending'}]);
  assert.throws(()=>migrateLegacy({'0-0':'true'},ids));
  assert.throws(()=>migrateLegacy({'8-9':true},ids));
});
test('CSV protects formulas and escapes punctuation and newlines', () => {
  const csv=toCsv([task({title:'=SUM(A1)',notes:'He said "yes",\nnext'})]);
  assert.ok(csv.includes('"\'=SUM(A1)"'));
  assert.ok(csv.includes('"He said ""yes"",\nnext"'));
});
test('assignees can be simple names without member accounts',()=>{
 assert.equal(validateImport(backup(task({assigneeId:'Tariq Sir'})),ids)[0].assigneeId,'Tariq Sir');
 assert.throws(()=>validateImport(backup(task({assigneeId:'x'.repeat(121)})),ids));
});
import {readImportFile} from '../site/validation.js';
import {TASKS} from '../site/catalog.js';
test('every valid exported task can carry maximum-length Unicode notes and still be imported',async()=>{
 const full=backup(...TASKS.map(t=>task({id:t.id,notes:'一'.repeat(10000)})));
 const file=new Blob([JSON.stringify(full)]);assert.ok(file.size>1024*1024);
 const decoded=await readImportFile(file);
 assert.equal(validateImport(decoded,new Set(TASKS.map(t=>t.id))).length,74);
});
test('oversized imports are rejected before reading their contents',async()=>{
 let read=false;await assert.rejects(()=>readImportFile({size:9*1024*1024,text:async()=>{read=true;return '{}';}}));assert.equal(read,false);
});
