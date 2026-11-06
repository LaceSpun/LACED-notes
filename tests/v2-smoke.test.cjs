// Run with: node --test tests/v2-smoke.test.cjs
// No third-party test runner or network access required.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const source=readFileSync(require('node:path').join(__dirname,'../studio-v2.js'),'utf8');
class El{
  constructor(){this.dataset={};this.value='';this.textContent='';this.classList={add(){},remove(){},toggle(){}};this.selectionStart=0;this.selectionEnd=0;this.listeners={};}
  set innerHTML(x){this._html=x;}get innerHTML(){return this._html;}
  addEventListener(name,fn){this.listeners[name]=fn;}
  querySelector(sel){this._q??={};return this._q[sel]||(this._q[sel]=new El());}
  querySelectorAll(){return [];}setAttribute(){}appendChild(el){this.child=el;}
  focus(){}setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}click(){}remove(){}
}
function run(v1){
 const files=new Map([['laced-notes-v1',JSON.stringify(v1)]]);
 const localStorage={getItem:key=>files.get(key)||null,setItem:(key,val)=>files.set(key,val)};
 const body=new El(),document={body,createElement:()=>new El(),addEventListener(){}};
 let prompts=0;
 const context={
   document,window:{innerWidth:1100,addEventListener(){}},localStorage,
   navigator:{clipboard:{writeText:async()=>{}}},prompt:()=>{prompts++;return 'Named alternative';},confirm:()=>true,
   crypto:{randomUUID:()=>('id-'+(++context.nextId))},nextId:0,
   setTimeout:()=>0,clearTimeout(){},Date,JSON,Blob,URL,console
 };
 runInNewContext(source,context);
 const root=body.child;
 const click=dataset=>root.listeners.click({target:{closest:()=>({dataset})}});
 const state=()=>JSON.parse(files.get('laced-notes-v2'));
 return {files,root,click,state,getPrompts:()=>prompts};
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
