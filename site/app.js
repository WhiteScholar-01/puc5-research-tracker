import {PHASES,TASKS} from './catalog.js?v=local-1';
import {summarize,filterTasks,validateImport,migrateLegacy,toCsv,localDate,editableFields} from './validation.js?v=local-1';
import {createStore,ConflictError,STORAGE_KEY} from './store.js?v=local-1';
import {createModel} from './model.js?v=local-1';
const $=id=>document.getElementById(id);
const model=createModel();
let store=null,ready=false,busy=false,toastTimer,collapseAll=false,startupError='',conflictVersion=null;
const closedPhases=new Set(),ids=new Set(TASKS.map(t=>t.id));
const labels={'pending':'Pending','in-progress':'In progress','completed':'Completed'};
const shortPhase=p=>p.title.replace(/^\d+\. /,'').replace(/ \(W[\d-]+\)$/,'');
const element=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
function showToast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,7000);}
function showDialog(id){if(!$(id).open)$(id).showModal();}
function userName(name){return name;}
function readableUpdate(t){return t.updatedAt?`Saved in this browser ${new Date(t.updatedAt).toLocaleString()}`:'Not updated yet.';}
function filters(){return {query:$('search').value,phaseId:$('phase-filter').value,status:$('status-filter').value,priority:$('priority-filter').value};}
function render(){
  const metrics=summarize(model.tasks);
  $('percent').textContent=ready?`${metrics.percent}%`:'—';
  $('overall-progress').value=ready?metrics.percent:0;
  $('progress-caption').textContent=ready?`${metrics.completed} of ${metrics.total} tasks completed`:'74 tasks across 9 phases';
  $('stat-completed').textContent=ready?metrics.completed:'—';
  $('stat-in-progress').textContent=ready?metrics.inProgress:'—';
  $('stat-overdue').textContent=ready?metrics.overdue:'—';
  $('notice-title').textContent=ready?'Open tracker · no account needed':'Browser storage unavailable';
  $('notice-copy').textContent=ready?'Changes stay in this browser. Use Backup and Import to move progress between devices.':startupError||'Loading your saved progress…';
  $('backup').disabled=!store;
  for(const id of ['csv','import'])$(id).disabled=!ready;
  const visible=filterTasks(model.tasks,filters());
  $('results-count').textContent=`${visible.length} of ${TASKS.length} research tasks${ready?` · ${metrics.pending} pending`:''}`;
  $('empty').hidden=visible.length>0;
  const root=$('phases');root.replaceChildren();
  for(const p of PHASES){
    const items=visible.filter(t=>t.phaseId===p.id);if(!items.length)continue;
    const all=model.tasks.filter(t=>t.phaseId===p.id),pm=summarize(all);
    const d=element('details','phase');d.open=!closedPhases.has(p.id);d.id=`phase-${p.id}`;
    const sum=element('summary');sum.append(element('span','phase-number',String(p.id+1).padStart(2,'0')));
    const name=element('span','phase-title',shortPhase(p));name.append(element('span','phase-week',p.weeks.replace('-','–')));sum.append(name);
    const meta=element('span','phase-completion');const bar=element('progress');bar.max=all.length;bar.value=ready?pm.completed:0;bar.setAttribute('aria-label',`${shortPhase(p)} completion`);meta.append(bar,element('span','',ready?`${pm.completed} / ${all.length}`:`${all.length} tasks`));sum.append(meta);d.append(sum);
    const list=element('div','task-list');
    for(const t of items){
      const row=element('div',`task-row ${t.status==='completed'?'is-completed':''}`);
      const toggle=element('button',`task-circle ${t.status==='completed'?'done':t.status==='in-progress'?'started':''}`,t.status==='completed'?'✓':t.status==='in-progress'?'·':'');
      toggle.type='button';toggle.disabled=!ready;toggle.setAttribute('aria-label',`${t.status==='completed'?'Mark pending':'Mark complete'}: ${t.title}`);toggle.onclick=()=>quickToggle(t.id);row.append(toggle);
      const content=element('div','task-content');const title=element('button','task-title',t.title);title.type='button';title.disabled=!ready;title.addEventListener('click',()=>openTask(t.id));content.append(title);
      const info=element('div','task-meta');
      if(ready){
        if(t.status!=='pending')info.append(element('span','',labels[t.status]));
        if(t.dueDate)info.append(element('span',t.dueDate<localDate()&&t.status!=='completed'?'late':'',`Due ${t.dueDate}`));
        if(t.assigneeId)info.append(element('span','',userName(t.assigneeId)));
        if(t.notes)info.append(element('span','','Notes added'));
      }
      content.append(info);row.append(content);
      if(t.title.startsWith('GATE '))row.append(element('span','task-badge gate',t.title.split(':')[0]));
      else if(ready&&t.priority==='high')row.append(element('span','task-badge high','HIGH'));
      if(ready){const edit=element('button','task-arrow','↗');edit.setAttribute('aria-label',`Edit ${t.title}`);edit.onclick=()=>openTask(t.id);row.append(edit);}
      list.append(row);
    }
    d.append(list);d.addEventListener('toggle',()=>{if(!d.isConnected)return;if(d.open)closedPhases.delete(p.id);else closedPhases.add(p.id);});root.append(d);
  }
  document.querySelectorAll('.phase-link').forEach(b=>b.classList.toggle('selected',b.dataset.id===$('phase-filter').value));
}
function openTask(id){
  if(!ready||busy)return;conflictVersion=null;model.openTask(id);const t=model.draft;
  $('task-title').textContent=t.title;$('task-phase').textContent=shortPhase(PHASES[t.phaseId]);$('task-updated').textContent=readableUpdate(t);
  const form=$('task-form');for(const name of ['status','priority','notes'])form.elements[name].value=t[name];form.elements.dueDate.value=t.dueDate||'';
  form.elements.assigneeId.value=t.assigneeId||'';
  $('task-error').textContent='';$('conflict').hidden=true;$('save-task').disabled=false;showDialog('task-dialog');
}
function captureDraft(){
  if(!model.draft)return;const f=$('task-form');Object.assign(model.draft,{status:f.elements.status.value,priority:f.elements.priority.value,notes:f.elements.notes.value,dueDate:f.elements.dueDate.value||null,assigneeId:f.elements.assigneeId.value||null});
}
async function refresh(announce=false){
  if(!store)return;
  try{await model.refresh(()=>store.loadTracker());ready=true;render();$('sync-time').textContent='Saved on this browser';if(announce)showToast('Saved progress loaded.');}
  catch(error){$('sync-time').textContent='Could not read browser storage';if(announce)showToast(error.message);throw error;}
}
async function quickToggle(id){
  if(!ready||busy)return;busy=true;const task=model.tasks.find(t=>t.id===id);
  try{await store.saveTask(id,task.version,{...task,status:task.status==='completed'?'pending':'completed'});await refresh();}
  catch(error){showToast(error.message);if(error instanceof ConflictError)await refresh().catch(()=>{});}
  finally{busy=false;}
}
function freezeEditor(saving){for(const control of $('task-form').querySelectorAll('input,select,textarea,button'))control.disabled=saving;$('save-task').textContent=saving?'Saving…':'Save changes';}
async function runButton(button,action){button.disabled=true;try{await action();}finally{button.disabled=false;}}
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=element('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportTasks(){return model.tasks.map(t=>({id:t.id,version:t.version,...editableFields(t)}));}
for(const p of PHASES){
  const b=element('button','phase-link');b.dataset.id=p.id;b.append(element('span','phase-index',String(p.id+1).padStart(2,'0')),element('span','',shortPhase(p)));b.onclick=()=>{$('phase-filter').value=p.id;render();$('roadmap-title').scrollIntoView({block:'start'});};$('phase-nav').append(b);
  $('phase-filter').add(new Option(`${p.id+1}. ${shortPhase(p)}`,p.id));
}
for(const id of ['search','phase-filter','status-filter','priority-filter'])$(id).addEventListener(id==='search'?'input':'change',render);
function clearFilters(){for(const id of ['search','phase-filter','status-filter','priority-filter'])$(id).value='';render();}
$('clear-filters').onclick=clearFilters;$('overview').onclick=()=>{clearFilters();window.scrollTo({top:0,behavior:'smooth'});};
$('collapse').onclick=()=>{collapseAll=!collapseAll;closedPhases.clear();if(collapseAll)PHASES.forEach(p=>closedPhases.add(p.id));$('collapse').textContent=collapseAll?'Expand all':'Collapse all';render();};
let theme=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';try{theme=localStorage.getItem('puc5.theme')||theme;}catch{}document.documentElement.dataset.theme=theme;
$('theme').onclick=()=>{theme=theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('puc5.theme',theme);}catch{};};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
$('task-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('task-dialog').addEventListener('close',()=>{model.closeTask();$('task-form').reset();$('conflict-values').textContent='';});
$('task-form').addEventListener('input',captureDraft);
$('task-form').onsubmit=async e=>{
  e.preventDefault();if(!ready||busy)return;captureDraft();const draft={...model.draft},version=model.expectedVersion;busy=true;
  $('task-error').textContent='';freezeEditor(true);
  try{
    await store.saveTask(draft.id,version,draft);
    $('task-dialog').close();showToast('Changes saved in this browser.');
    await refresh().catch(()=>showToast('Changes saved. Could not reload the display.'));
  }catch(error){
    $('task-error').textContent=error.message;
    if(error instanceof ConflictError){
      try{await refresh();const latest=model.tasks.find(t=>t.id===draft.id);conflictVersion=latest.version;
        $('conflict-values').textContent=`Status: ${labels[latest.status]}\nPriority: ${latest.priority}\nDue: ${latest.dueDate||'None'}\nAssigned: ${latest.assigneeId||'Unassigned'}\nNotes: ${latest.notes||'None'}`;
        $('conflict').hidden=false;
      }catch{$('task-error').textContent='Could not read the latest saved version. Your draft is retained.';}
    }
  }finally{busy=false;freezeEditor(false);if(!$('conflict').hidden)$('save-task').disabled=true;}
};
$('rebase').onclick=()=>{model.rebase(conflictVersion);$('conflict').hidden=true;$('task-error').textContent='Review your draft, then save to replace the displayed values.';$('save-task').disabled=false;};
$('backup').onclick=()=>{
  try{if(!ready){const raw=store.readRaw();if(!raw)throw new Error('There is no saved progress to download.');download('puc5-recovery.json',raw,'application/json');return;}
    download(`puc5-backup-${localDate()}.json`,JSON.stringify({format:'puc5-tracker',version:1,exportedAt:new Date().toISOString(),tasks:exportTasks()},null,2),'application/json');
  }catch(error){showToast(error.message);}
};
$('csv').onclick=()=>{if(ready)download(`puc5-research-${localDate()}.csv`,toCsv(model.tasks),'text/csv;charset=utf-8');};
$('import').onclick=()=>{if(ready){$('import-error').textContent='';showDialog('import-dialog');}};
$('import-run').onclick=async()=>{
  if(!ready||busy)return;const file=$('import-file').files[0];$('import-error').textContent='';
  if(!file){$('import-error').textContent='Choose a JSON file first.';return;}
  if(file.size>1024*1024){$('import-error').textContent='Choose a backup under 1 MB.';return;}
  busy=true;await runButton($('import-run'),async()=>{
    try{
      const parsed=JSON.parse(await file.text());let records;
      if($('import-kind').value==='legacy'){
        const legacy=migrateLegacy(parsed,ids);await refresh();
        records=legacy.map(x=>{const current=model.tasks.find(t=>t.id===x.id);return {id:x.id,version:current.version,...editableFields({...current,status:x.status})};});
      }else records=validateImport(parsed,ids);
      if(!confirm(`Replace the saved values of ${records.length} tasks in this browser? Other browsers are not affected.`))return;
      await store.restoreTasks(records);$('import-dialog').close();$('import-file').value='';showToast(`${records.length} tasks imported in this browser.`);await refresh();
    }catch(error){$('import-error').textContent=error instanceof SyntaxError?'This file is not valid JSON.':error.message;}
    finally{busy=false;}
  });
};
$('refresh').onclick=()=>refresh(true).catch(()=>{});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===null)refresh().catch(error=>showToast(error.message));});
async function boot(){
  render();try{store=createStore();await refresh();}
  catch(error){startupError=error.message;ready=false;render();showToast(error.message);}
}
boot();
