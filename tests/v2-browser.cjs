// Real-browser release verification. Run with Playwright and axe-core installed.
// Test fixtures only; never accesses production or a user's browser profile.
const {chromium,webkit}=require('playwright');
const axe=require('axe-core');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..');
const out=process.env.BROWSER_EVIDENCE_DIR||'/tmp/laced-browser-evidence';
const stages=['cluster','imagine','bloom','ignite','ascend'];
const results=[];let upgradeV2=false,server,base;
const legacy={version:1,activeId:'v1-original',phase:'seed',theme:'corkboard',projects:[{id:'v1-original',title:'V1 fixture',stages:{collect:'  fragments\n',ideate:'tension',seed:'concept original',start:'[Chorus]\nKeep every line',iterate:'revision'},scratch:'scratch original',words:['twilight','stone'],palette:{Custom:['unusual','tender']},createdAt:100,updatedAt:200}]};
const state=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('laced-notes-v2')));
const active=data=>data.projects.find(p=>p.id===data.activeId);
async function tool(p,id){const button=p.locator(`[data-tool="${id}"]:visible`).first();assert.ok(await button.count(),`No visible navigation to ${id}`);await button.click();await p.locator('#v2-tool-title').waitFor({state:'visible'});}
async function closeTool(p){if(await p.locator('#v2-tool').isVisible())await p.locator('[data-act="close-tool"]').click();}
async function select(p,start,end){const e=p.locator('#v2-editor');await e.focus();await e.press('Control+Home');for(let i=0;i<start;i++)await e.press('ArrowRight');for(let i=start;i<end;i++)await e.press('Shift+ArrowRight');assert.deepEqual(await e.evaluate(e=>[e.selectionStart,e.selectionEnd]),[start,end]);}
async function importFile(p,file){const pending=p.waitForEvent('filechooser');await p.getByText('Import JSON',{exact:true}).click();await (await pending).setFiles(file);}
async function saveDownload(p,button,name){const pending=p.waitForEvent('download');await button.click();const d=await pending;const file=path.join(out,name);await d.saveAs(file);return file;}
async function withoutServer(fn){const port=server.address().port;await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});try{await new Promise((resolve,reject)=>{const r=http.get(base,()=>reject(Error('Test server was still reachable')));r.on('error',resolve);});return await fn();}finally{await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));}}
async function open(browser,options={}){const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true,...options});const p=await context.newPage();p.setDefaultTimeout(12000);const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('dialog',d=>d.accept(d.type()==='prompt'?'Browser saved passage':undefined));await p.goto(base+'/LACED-notes/');return {context,p,errors};}
async function check(engine,name,fn){let x;try{x=await fn();results.push({engine,name,status:'PASS',...x});console.log(`PASS ${engine}: ${name}`);}catch(e){results.push({engine,name,status:'FAIL',error:e.message});console.log(`FAIL ${engine}: ${name}: ${e.message}`);}finally{await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));}}
async function using(browser,fn,options){const x=await open(browser,options);try{return await fn(x);}catch(e){await x.p.screenshot({path:path.join(out,`${browser.browserType().name()}-failure-${results.length}.png`)}).catch(()=>{});throw e;}finally{await x.context.close();}}
(async()=>{
await fs.mkdir(out,{recursive:true});
server=http.createServer(async(req,res)=>{try{
const parsed=new URL(req.url,'http://localhost');const isUpgrade=parsed.pathname.startsWith('/upgrade/LACED-notes/');let relative=parsed.pathname.replace(isUpgrade?'/upgrade/LACED-notes/':'/LACED-notes/','')||'index.html';
if(!parsed.pathname.startsWith('/LACED-notes/')&&!isUpgrade){res.writeHead(404);res.end();return;}
if(relative.includes('..'))throw Error('Bad path');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const data=isUpgrade&&!upgradeV2?execFileSync('git',['show',`d7ec4f507f3014707a71d1a14e5749cb6cd8ca95:${relative}`],{cwd:repo,stdio:['ignore','pipe','ignore']}):await fs.readFile(path.join(repo,relative));
res.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
}catch(e){res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
for(const [engine,type]of Object.entries({chromium,webkit})){
let browser;try{browser=await type.launch({headless:true});}catch(e){results.push({engine,name:'engine launch',status:'NOT VERIFIED',error:e.message});continue;}
results.push({engine,name:'engine version',status:'PASS',version:browser.version(),url:base+'/LACED-notes/',commit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim()});
await check(engine,'New Spark, immediate keyboard writing, five stages, independent Blueprints and reload',()=>using(browser,async({p,errors})=>{
assert.match(await p.title(),/Laced Notes/i);assert.ok(await p.locator('#v2-editor').isVisible());
await p.locator('.v2-head [data-act="new-project"]').click();assert.equal(await p.locator('#v2-editor').evaluate(e=>e===document.activeElement),true);
await p.keyboard.type('Immediate draft');assert.equal(await p.locator('#v2-editor').inputValue(),'Immediate draft');await p.locator('#v2-name').fill('First Blueprint');
for(const s of stages){await p.locator(`[data-stage="${s}"]`).click();await p.locator('#v2-editor').fill(`${s}: independent draft\n  second line`);}
const first=active(await state(p)).id;
for(const s of stages){await p.locator(`[data-stage="${s}"]`).click();assert.equal(await p.locator('#v2-editor').inputValue(),`${s}: independent draft\n  second line`);}
await p.locator('.v2-head [data-act="new-project"]').click();await p.locator('#v2-editor').fill('Second Blueprint only');
await tool(p,'blueprints');await p.locator(`[data-project-id="${first}"]`).click();assert.equal(await p.locator('#v2-editor').inputValue(),'cluster: independent draft\n  second line');
await p.reload();assert.equal(await p.locator('#v2-editor').inputValue(),'cluster: independent draft\n  second line');assert.deepEqual(errors,[]);
return {projects:(await state(p)).projects.length};}));
await check(engine,'Tool navigation, selection preservation, vocabulary and repeated Crosswire insertion',()=>using(browser,async({p,errors})=>{
await closeTool(p);await p.locator('#v2-editor').fill('one two three');await select(p,4,7);
for(const id of ['wordverse','crosswire','constellations','outtakes']){await tool(p,id);assert.deepEqual(await p.locator('#v2-editor').evaluate(e=>[e.selectionStart,e.selectionEnd]),[4,7]);await closeTool(p);}
await tool(p,'wordverse');await p.locator('#v2-word-new').fill('bright');await p.locator('[data-act="add-word"]').click();await p.locator('[data-word-insert="0"]').click();assert.equal(await p.locator('#v2-editor').inputValue(),'one bright three');
await tool(p,'crosswire');await p.locator('#v2-exp-result').fill('!');await p.locator('[data-act="insert-result"]').click();await p.locator('[data-act="insert-result"]').click();assert.equal(await p.locator('#v2-editor').inputValue(),'one bright!! three');assert.deepEqual(errors,[]);
}));
await check(engine,'Selected Outtake compare and restore preserve unrelated text and recover revised draft',()=>using(browser,async({p})=>{
await closeTool(p);const old='VERSE\nold chorus\nOUTRO',changed='VERSE\nlonger revised chorus\nOUTRO';await p.locator('#v2-editor').fill(old);await select(p,6,16);await p.locator('.v2-writing [data-act="save-outtake"]').click();
let data=await state(p);const id=active(data).outtakes[0].id;assert.equal(active(data).outtakes[0].text,'old chorus');
await p.locator('#v2-editor').fill(changed);await tool(p,'outtakes');await p.locator(`[data-out-compare="${id}"]`).click();const comparison=await p.locator('.v2-compare textarea').allTextContents();assert.deepEqual(comparison,['old chorus',changed]);
await p.locator(`[data-out-restore="${id}"]`).click();assert.equal(await p.locator('#v2-editor').inputValue(),old);data=await state(p);const safety=active(data).outtakes.at(-1);assert.equal(safety.text,changed);assert.equal(safety.type,'restore-safety');
await p.locator(`[data-out-restore="${safety.id}"]`).click();assert.equal(await p.locator('#v2-editor').inputValue(),changed);
}));
await check(engine,'Real JSON download and import into isolated browser profile',()=>using(browser,async({p})=>{
await closeTool(p);await p.locator('#v2-editor').fill('  portable draft\n');await tool(p,'wordverse');await p.locator('#v2-word-new').fill('portable');await p.locator('[data-act="add-word"]').click();await tool(p,'circuits');
const file=await saveDownload(p,p.locator('[data-act="backup-json"]'),`${engine}-backup.json`);const data=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(active(data).stages.imagine,'  portable draft\n');assert.equal(data.version,2);
const target=await open(browser);try{await tool(target.p,'circuits');await importFile(target.p,file);await target.p.locator('#v2-toast').filter({hasText:'Imported'}).waitFor({state:'visible'});const imported=active(await state(target.p));assert.deepEqual(imported.stages,active(data).stages);assert.deepEqual(imported.words,active(data).words);assert.deepEqual(imported.palette,active(data).palette);await target.p.reload();assert.equal(await target.p.locator('#v2-editor').inputValue(),'  portable draft\n');}finally{await target.context.close();}
return {backupBytes:(await fs.stat(file)).size};
}));
await check(engine,'V1 backup import preserves every field without changing originals',()=>using(browser,async({p})=>{
await tool(p,'circuits');await importFile(p,{name:'v1-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});await p.locator('#v2-toast').filter({hasText:'Imported'}).waitFor({state:'visible'});const data=await state(p),q=active(data),v=legacy.projects[0];assert.equal(data.projects.length,2);assert.equal(q.stages.cluster,v.stages.collect);assert.equal(q.stages.imagine,v.stages.ideate);assert.equal(q.stages.bloom,'');assert.equal(q.stages.ignite,v.stages.start);assert.equal(q.stages.ascend,v.stages.iterate);assert.equal(q.legacySeed,v.stages.seed);assert.equal(q.legacyScratch,v.scratch);assert.deepEqual(q.words,v.words);assert.deepEqual(q.palette,v.palette);
}));
await check(engine,'Invalid file import is atomic and leaves current writing intact',()=>using(browser,async({p})=>{
await closeTool(p);await p.locator('#v2-editor').fill('Do not lose this');const before=await state(p);await tool(p,'circuits');await importFile(p,{name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{bad json')});await p.locator('#v2-toast').filter({hasText:'Import failed'}).waitFor({state:'visible'});assert.deepEqual((await state(p)).projects,before.projects);
}));
await check(engine,'Injected storage write failure stays visible and unsaved writing downloads',()=>using(browser,async({p})=>{
await closeTool(p);const before=await state(p);await p.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='laced-notes-v2')throw new DOMException('Injected quota failure','QuotaExceededError');return original.call(this,k,v);};});await p.locator('#v2-editor').fill('Unsaved but exportable');assert.match(await p.locator('#v2-save').innerText(),/Save failed/);await tool(p,'circuits');const file=await saveDownload(p,p.locator('[data-act="backup-json"]'),`${engine}-unsaved-backup.json`);const data=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(active(data).stages.imagine,'Unsaved but exportable');assert.deepEqual((await state(p)).projects,before.projects);
}));
await check(engine,'Corrupt storage recovery preserves raw bytes and downloads original storage',async()=>{
const context=await browser.newContext({acceptDownloads:true});await context.addInitScript(()=>localStorage.setItem('laced-notes-v2','{unrecoverable-json'));const p=await context.newPage();try{await p.goto(base+'/LACED-notes/');await p.getByRole('heading',{name:'Writing recovery required'}).waitFor();const file=await saveDownload(p,p.getByRole('button',{name:'Download original storage'}),`${engine}-recovery.json`);assert.equal(JSON.parse(await fs.readFile(file,'utf8')).v2,'{unrecoverable-json');assert.equal(await p.evaluate(()=>localStorage.getItem('laced-notes-v2')),'{unrecoverable-json');}finally{await context.close();}
});
await check(engine,'All Wardrobe themes preserve writing and measure editor contrast',()=>using(browser,async({p})=>{
await closeTool(p);await p.locator('#v2-editor').fill('Theme invariant');await tool(p,'calibration');await p.locator('[data-act="open-wardrobe"]').click();const ids=await p.locator('[data-theme-id]').evaluateAll(es=>es.map(e=>e.dataset.themeId));const colors=[];
for(const id of ids){await p.locator(`[data-theme-id="${id}"]`).click();assert.equal(await p.locator('#v2-editor').inputValue(),'Theme invariant');colors.push(await p.locator('#v2-editor').evaluate(e=>({theme:e.closest('#laced-v2').dataset.theme,color:getComputedStyle(e).color,background:getComputedStyle(e.closest('.v2-editor-card')).backgroundColor,fontSize:getComputedStyle(e).fontSize})));}
return {colors};
}));
for(const [width,height]of [[768,1024],[820,1180],[1024,768],[1180,820],[1440,900],[390,844]]){
await check(engine,`Responsive viewport ${width}x${height}`,()=>using(browser,async({p})=>{
await closeTool(p);await p.locator('#v2-editor').fill('Readable canvas\n'+Array.from({length:45},(_,i)=>`Line ${i}: test keyboard and scrolling`).join('\n'));await p.screenshot({path:path.join(out,`${engine}-${width}x${height}-canvas.png`)});
const measurement=await p.evaluate(()=>({viewport:[innerWidth,innerHeight],documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,editor:(()=>{const r=document.querySelector('#v2-editor').getBoundingClientRect(),s=getComputedStyle(document.querySelector('#v2-editor'));return {x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize,lineHeight:s.lineHeight};})(),targets:[...document.querySelectorAll('#laced-v2 button')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {name:e.textContent.trim(),width:r.width,height:r.height};})}));
assert.ok(measurement.documentWidth<=width+1,`Document overflows ${measurement.documentWidth-width}px`);assert.ok(measurement.editor.width>=250,`Editor width ${measurement.editor.width}`);
for(const id of ['wordverse','crosswire','constellations','outtakes']){await tool(p,id);assert.ok(await p.locator('#v2-tool').isVisible());await closeTool(p);}
await p.locator('#v2-editor').focus();await p.locator('#v2-editor').press('Control+End');await p.keyboard.type('\nKeyboard tail');assert.ok((await p.locator('#v2-editor').inputValue()).endsWith('Keyboard tail'));
await tool(p,'outtakes');await p.screenshot({path:path.join(out,`${engine}-${width}x${height}-tool.png`)});return {measurement};
},{viewport:{width,height}}));}
await check(engine,'Accessibility audit of editor and all contextual modules',()=>using(browser,async({p})=>{
await closeTool(p);await p.addScriptTag({content:axe.source});const audits=[];for(const id of [null,'wordverse','crosswire','constellations','outtakes','circuits','calibration']){
if(id)await tool(p,id);const audit=await p.evaluate(async()=>{const r=await axe.run('#laced-v2',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,impact:v.impact}))};});audits.push({tool:id||'editor',...audit});if(id)await closeTool(p);}
await fs.writeFile(path.join(out,`${engine}-accessibility.json`),JSON.stringify(audits,null,2));const violations=audits.flatMap(a=>a.violations.map(v=>({tool:a.tool,...v})));assert.deepEqual(violations,[]);return {audits};
}));
await check(engine,'Reduced-motion preference disables transitions',()=>using(browser,async({p})=>{
await p.emulateMedia({reducedMotion:'reduce'});const durations=await p.locator('#laced-v2 button').evaluateAll(es=>es.map(e=>getComputedStyle(e).transitionDuration));assert.ok(durations.every(d=>d.split(',').every(x=>parseFloat(x)===0)));return {preference:'reduce'};
}));
await check(engine,'Service-worker scope, subpath cache and offline reload preserve writing',()=>using(browser,async({p,context})=>{
await closeTool(p);await p.locator('#v2-editor').fill('Offline preserved draft');await p.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
const registration=await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {scope:r.scope,script:r.active.scriptURL,caches:await caches.keys()};});assert.ok(registration.scope.endsWith('/LACED-notes/'));assert.ok(registration.script.endsWith('/LACED-notes/sw.js'));
await withoutServer(async()=>{await p.reload();assert.equal(await p.locator('#v2-editor').inputValue(),'Offline preserved draft');await p.locator('#v2-editor').fill('Edited offline');await p.reload();assert.equal(await p.locator('#v2-editor').inputValue(),'Edited offline');await p.screenshot({path:path.join(out,`${engine}-offline.png`)});});return {registration,offlineMethod:'HTTP server stopped; network refusal asserted'};
}));
await check(engine,'Actual V1 service worker upgrades to V2 without mixed assets or lost writing',async()=>{
upgradeV2=false;const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});const p=await context.newPage();p.setDefaultTimeout(20000);try{
await p.goto(base+'/upgrade/LACED-notes/');await p.locator('#phaseEditor').fill('Actual V1 writer draft');await p.locator('#titleInput').fill('V1 upgrade fixture');
await p.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
await p.locator('#phaseEditor').press('Control+s');await p.locator('#opsBtn').click();const v1File=await saveDownload(p,p.locator('#popAnchor [data-action=export]'),`${engine}-real-v1-backup.json`);const v1Backup=JSON.parse(await fs.readFile(v1File,'utf8'));assert.equal(v1Backup.version,1);assert.equal(v1Backup.projects[0].stages.ideate,'Actual V1 writer draft');const old=await p.evaluate(()=>localStorage.getItem('laced-notes-v1'));assert.equal(JSON.parse(old).projects[0].stages.ideate,'Actual V1 writer draft');
upgradeV2=true;await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();const change=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));await r.update();await change;});await p.reload();await p.locator('#v2-editor').waitFor({state:'visible'});assert.equal(await p.locator('#v2-editor').inputValue(),'Actual V1 writer draft');assert.equal(await p.evaluate(()=>localStorage.getItem('laced-notes-v1')),old);
const keys=await p.evaluate(()=>caches.keys());assert.ok(keys.some(k=>k.includes('v2-')));assert.ok(keys.every(k=>!k.startsWith('laced-notes-')||k.includes('v2-')));
await withoutServer(async()=>{await p.reload();assert.equal(await p.locator('#v2-editor').inputValue(),'Actual V1 writer draft');});const target=await open(browser);try{await tool(target.p,'circuits');await importFile(target.p,v1File);await target.p.locator('#v2-toast').filter({hasText:'Imported'}).waitFor({state:'visible'});assert.equal(await target.p.locator('#v2-editor').inputValue(),'Actual V1 writer draft');assert.deepEqual(active(await state(target.p)).palette,v1Backup.projects[0].palette);}finally{await target.context.close();}
return {cacheKeys:keys,offlineMethod:'HTTP server stopped; network refusal asserted',actualV1BackupImported:true};
}finally{await context.close();upgradeV2=false;}
});
await browser.close();
}
await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));
console.log('BROWSER_RESULTS '+JSON.stringify(results));
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
})().catch(async e=>{console.error(e);if(server)server.close();process.exitCode=1;});
