import {PHASES, TASKS} from './catalog.js';
import {summarize,filterTasks,validateImport,migrateLegacy,toCsv,localDate,editableFields} from './validation.js';
import {createStore,validateConfig,ConflictError,AccessError} from './store.js';
import {createModel} from './model.js';
import {CONFIG} from './config.js';
const $=id=>document.getElementById(id);
const model=createModel();
let store=null,session=null,shared=false,busy=false,toastTimer,collapseAll=false;
const closedPhases=new Set();
const ids=new Set(TASKS.map(t=>t.id));
const labels={'pending':'Pending','in-progress':'In progress','completed':'Completed'};
const shortPhase=p=>p.title.replace(/^\d+\. /,'').replace(/ \(W[\d-]+\)$/,'');
const element=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
function showToast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,7000);}
function showDialog(id){if(!$(id).open)$(id).showModal();}
function clearPrivate(){session=null;shared=false;model.clear();for(const id of ['task-dialog','import-dialog','password-dialog'])$(id).close();$('task-form').reset();$('import-file').value='';$('conflict-values').textContent='';$('task-updated').textContent='';$('auth-form').reset();render();}
function userName(id){return model.members.find(m=>m.id===id)?.name||'Team member';}
function readableUpdate(t){return t.updatedAt?`Updated ${new Date(t.updatedAt).toLocaleString()} by ${userName(t.updatedBy)}`:'No updates yet.';}
function filters(){return {query:$('search').value,phaseId:$('phase-filter').value,status:$('status-filter').value,priority:$('priority-filter').value};}
function render(){
  const metrics=summarize(model.tasks);
  $('percent').textContent=shared?`${metrics.percent}%`:'—';
  $('overall-progress').value=shared?metrics.percent:0;
  $('progress-caption').textContent=shared?`${metrics.completed} of ${metrics.total} tasks completed`:'74 tasks across 9 phases';
  $('stat-completed').textContent=shared?metrics.completed:'—';
  $('stat-in-progress').textContent=shared?metrics.inProgress:'—';
  $('stat-overdue').textContent=shared?metrics.overdue:'—';
  $('account').textContent=session?'Sign out':'Member sign in ↗';
  $('notice-title').textContent=shared?'Team workspace connected':session?'Loading team workspace…':store?'Invited members only':'Research roadmap preview';
  $('notice-copy').textContent=shared?'You and your team are working from the same saved progress.':session?'Checking your membership and fetching the latest progress.':store?'Sign in to see team progress, add notes, and update tasks.':'Connect shared storage to save progress and invite your team.';
  $('setup').hidden=shared;$('setup').textContent=store?'Sign in →':'Connect workspace →';
  for(const id of ['backup','csv','import'])$(id).disabled=!shared;
  $('refresh').hidden=!shared;
  const visible=filterTasks(model.tasks,filters());
  $('results-count').textContent=`${visible.length} of ${TASKS.length} research tasks${shared?` · ${metrics.pending} pending`:''}`;
  $('empty').hidden=visible.length>0;
  const root=$('phases');root.replaceChildren();
  for(const p of PHASES){
    const items=visible.filter(t=>t.phaseId===p.id);if(!items.length)continue;
    const all=model.tasks.filter(t=>t.phaseId===p.id),pm=summarize(all);
    const d=element('details','phase');d.open=!closedPhases.has(p.id);d.id=`phase-${p.id}`;
    const sum=element('summary');sum.append(element('span','phase-number',String(p.id+1).padStart(2,'0')));
    const name=element('span','phase-title',shortPhase(p));name.append(element('span','phase-week',p.weeks.replace('-','–')));sum.append(name);
    const meta=element('span','phase-completion');const bar=element('progress');bar.max=all.length;bar.value=shared?pm.completed:0;bar.setAttribute('aria-label',`${shortPhase(p)} completion`);meta.append(bar,element('span','',shared?`${pm.completed} / ${all.length}`:`${all.length} tasks`));sum.append(meta);d.append(sum);
    const list=element('div','task-list');
    for(const t of items){
      const row=element('div',`task-row ${t.status==='completed'?'is-completed':''}`);
      row.append(element('span',`task-circle ${t.status==='completed'?'done':t.status==='in-progress'?'started':''}`,t.status==='completed'?'✓':t.status==='in-progress'?'·':''));
      const content=element('div','task-content');const title=element('button','task-title',t.title);title.type='button';title.disabled=!shared;title.addEventListener('click',()=>openTask(t.id));content.append(title);
      const info=element('div','task-meta');
      if(shared){
        if(t.status!=='pending')info.append(element('span','',labels[t.status]));
        if(t.dueDate)info.append(element('span',t.dueDate<localDate()&&t.status!=='completed'?'late':'',`Due ${t.dueDate}`));
        if(t.assigneeId)info.append(element('span','',userName(t.assigneeId)));
        if(t.notes)info.append(element('span','','Notes added'));
      }
      content.append(info);row.append(content);
      if(t.title.startsWith('GATE '))row.append(element('span','task-badge gate',t.title.split(':')[0]));
      else if(shared&&t.priority==='high')row.append(element('span','task-badge high','HIGH'));
      if(shared){const edit=element('button','task-arrow','↗');edit.setAttribute('aria-label',`Edit ${t.title}`);edit.onclick=()=>openTask(t.id);row.append(edit);}
      list.append(row);
    }
    d.append(list);d.addEventListener('toggle',()=>{if(!d.isConnected)return;if(d.open)closedPhases.delete(p.id);else closedPhases.add(p.id);});root.append(d);
  }
  document.querySelectorAll('.phase-link').forEach(b=>b.classList.toggle('selected',b.dataset.id===$('phase-filter').value));
}
function openTask(id){
  if(!shared)return;model.openTask(id);const t=model.draft;
  $('task-title').textContent=t.title;$('task-phase').textContent=shortPhase(PHASES[t.phaseId]);$('task-updated').textContent=readableUpdate(t);
  const form=$('task-form');for(const name of ['status','priority','notes'])form.elements[name].value=t[name];form.elements.dueDate.value=t.dueDate||'';
  $('assignee').replaceChildren(new Option('Unassigned',''));for(const m of model.members)$('assignee').add(new Option(m.name,m.id));form.elements.assigneeId.value=t.assigneeId||'';
  $('task-error').textContent='';$('conflict').hidden=true;$('save-task').disabled=false;showDialog('task-dialog');
}
function captureDraft(){
  if(!model.draft)return;const f=$('task-form');Object.assign(model.draft,{status:f.elements.status.value,priority:f.elements.priority.value,notes:f.elements.notes.value,dueDate:f.elements.dueDate.value||null,assigneeId:f.elements.assigneeId.value||null});
}
async function refresh(announce=false){
  if(!store||!session)return;
  try{await model.refresh(()=>store.loadTracker());if(!session)return;shared=true;render();$('sync-time').textContent=`Synced ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;if(announce)showToast('Shared progress refreshed.');}
  catch(e){if(e instanceof AccessError){clearPrivate();showToast(e.message);}else{$('sync-time').textContent='Sync failed · edits are not saved offline';if(announce)showToast(e.message);throw e;}}
}
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
  e.preventDefault();if(!shared||busy)return;captureDraft();const draft={...model.draft},version=model.expectedVersion;busy=true;
  $('task-error').textContent='';$('save-task').disabled=true;
  try{
    await store.saveTask(draft.id,version,draft);
    if(!session)return;$('task-dialog').close();showToast('Changes saved to the shared workspace.');
    try{await refresh();}catch{showToast('Changes saved. Refresh is temporarily unavailable.');}
  }catch(error){
    if(error instanceof AccessError){clearPrivate();showToast(error.message);}
    else if(error instanceof ConflictError){
      $('task-error').textContent=error.message;
      try{await refresh();if(!shared)return;const latest=model.tasks.find(t=>t.id===draft.id);$('conflict-values').textContent=`Status: ${labels[latest.status]}\nPriority: ${latest.priority}\nDue: ${latest.dueDate||'None'}\nAssigned: ${latest.assigneeId?userName(latest.assigneeId):'Unassigned'}\nNotes: ${latest.notes||'None'}\n${readableUpdate(latest)}`;$('conflict').hidden=false;$('save-task').disabled=true;}catch{$('task-error').textContent='Could not fetch the newer version. Your draft is retained; try again after reconnecting.';}
    }else $('task-error').textContent=error.message;
  }finally{busy=false;if($('conflict').hidden)$('save-task').disabled=false;}
};
$('rebase').onclick=()=>{model.rebase();$('conflict').hidden=true;$('task-error').textContent='Review your draft, then save to replace the latest task values.';$('save-task').disabled=false;};
$('account').onclick=async()=>{
  if(!store){showDialog('setup-dialog');return;}
  if(session){clearPrivate();try{await store.signOut();showToast('Signed out.');}catch{showToast('Shared data cleared. Reload the page to finish ending the session.');}}else showDialog('auth-dialog');
};
$('setup').onclick=()=>showDialog(store?'auth-dialog':'setup-dialog');
$('auth-form').onsubmit=async e=>{
  e.preventDefault();const f=e.currentTarget;await runButton(f.querySelector('[type=submit]'),async()=>{try{const result=await store.signIn(f.elements.email.value.trim(),f.elements.password.value);session=result.session;f.reset();$('auth-dialog').close();render();await refresh();}catch{$('auth-error').textContent='Sign-in failed or this account is not a team member. Check your details or ask the owner.';if(!shared){session=null;render();}}});
};
$('recover').onclick=async()=>{
  const email=$('auth-form').elements.email;if(!email.value||!email.checkValidity()){email.reportValidity();return;}
  await runButton($('recover'),async()=>{try{await store.requestRecovery(email.value.trim(),location.origin+location.pathname);$('auth-error').textContent='If this is an invited account, a recovery email will arrive shortly. Open it in this browser.';}catch{$('auth-error').textContent='Could not request recovery. Please try again later.';}});
};
$('password-form').onsubmit=async e=>{e.preventDefault();await runButton(e.currentTarget.querySelector('button'),async()=>{try{await store.setPassword($('password-form').elements.password.value);$('password-form').reset();$('password-dialog').close();showToast('Password saved.');await refresh();}catch(error){$('password-error').textContent=error.message;}});};
$('backup').onclick=()=>{if(shared)download(`puc5-backup-${localDate()}.json`,JSON.stringify({format:'puc5-tracker',version:1,exportedAt:new Date().toISOString(),tasks:exportTasks()},null,2),'application/json');};
$('csv').onclick=()=>{if(shared)download(`puc5-research-${localDate()}.csv`,toCsv(model.tasks),'text/csv;charset=utf-8');};
$('import').onclick=()=>{if(shared){$('import-error').textContent='';showDialog('import-dialog');}};
$('import-run').onclick=async()=>{
  if(!shared||busy)return;const file=$('import-file').files[0];$('import-error').textContent='';
  if(!file){$('import-error').textContent='Choose a JSON file first.';return;}
  if(file.size>1024*1024){$('import-error').textContent='File is too large. Choose a backup under 1 MB.';return;}
  busy=true;await runButton($('import-run'),async()=>{
    try{
      const parsed=JSON.parse(await file.text());let records;
      if($('import-kind').value==='legacy'){
        const legacy=migrateLegacy(parsed,ids);await refresh();if(!shared)return;
        records=legacy.map(x=>{const current=model.tasks.find(t=>t.id===x.id);return {id:x.id,version:current.version,...editableFields({...current,status:x.status})};});
      }else records=validateImport(parsed,ids);
      if(!confirm(`Replace the editable values of ${records.length} shared tasks? This affects all members. Version conflicts cancel the entire import.`))return;
      await store.restoreTasks(records);if(!session)return;$('import-dialog').close();$('import-file').value='';showToast(`${records.length} tasks imported successfully.`);await refresh();
    }catch(error){if(error instanceof AccessError){clearPrivate();showToast(error.message);}else $('import-error').textContent=error instanceof SyntaxError?'This file is not valid JSON.':error.message;}
    finally{busy=false;}
  });
};
$('refresh').onclick=()=>refresh(true).catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session)refresh().catch(()=>{});});
setInterval(()=>{if(!document.hidden&&session&&!busy)refresh().catch(()=>{});},30000);
async function boot(){
  render();
  const hash=new URLSearchParams(location.hash.slice(1)),query=new URLSearchParams(location.search);
  const invite=hash.get('type')==='invite';
  if(hash.has('error')||query.has('error')){showToast('This invitation or recovery link is invalid or expired. Ask for a new one.');history.replaceState(null,'',location.pathname);}
  try{validateConfig(CONFIG);}catch{return;}
  try{
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm');
    const client=createClient(CONFIG.url,CONFIG.publishableKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:true}});
    store=createStore(CONFIG,client);
    store.onAuthChange((event,newSession)=>{
      // Auth callbacks must return promptly; perform API work outside the SDK lock.
      setTimeout(()=>{
        if(event==='SIGNED_OUT'){clearPrivate();return;}
        session=newSession;
        if(event==='PASSWORD_RECOVERY'||(invite&&event==='SIGNED_IN')){showDialog('password-dialog');}
        if(newSession)refresh().catch(()=>{});
      },0);
    });
    session=await store.getSession();render();if(session){await refresh();if(invite)showDialog('password-dialog');}
  }catch{showToast('The sign-in service could not start. Check your connection or ask the owner to verify the project configuration.');}
}
boot();
