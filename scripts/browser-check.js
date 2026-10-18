import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH,headless:true}:{headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
 await fs.mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
 await page.goto(base);await page.waitForFunction(()=>document.getElementById('percent').textContent==='0%');
 assert.equal(await page.locator('.task-row').count(),74);assert.equal(await page.locator('.phase').count(),9);assert.equal(await page.locator('#account,#auth-dialog,#setup-dialog').count(),0);
 assert.equal(await page.locator('.phase-week').first().innerText(),'W1\u20136');assert.equal(await page.locator('.task-title').first().isEnabled(),true);
 await page.getByRole('button',{name:/^Mark complete:/}).first().click();await page.waitForFunction(()=>document.getElementById('stat-completed').textContent==='1');
 await page.reload();await page.waitForFunction(()=>document.getElementById('stat-completed').textContent==='1');
 await page.locator('.task-title').first().click();await page.locator('#task-form [name=status]').selectOption('in-progress');await page.locator('#task-form [name=priority]').selectOption('high');await page.locator('#task-form [name=dueDate]').fill('2020-01-01');await page.locator('#task-form [name=assigneeId]').fill('Tariq Sir');await page.locator('#task-form [name=notes]').fill('<img src=x onerror=alert(1)> Measurements');await page.locator('#save-task').click();await page.waitForFunction(()=>!document.getElementById('task-dialog').open);
 assert.equal(await page.locator('#stat-in-progress').innerText(),'1');assert.equal(await page.locator('#stat-overdue').innerText(),'1');assert.equal(await page.locator('.task-row img').count(),0);
 await page.locator('#search').fill('Measurements');assert.equal(await page.locator('.task-row').count(),1);await page.locator('#clear-filters').click();
 await page.locator('#priority-filter').selectOption('high');assert.equal(await page.locator('.task-row').count(),1);await page.locator('#clear-filters').click();
 // Two real tabs share localStorage, but keep their unsaved drafts separately.
 await page.locator('.task-title').first().click();await page.locator('#task-form [name=notes]').fill('Draft retained across tabs');
 const otherTab=await context.newPage();await otherTab.goto(base);await otherTab.waitForFunction(()=>document.getElementById('stat-in-progress').textContent==='1');await otherTab.locator('.task-title').first().click();await otherTab.locator('#task-form [name=notes]').fill('Saved in another tab');await otherTab.locator('#save-task').click();await otherTab.waitForFunction(()=>!document.getElementById('task-dialog').open);
 assert.equal(await page.locator('#task-form [name=notes]').inputValue(),'Draft retained across tabs');await page.locator('#save-task').click();await page.locator('#conflict').waitFor({state:'visible'});assert.match(await page.locator('#conflict-values').innerText(),/Saved in another tab/);await page.locator('#rebase').click();await page.locator('#save-task').click();await page.waitForFunction(()=>!document.getElementById('task-dialog').open);await otherTab.close();
 const pendingDownload=page.waitForEvent('download');await page.locator('#backup').click();const download=await pendingDownload;const backup=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(backup.tasks.length,74);assert.equal(backup.tasks[0].notes,'Draft retained across tabs');
 const otherContext=await browser.newContext(),second=await otherContext.newPage();await second.goto(base);await second.waitForFunction(()=>document.getElementById('percent').textContent==='0%');
 await second.locator('#import').click();await second.locator('#import-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});second.once('dialog',d=>d.accept());await second.locator('#import-run').click();await second.waitForFunction(()=>!document.getElementById('import-dialog').open);assert.equal(await second.locator('#stat-in-progress').innerText(),'1');
 await second.locator('#import').click();await second.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await second.locator('#import-run').click();await second.waitForFunction(()=>document.getElementById('import-error').textContent.includes('not valid JSON'));await second.keyboard.press('Escape');assert.equal(await second.locator('#stat-in-progress').innerText(),'1');
 await page.locator('#collapse').click();assert.equal(await page.locator('.phase[open]').count(),0);await page.locator('#collapse').click();assert.equal(await page.locator('.phase[open]').count(),9);
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/desktop-local.png',import.meta.url))});
 await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.locator('#theme').click();await page.setViewportSize({width:360,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:fileURLToPath(new URL('../artifacts/mobile-local.png',import.meta.url))});
 const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Blocked');}}));const blockedPage=await blocked.newPage();await blockedPage.goto(base);await blockedPage.waitForFunction(()=>document.getElementById('notice-title').textContent==='Browser storage unavailable');assert.equal(await blockedPage.locator('.task-title').first().isEnabled(),false);
 const corrupted=await browser.newContext();await corrupted.addInitScript(()=>localStorage.setItem('puc5tracker.local.v1','{bad'));const corruptPage=await corrupted.newPage();await corruptPage.goto(base);await corruptPage.waitForFunction(()=>document.getElementById('notice-title').textContent==='Browser storage unavailable');const recovery=corruptPage.waitForEvent('download');await corruptPage.locator('#backup').click();assert.equal(await fs.readFile(await (await recovery).path(),'utf8'),'{bad');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('Browser checks passed: no sign-in or external requests; click to complete; persisted reloads; notes, assignees and deadlines; two-tab conflict/draft retention; backups; import to another browser; malformed imports; themes; collapse; mobile layout; blocked/corrupt storage recovery.');
}finally{await browser.close();}
