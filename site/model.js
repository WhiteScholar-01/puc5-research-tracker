import {TASKS} from './catalog.js';
export const defaultTask = t => ({...t,status:'pending',priority:'normal',notes:'',dueDate:null,assigneeId:null,version:0,updatedAt:null,updatedBy:null});
export function createModel() {
  let generation=0,flight=null;
  const m={tasks:TASKS.map(defaultTask),members:[],draft:null,expectedVersion:null,editingId:null,
    applySnapshot(snapshot) {
      const rows=new Map(snapshot.tasks.map(t=>[t.id,t]));
      m.tasks=TASKS.map(t=>({...defaultTask(t),...rows.get(t.id),...t}));
      m.members=snapshot.members;
    },
    openTask(id) {const t=m.tasks.find(t=>t.id===id);if(!t)throw new Error('Unknown task.');m.editingId=id;m.expectedVersion=t.version;m.draft={...t};},
    rebase(displayedVersion=m.tasks.find(t=>t.id===m.editingId).version) {if(!Number.isSafeInteger(displayedVersion)||displayedVersion<0)throw new Error('Invalid conflict version.');m.expectedVersion=displayedVersion;},
    closeTask() {m.draft=null;m.editingId=null;m.expectedVersion=null;},
    clear() {generation++;flight=null;m.tasks=TASKS.map(defaultTask);m.members=[];m.closeTask();},
    refresh(fetchSnapshot) {
      if(flight)return flight;
      const current=generation;
      const request=fetchSnapshot().then(snapshot=>{if(current===generation)m.applySnapshot(snapshot);}).finally(()=>{if(flight===request)flight=null;});
      flight=request;return request;
    }
  };return m;
}
