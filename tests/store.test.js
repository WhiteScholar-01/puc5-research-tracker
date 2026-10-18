import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore, ConflictError, AccessError, validateConfig} from '../site/store.js';
const member={id:'11111111-1111-4111-8111-111111111111'};
const fields={status:'completed',priority:'high',dueDate:null,notes:'Measured',assigneeId:null};
const config={url:'https://example.supabase.co',publishableKey:'sb_publishable_example'};
function fixture({user=member,rpcResult={data:[{id:'0-0',status:'completed',priority:'high',due_date:null,notes:'Measured',assignee_id:null,version:2,updated_at:'2026-10-18T12:00:00Z',updated_by:member.id}],error:null},onRpc=()=>{}}={}) {
 return {auth:{getUser:async()=>({data:{user},error:null}),getSession:async()=>({data:{session:user?{user}:null},error:null})},rpc:async(name,args)=>{onRpc(name,args);return rpcResult;}};
}
test('signed-out users cannot load shared progress',async()=>{
 const s=createStore(config,fixture({user:null}));
 await assert.rejects(()=>s.loadTracker(),AccessError);
});
test('saved record is normalized only after confirmed RPC response',async()=>{
 let release;let request;const pending=new Promise(r=>release=r);
 const client=fixture();client.rpc=async(name,args)=>{request={name,args};return pending;};
 const s=createStore(config,client);let done=false;
 const promise=s.saveTask('0-0',1,{...fields,updatedBy:'spoof'}).then(r=>{done=true;return r;});
 await new Promise(r=>setImmediate(r));assert.equal(done,false);
 assert.equal(request.name,'save_task');assert.equal('updatedBy' in request.args.p_fields,false);
 release({data:[{id:'0-0',...fields,due_date:null,assignee_id:null,version:2,updated_at:'2026-10-18T12:00:00Z',updated_by:member.id}],error:null});
 const record=await promise;assert.equal(record.version,2);assert.equal(record.updatedBy,member.id);
});
test('database version conflicts preserve a distinct error type',async()=>{
 const s=createStore(config,fixture({rpcResult:{data:null,error:{code:'40001',message:'Task changed'}}}));
 await assert.rejects(()=>s.saveTask('0-0',1,fields),ConflictError);
});
test('permission denial is distinguishable from network failure',async()=>{
 const s=createStore(config,fixture({rpcResult:{data:null,error:{code:'42501',message:'Denied'}}}));
 await assert.rejects(()=>s.saveTask('0-0',1,fields),AccessError);
 const failing=createStore(config,fixture({rpcResult:{data:null,error:{message:'Network failed'}}}));
 await assert.rejects(()=>failing.saveTask('0-0',1,fields),e=>!(e instanceof ConflictError)&&!(e instanceof AccessError));
});
test('invalid restore cannot reach the network',async()=>{
 let called=false;const s=createStore(config,fixture({onRpc:()=>called=true}));
 await assert.rejects(()=>s.restoreTasks([{id:'bad'}]));assert.equal(called,false);
});
test('configuration rejects privileged keys and non-Supabase endpoints',()=>{
 for(const c of [{url:'http://example.supabase.co',publishableKey:'sb_publishable_test'},{...config,publishableKey:'sb_secret_test'},{...config,url:'https://evil.test'}]) assert.throws(()=>validateConfig(c));
 assert.doesNotThrow(()=>validateConfig(config));
});
