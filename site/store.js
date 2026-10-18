import {TASKS} from './catalog.js?v=local-1';
import {editableFields,validateImport,migrateLegacy} from './validation.js?v=local-1';
import {defaultTask} from './model.js?v=local-1';
export const STORAGE_KEY='puc5tracker.local.v1';
export class ConflictError extends Error {}
export class StorageError extends Error {}
export function createStore(storage=globalThis.localStorage) {
  const ids=new Set(TASKS.map(t=>t.id));
  function readRaw(){try{return storage.getItem(STORAGE_KEY);}catch{throw new StorageError('Browser storage is unavailable. Allow website storage or use another browser.');}}
  function read(){
    const raw=readRaw();if(raw===null)return TASKS.map(defaultTask);
    try{
      const data=JSON.parse(raw),clean=validateImport(data,ids);
      if(clean.length!==TASKS.length)throw new Error('Incomplete saved progress');
      const metadata=new Map(data.tasks.map(t=>[t.id,t]));
      return clean.map(t=>({...t,updatedAt:typeof metadata.get(t.id).updatedAt==='string'&&Number.isFinite(Date.parse(metadata.get(t.id).updatedAt))?metadata.get(t.id).updatedAt:null}));
    }catch{throw new StorageError('Saved progress could not be read. Use Backup to download a recovery copy before clearing website data.');}
  }
  function write(tasks){try{storage.setItem(STORAGE_KEY,JSON.stringify({format:'puc5-tracker',version:1,tasks}));}catch{throw new StorageError('Changes could not be saved in this browser. Your draft is retained. Free some browser storage or download a backup.');}}
  function locked(action){return globalThis.navigator?.locks?globalThis.navigator.locks.request(STORAGE_KEY,action):Promise.resolve().then(action);}
  return {
    readRaw,
    async loadTracker(){return {tasks:read(),members:[]};},
    async saveTask(id,expectedVersion,fields){
      if(!ids.has(id)||!Number.isSafeInteger(expectedVersion)||expectedVersion<0)throw new Error('Invalid task or version.');
      const clean=editableFields(fields);
      return locked(()=>{const tasks=read(),index=tasks.findIndex(t=>t.id===id),current=tasks[index];
        if(current.version!==expectedVersion)throw new ConflictError('This task changed in another tab. Compare the saved values before saving again.');
        const saved={id,...clean,version:current.version+1,updatedAt:new Date().toISOString()};tasks[index]=saved;write(tasks);return saved;});
    },
    async restoreLegacy(progress){
      const clean=migrateLegacy(progress,ids);
      return locked(()=>{const changes=new Map(clean.map(t=>[t.id,t.status])),saved=[];
        const next=read().map(current=>{if(!changes.has(current.id))return current;
          const row={...current,status:changes.get(current.id),version:current.version+1,updatedAt:new Date().toISOString()};saved.push(row);return row;});
        write(next);return saved;});
    },
    async restoreTasks(records){
      const clean=validateImport({format:'puc5-tracker',version:1,tasks:records},ids);
      return locked(()=>{const tasks=read(),imported=new Map(clean.map(t=>[t.id,t])),saved=[];
        const next=tasks.map(current=>{const incoming=imported.get(current.id);if(!incoming)return current;
          const row={id:current.id,...editableFields(incoming),version:current.version+1,updatedAt:new Date().toISOString()};saved.push(row);return row;});
        write(next);return saved;});
    }
  };
}
