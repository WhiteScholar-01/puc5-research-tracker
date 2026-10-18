import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {TASKS} from '../site/catalog.js';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH,headless:true}:{headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const failures=[];page.on('pageerror',e=>failures.push(e.message));
await fs.mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
await page.goto(base);await page.waitForSelector('.phase');
assert.equal(await page.locator('.task-row').count(),74);assert.equal(await page.locator('.phase').count(),9);
assert.equal(await page.locator('#account').innerText(),'Member sign in \u2197');
assert.equal(await page.locator('#percent').innerText(),'\u2014');
assert.equal(await page.locator('.phase-week').first().innerText(),'W1\u20136');
await page.screenshot({path:fileURLToPath(new URL('../artifacts/desktop.png',import.meta.url)),fullPage:false});
await page.locator('#search').fill('GATE A:');assert.equal(await page.locator('.task-row').count(),1);
await page.locator('#clear-filters').click();assert.equal(await page.locator('.task-row').count(),74);
await page.locator('#collapse').click();assert.equal(await page.locator('.phase[open]').count(),0);
await page.locator('#collapse').click();assert.equal(await page.locator('.phase[open]').count(),9);
await page.locator('#setup').click();assert.equal(await page.locator('#setup-dialog').evaluate(e=>e.open),true);await page.keyboard.press('Escape');
await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
await page.screenshot({path:fileURLToPath(new URL('../artifacts/dark.png',import.meta.url))});
await page.locator('#theme').click();await page.setViewportSize({width:360,height:900});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile must not overflow');
await page.screenshot({path:fileURLToPath(new URL('../artifacts/mobile.png',import.meta.url))});
await page.goto('about:blank');await page.goto(base+'/#error=access_denied&error_description=expired');await page.locator('#toast').waitFor({state:'visible'});assert.match(await page.locator('#toast').innerText(),/invalid or expired/);
// Replace the external SDK at its network boundary for browser behavior checks.
// Database permissions are exercised separately against PostgreSQL in database.test.js.
await page.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const CONFIG={url:'https://example.supabase.co',publishableKey:'sb_publishable_fixture'};"}));
const rows=TASKS.map(t=>({id:t.id,status:'pending',priority:'normal',due_date:null,notes:'',assignee_id:null,version:0,updated_at:null,updated_by:null}));
const sdk=`export function createClient(){
 window.fixture={rows:${JSON.stringify(rows)},conflict:false,fail:false};
 let session=null;const user={id:'11111111-1111-4111-8111-111111111111'};
 return {auth:{getUser:async()=>({data:{user},error:null}),getSession:async()=>({data:{session},error:null}),onAuthStateChange:()=>{},signInWithPassword:async()=>{session={user};return {data:{session},error:null};},signOut:async()=>{session=null;return {error:null};},resetPasswordForEmail:async()=>({data:{},error:null}),updateUser:async()=>({data:{user},error:null})},rpc:async(name,args)=>{
 if(window.fixture.fail) return {data:null,error:{message:'offline'}};
 if(name==='load_tracker')return {data:{tasks:window.fixture.rows,members:[{user_id:user.id,display_name:'Research member'}]},error:null};
 if(name==='save_task'){
 if(window.fixture.delay)await new Promise(resolve=>window.fixture.release=resolve);
 const row=window.fixture.rows.find(r=>r.id===args.p_id);
 if(window.fixture.conflict){row.version++;row.notes='Another member note';window.fixture.conflict=false;return {data:null,error:{code:'40001'}};}
 if(row.version!==args.p_expected_version)return {data:null,error:{code:'40001'}};
 Object.assign(row,{status:args.p_fields.status,priority:args.p_fields.priority,notes:args.p_fields.notes,due_date:args.p_fields.dueDate,assignee_id:args.p_fields.assigneeId,version:row.version+1,updated_at:new Date().toISOString(),updated_by:user.id});return {data:[row],error:null};
 }return {data:[],error:null};}};}`;
await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm',r=>r.fulfill({contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:sdk}));
await page.goto(base);await page.waitForFunction(()=>document.getElementById('notice-title').textContent==='Invited members only');
await page.locator('#account').click();await page.locator('#auth-form [name=email]').fill('member@example.test');await page.locator('#auth-form [name=password]').fill('long-test-password');await page.locator('#auth-form [type=submit]').click();await page.waitForFunction(()=>document.getElementById('notice-title').textContent==='Team workspace connected');
await page.locator('.task-title').first().click();await page.locator('#task-form [name=notes]').fill('Draft being saved');
await page.evaluate(()=>window.fixture.delay=true);await page.locator('#save-task').click();
assert.equal(await page.locator('#task-form [name=notes]').isDisabled(),true,'editor freezes while its snapshot is saving');
assert.equal(await page.locator('#task-dialog [data-close]').first().isDisabled(),true,'close must stay disabled during save');
await page.keyboard.press('Escape');assert.equal(await page.locator('#task-dialog').evaluate(e=>e.open),true);
await page.evaluate(()=>{window.fixture.delay=false;window.fixture.release();});await page.waitForFunction(()=>!document.getElementById('task-dialog').open);
await page.locator('.task-title').first().click();await page.locator('#task-form [name=notes]').fill('<img src=x onerror=alert(1)> Measurements');
await page.evaluate(()=>window.fixture.fail=true);await page.locator('#save-task').click();await page.waitForFunction(()=>document.getElementById('task-error').textContent.length>0);assert.match(await page.locator('#task-form [name=notes]').inputValue(),/Measurements/);
await page.evaluate(()=>{window.fixture.fail=false;window.fixture.conflict=true;});await page.locator('#save-task').click();await page.locator('#conflict').waitFor({state:'visible'});assert.match(await page.locator('#conflict-values').innerText(),/Another member note/);assert.match(await page.locator('#task-form [name=notes]').inputValue(),/Measurements/);
await page.locator('#rebase').click();await page.locator('#task-form [name=status]').selectOption('completed');await page.locator('#save-task').click();await page.waitForFunction(()=>!document.getElementById('task-dialog').open);assert.equal(await page.locator('#stat-completed').innerText(),'1');assert.equal(await page.locator('.task-row img').count(),0);
await page.locator('#search').fill('Measurements');assert.equal(await page.locator('.task-row').count(),1);await page.locator('#clear-filters').click();
const downloadPromise=page.waitForEvent('download');await page.locator('#backup').click();const download=await downloadPromise;const path=await download.path();const data=JSON.parse(await fs.readFile(path,'utf8'));assert.equal(data.tasks.length,74);assert.equal(data.tasks[0].status,'completed');
await page.locator('#import').click();await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await page.locator('#import-run').click();await page.waitForFunction(()=>document.getElementById('import-error').textContent.includes('not valid JSON'));await page.keyboard.press('Escape');
await page.locator('#account').click();await page.waitForFunction(()=>document.getElementById('stat-completed').textContent==='—');assert.equal(await page.locator('.task-meta').filter({hasText:'Notes added'}).count(),0);
assert.deepEqual(failures,[]);console.log('Browser checks passed: preview, filters, collapse, themes, 360px layout, recovery errors, sign-in, failed save, conflict reconciliation, XSS text, backup, invalid import, sign-out.');
await browser.close();
