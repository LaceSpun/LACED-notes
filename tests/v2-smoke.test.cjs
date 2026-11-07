// Run with: node --test tests/v2-smoke.test.cjs
// No third-party test runner or network access required.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const source=readFileSync(process.env.V2_TEST_SOURCE||require('node:path').join(__dirname,'../studio-v2.js'),'utf8');
// A deliberately limited DOM/storage simulation, not a rendered browser test.
const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
let nextId=0;
class El{
  constructor(registry={}){this.registry=registry;this.dataset={};this.value='';this.textContent='';this.scrollTop=0;this.classList={add(){},remove(){},toggle(){}};this.selectionStart=0;this.selectionEnd=0;this.listeners={};}
  set innerHTML(x){this._html=x;
    for(const m of x.matchAll(/<(input|textarea|span)[^>]*\bid="([^"]+)"[^>]*>/g)){
      const el=new El(this.registry);el.id=m[2];
      if(m[1]==='textarea')el.value=decode(x.slice(m.index+m[0].length).split('</textarea>')[0]);
      if(m[1]==='input')el.value=decode(m[0].match(/\bvalue="([^"]*)"/)?.[1]||'');
      if(m[1]==='span')el.textContent=decode(x.slice(m.index+m[0].length).split('</span>')[0]);
      this.registry['#'+m[2]]=el;
    }
  }get innerHTML(){return this._html;}
  addEventListener(name,fn){this.listeners[name]=fn;}
  querySelector(sel){return this.registry[sel]||(this.registry[sel]=new El(this.registry));}
  querySelectorAll(){return [];}setAttribute(){}appendChild(el){this.child=el;}
  focus(){}setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}click(){}remove(){}
}
function run(v1,options={}){
 const files=options.files||new Map(v1===undefined?[]:[['laced-notes-v1',JSON.stringify(v1)]]);
 if(options.v2!==undefined)files.set('laced-notes-v2',typeof options.v2==='string'?options.v2:JSON.stringify(options.v2));
 let fail=options.fail||false,unavailable=options.unavailable||false;
 const localStorage={getItem:key=>{if(unavailable)throw Error('Storage unavailable');return files.get(key)??null;},setItem:(key,val)=>{if(fail)throw Error('Quota exceeded');files.set(key,val)}};
 const registry={},body=new El(registry),docListeners={},winListeners={},document={body,createElement:()=>new El(registry),addEventListener:(name,fn)=>docListeners[name]=fn};
 let prompts=0,confirmation=true;const downloads=[];
 const context={
   document,window:{innerWidth:1100,addEventListener:(name,fn)=>winListeners[name]=fn},localStorage,
   navigator:{clipboard:{writeText:async()=>{}}},prompt:()=>{prompts++;return 'Named alternative';},confirm:()=>confirmation,
   crypto:{randomUUID:()=>('id-'+(++nextId))},
   setTimeout:()=>0,clearTimeout(){},Date,JSON,Blob,URL:{createObjectURL:b=>{downloads.push(b);return 'blob:test';},revokeObjectURL(){}},console
 };
 runInNewContext(options.source||source,context);
 const root=body.child;
 const click=dataset=>root.listeners.click({target:{closest:()=>({dataset})}});
 const state=()=>JSON.parse(files.get('laced-notes-v2'));
 const input=(id,value)=>{let t=root.querySelector('#'+id);t.id=id;t.value=value;root.listeners.input({target:t});};
 const select=(a,b)=>{const t=root.querySelector('#v2-editor');t.setSelectionRange(a,b);root.listeners.select({target:t});};
 const importData=async data=>root.listeners.change({target:{id:'v2-import',files:[{size:100,text:async()=>JSON.stringify(data)}]}});
 return {files,root,click,state,input,select,importData,downloads,docListeners,winListeners,setFail:v=>fail=v,setConfirm:v=>confirmation=v,getPrompts:()=>prompts};
}
function legacy(){return {version:1,activeId:'original-id',phase:'seed',theme:'corkboard',projects:[{id:'original-id',title:'Existing work',stages:{collect:'fragment',ideate:'contradiction',seed:'concept to preserve',start:'chorus to protect',iterate:'revision'},scratch:'loose note',words:['twilight'],palette:{'Custom':['unusual']}}]};}
test('loads V1 without overwriting original storage',()=>{
 const old=legacy(),app=run(old),v=app.state();
 assert.equal(app.files.get('laced-notes-v1'),JSON.stringify(old));
 assert.equal(v.projects[0].id,'original-id');
 assert.equal(v.projects[0].stages.cluster,'fragment');
 assert.equal(v.projects[0].stages.imagine,'contradiction');
 assert.equal(v.projects[0].stages.ignite,'chorus to protect');
 assert.equal(v.projects[0].legacySeed,'concept to preserve');
 assert.equal(v.projects[0].stages.bloom,'');
 assert.equal(v.projects[0].legacyScratch,'loose note');
 assert.deepEqual(Array.from(v.projects[0].words),['twilight']);
 assert.deepEqual(Array.from(v.projects[0].palette.Custom),['unusual']);
});
test('Outtakes are separate from working draft',()=>{
 const app=run(legacy());
 app.click({act:'save-outtake'});
 assert.equal(app.state().projects[0].outtakes.length,1);
 assert.equal(app.state().projects[0].outtakes[0].text,'contradiction');
 assert.equal(app.state().projects[0].stages.imagine,'contradiction');
});
test('Crosswire diagnosis is deterministic and can be preserved',()=>{
 const app=run(legacy());app.click({tool:'crosswire'});app.click({expTab:'diagnose'});
 app.root.querySelector('#v2-exp-a').value='You run\nYou hide\nYou run again';
 app.click({act:'run-diagnostic'});
 assert.match(app.root.querySelector('#v2-exp-result').value,/Lines with text: 3/);
 app.click({act:'save-experiment'});
 assert.equal(app.state().projects[0].outtakes[0].type,'crosswire');
});
test('New Spark skips naming questions and preserves previous project',()=>{
 const app=run(legacy()),before=app.getPrompts();
 app.click({act:'new-project'});
 assert.equal(app.getPrompts(),before);
 assert.equal(app.state().projects.length,2);
 assert.equal(app.state().phase,'cluster');
 assert.equal(app.state().projects[0].stages.ignite,'chorus to protect');
});
test('Wardrobe selection persists to V2 state',()=>{
 const app=run(legacy());app.click({themeId:'midnight'});
 assert.equal(app.state().theme,'midnight');
});
test('A blank legacy scratch field is not made into an Outtake',()=>{
 const old=legacy();old.projects[0].scratch='';const app=run(old);
 assert.equal(app.state().projects[0].outtakes.length,0);
});

test('corrupt, unsupported, empty or malformed V2 stays byte-for-byte intact',()=>{
 for(const raw of ['{broken','null',JSON.stringify({version:3,projects:[]}),JSON.stringify({version:2,projects:[]})]){
 const app=run(legacy(),{v2:raw});assert.equal(app.files.get('laced-notes-v2'),raw);assert.match(app.root.innerHTML,/Writing recovery required/);
 }
});
test('malformed Constellations triggers recovery instead of filtering away data',()=>{
 const state=run(legacy()).state();state.projects[0].palette={broken:'precious unknown material'};
 const raw=JSON.stringify(state),app=run(legacy(),{v2:raw});assert.equal(app.files.get('laced-notes-v2'),raw);assert.match(app.root.innerHTML,/recovery required/);
});
test('storage read denial shows recovery without initializing a replacement',()=>{
 const app=run(legacy(),{unavailable:true});assert.equal(app.files.has('laced-notes-v2'),false);assert.match(app.root.innerHTML,/recovery required/);
});
test('V1 migration retains a raw source baseline, and rerunning does not duplicate work',()=>{
 const first=run(legacy()),before=first.state();assert.equal(before.migration.legacyRaw,first.files.get('laced-notes-v1'));
 const second=run(undefined,{files:first.files});assert.equal(second.state().projects.length,1);assert.deepEqual(second.state().projects[0].stages,before.projects[0].stages);
});
test('V1 changes after migration become one recovery copy without replacing V2 edits',()=>{
 const first=run(legacy());first.input('v2-editor','new V2 draft');
 const old=legacy();old.projects[0].stages.ideate='new V1 draft';first.files.set('laced-notes-v1',JSON.stringify(old));
 const next=run(undefined,{files:first.files});assert.equal(next.state().projects.length,2);
 assert.equal(next.state().projects[0].stages.imagine,'new V2 draft');assert.equal(next.state().projects[1].stages.imagine,'new V1 draft');
 assert.equal(run(undefined,{files:next.files}).state().projects.length,2);
});
test('pre-repair V2 without a migration baseline conservatively preserves V1 copies once',()=>{
 const first=run(legacy()),data=first.state();delete data.migration;
 const next=run(legacy(),{v2:data});assert.equal(next.state().projects.length,2);assert.match(next.state().projects[1].title,/V1 recovery/);
 assert.equal(run(undefined,{files:next.files}).state().projects.length,2);
});
test('passage restore replaces only its revised span, preserving surrounding whitespace',()=>{
 const app=run(legacy());app.input('v2-editor','  verse\nold chorus\n  outro\n');app.select(8,18);app.click({act:'save-outtake'});
 const out=app.state().projects[0].outtakes[0];assert.equal(out.type,'passage');assert.equal(out.text,'old chorus');
 app.input('v2-editor','  verse\nA longer new chorus\n  outro\n');app.click({outRestore:out.id});
 const project=app.state().projects[0];assert.equal(project.stages.imagine,'  verse\nold chorus\n  outro\n');assert.equal(project.outtakes.at(-1).text,'  verse\nA longer new chorus\n  outro\n');
});
test('ambiguous passage restore refuses to overwrite any writing',()=>{
 const app=run(legacy());app.input('v2-editor','verse chorus outro');app.select(6,12);app.click({act:'save-outtake'});
 const id=app.state().projects[0].outtakes[0].id;app.input('v2-editor','changed verse changed chorus outro');const before=app.state().projects[0];app.click({outRestore:id});
 assert.deepEqual(app.state().projects[0],before);assert.match(app.root.querySelector('#v2-toast').textContent,/context has changed/);
});
test('old unanchored passages and Crosswire results never replace a whole draft',()=>{
 const data=run(legacy()).state();data.projects[0].outtakes=[{id:'old',name:'Old',stage:'imagine',type:'passage',text:'fragment'}];
 const app=run(legacy(),{v2:data});app.click({outRestore:'old'});assert.equal(app.state().projects[0].stages.imagine,'contradiction');
});
test('full-stage restore targets original stage and its safety snapshot is itself restorable',()=>{
 const app=run(legacy());app.input('v2-editor','  old draft\n');app.click({act:'save-outtake'});const id=app.state().projects[0].outtakes[0].id;
 app.input('v2-editor','new draft');app.click({stage:'ignite'});app.click({outRestore:id});let data=app.state();
 assert.equal(data.projects[0].stages.imagine,'  old draft\n');assert.equal(data.projects[0].stages.ignite,'chorus to protect');assert.equal(data.phase,'imagine');
 const safety=data.projects[0].outtakes.at(-1);app.click({outRestore:safety.id});assert.equal(app.state().projects[0].stages.imagine,'new draft');
});
test('cancelled restore changes nothing',()=>{
 const app=run(legacy());app.click({act:'save-outtake'});app.input('v2-editor','new work');app.setConfirm(false);const before=app.state();
 app.click({outRestore:before.projects[0].outtakes[0].id});assert.deepEqual(app.state(),before);
});
test('quota failure rolls back restore and safety creation, with no false success',()=>{
 const app=run(legacy());app.click({act:'save-outtake'});app.input('v2-editor','new work');const before=app.state();app.setFail(true);
 app.click({outRestore:before.projects[0].outtakes[0].id});assert.deepEqual(app.state(),before);assert.match(app.root.querySelector('#v2-toast').textContent,/Save failed/);
 app.click({themeId:'chalkboard'});assert.match(app.root.innerHTML,/Save failed/);
});
test('unsaved editor text remains exportable when storage quota fails',async()=>{
 const app=run(legacy());app.setFail(true);app.input('v2-editor','unsaved precious draft');app.click({act:'backup-json'});
 const data=JSON.parse(await app.downloads.at(-1).text());assert.equal(data.projects[0].stages.imagine,'unsaved precious draft');
 assert.equal(app.state().projects[0].stages.imagine,'contradiction');assert.match(app.root.querySelector('#v2-toast').textContent,/Save failed/);
});
test('stale V2 tab refuses to overwrite a newer stored draft',()=>{
 const app=run(legacy());const newer=app.state();newer.projects[0].stages.imagine='other tab';const raw=JSON.stringify(newer);app.files.set('laced-notes-v2',raw);
 app.input('v2-editor','stale tab');assert.equal(app.files.get('laced-notes-v2'),raw);assert.match(app.root.querySelector('#v2-save').textContent,/another tab/);
});
test('V1 writes during this session block further V2 saves until recovery',()=>{
 const app=run(legacy()),before=app.files.get('laced-notes-v2');app.files.set('laced-notes-v1',JSON.stringify({...legacy(),theme:'trial'}));
 app.input('v2-editor','new V2');assert.equal(app.files.get('laced-notes-v2'),before);assert.match(app.root.querySelector('#v2-save').textContent,/V1 changed/);
});
test('stage and project switches reset insertion range and restore prior editor selection',()=>{
 const app=run(legacy());app.input('v2-editor','abcdefghij');app.select(3,7);app.click({stage:'ignite'});app.click({wordInsert:'0'});
 assert.equal(app.state().projects[0].stages.ignite,'twilightchorus to protect');app.click({stage:'imagine'});
 let editor=app.root.querySelector('#v2-editor');assert.equal(editor.selectionStart,3);assert.equal(editor.selectionEnd,7);
 app.click({act:'new-project'});app.click({act:'insert-result'});assert.equal(app.state().projects.at(-1).stages.cluster,'');
 app.click({projectId:'original-id'});assert.equal(app.root.querySelector('#v2-editor').selectionStart,0);
});
test('repeated tool insertions use the updated caret and never replace an earlier selection again',()=>{
 const app=run(legacy());app.input('v2-editor','one two three');app.select(4,7);app.click({tool:'crosswire'});app.input('v2-exp-result','X');app.click({act:'insert-result'});app.click({act:'insert-result'});
 assert.equal(app.state().projects[0].stages.imagine,'one XX three');
});
test('Crosswire working result is isolated per stage and recovered when returning',()=>{
 const app=run(legacy());app.click({tool:'crosswire'});app.input('v2-exp-result','imagine experiment');app.click({stage:'ignite'});
 assert.equal(app.root.querySelector('#v2-exp-result').value,'');app.input('v2-exp-result','ignite experiment');app.click({stage:'imagine'});
 assert.equal(app.root.querySelector('#v2-exp-result').value,'imagine experiment');
});
test('V2 JSON backup roundtrip retains stages, raw whitespace, Outtake anchors and incoming preferences',async()=>{
 const app=run(legacy());app.input('v2-editor','  all my words\n');app.select(2,5);app.click({act:'save-outtake'});app.click({themeId:'afterhours'});app.click({act:'backup-json'});
 const data=JSON.parse(await app.downloads.at(-1).text()),target=run(legacy());await target.importData(data);const imported=target.state().projects.at(-1);
 assert.deepEqual(imported.stages,data.projects[0].stages);assert.deepEqual(imported.outtakes,data.projects[0].outtakes);assert.deepEqual(imported.palette,data.projects[0].palette);
 assert.equal(target.state().imports[0].preferences.theme,'afterhours');assert.equal(target.state().theme,'corkboard');
});
test('V1 JSON import is additive and preserves Seed and scratch',async()=>{
 const app=run(legacy()),before=app.state().projects[0];await app.importData(legacy());const data=app.state();assert.equal(data.projects.length,2);assert.deepEqual(data.projects[0],before);
 assert.equal(data.projects[1].legacySeed,'concept to preserve');assert.equal(data.projects[1].legacyScratch,'loose note');
});
test('invalid mixed import rejects the entire batch and preserves existing data',async()=>{
 const app=run(legacy()),data=legacy();data.projects.push({title:'Broken'});const before=app.state();await app.importData(data);assert.deepEqual(app.state(),before);assert.match(app.root.querySelector('#v2-toast').textContent,/Import failed/);
});
test('quota failure on import adds no partial copies to memory or storage',async()=>{
 const app=run(legacy()),before=app.state();app.setFail(true);await app.importData(legacy());assert.deepEqual(app.state(),before);
 app.setFail(false);app.click({act:'backup-json'});assert.equal(JSON.parse(await app.downloads.at(-1).text()).projects.length,1);
});
test('V2 host never initializes hidden V1 storage owner',()=>{
 const html=readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const oldScript=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 runInNewContext(oldScript,{}); // Would throw on DOM/storage access if V1 initialized.
});

test('failed Outtake save is not reported as saved and does not leak into later backups',async()=>{
 const app=run(legacy());app.setFail(true);app.click({act:'save-outtake'});assert.equal(app.state().projects[0].outtakes.length,0);assert.match(app.root.querySelector('#v2-toast').textContent,/Save failed/);
 app.setFail(false);app.click({act:'backup-json'});assert.equal(JSON.parse(await app.downloads.at(-1).text()).projects[0].outtakes.length,0);
});
test('failed destructive deletes retain the Blueprint and its Outtake',()=>{
 const app=run(legacy());app.click({act:'save-outtake'});const before=app.state();app.setFail(true);app.click({outRemove:before.projects[0].outtakes[0].id});app.click({act:'delete-project'});
 app.setFail(false);app.click({act:'backup-json'});assert.deepEqual(app.state().projects[0].stages,before.projects[0].stages);assert.equal(app.state().projects[0].outtakes.length,1);
});
test('comparison uses the saved source stage even while another stage is open',()=>{
 const app=run(legacy());app.click({act:'save-outtake'});const id=app.state().projects[0].outtakes[0].id;app.click({stage:'ignite'});app.click({tool:'outtakes'});app.click({outCompare:id});
 const html=app.root.querySelector('#v2-tool-body').innerHTML;assert.match(html,/Current imagine writing/);assert.match(html,/readonly>contradiction/);
});
test('editor scroll and touch selection events survive stage changes',()=>{
 const app=run(legacy()),editor=app.root.querySelector('#v2-editor');editor.scrollTop=175;editor.setSelectionRange(1,4);
 app.docListeners.selectionchange();app.root.listeners.focusout({target:editor});app.click({stage:'ignite'});app.click({stage:'imagine'});
 const restored=app.root.querySelector('#v2-editor');assert.equal(restored.scrollTop,175);assert.equal(restored.selectionStart,1);assert.equal(restored.selectionEnd,4);
});
