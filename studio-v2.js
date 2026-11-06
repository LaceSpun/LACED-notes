
/* LACED Notes V2. Isolated storage and UI, keeping V1 code and data available as fallback. */
(function(){
'use strict';
const KEY='laced-notes-v2', OLD='laced-notes-v1';
const stages=[['cluster','Cluster','Gather unpolished fragments and observations.','Drop a thought, a contradiction, a possible title…'],['imagine','Imagine','Explore the concept before deciding what the song must say.','What is the central tension? What would challenge it?'],['bloom','Bloom','Develop lyrical vocabulary, images and associations.','Words, metaphors, rhyme endings and fragments worth pursuing…'],['ignite','Ignite','Give the song form, one imperfect line at a time.','[Verse 1]\n\n[Pre-Chorus]\n\n[Chorus]\n'],['ascend','Ascend','Question, revise and protect promising alternatives.','Try a change of perspective, a sharper line or another emotional turn…']];
const themes=[['corkboard','Corkboard Studio'],['evidence','Evidence Board'],['connection','Connection Web'],['origin','Origin Detective'],['colorlab','Living Color Lab'],['trial','Put It on Trial'],['astrology','Astrology Atlas'],['chalkboard','Chalkboard'],['afterhours','After Hours'],['midnight','Chalkboard × After Hours']];
const h=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=()=> (typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():'l'+Date.now().toString(36)+Math.random().toString(36).slice(2);
const clone=x=>JSON.parse(JSON.stringify(x));
const emptyStages=()=>Object.fromEntries(stages.map(x=>[x[0],'']));
const defaults=()=>({'Emotional temperature':['aching','tender','restless','defiant','hopeful'],'Narrative lens':['confessional','observational','unreliable'],'Texture':['raw','spare','haunting']});
function newProject(title,template){return {id:uuid(),title:title||'Untitled idea',stages:emptyStages(),legacySeed:'',legacyScratch:'',words:[],palette:clone(template||defaults()),outtakes:[],createdAt:Date.now(),updatedAt:Date.now()};}
function fromLegacy(p){let out=newProject(p.title,p.palette&&typeof p.palette==='object'&&!Array.isArray(p.palette)?p.palette:defaults());
out.id=typeof p.id==='string'&&p.id?p.id:uuid();out.createdAt=Number(p.createdAt)||Date.now();out.updatedAt=Number(p.updatedAt)||Date.now();const v=p.stages||{};
out.stages.cluster=typeof v.collect==='string'?v.collect:'';
out.stages.imagine=typeof v.ideate==='string'?v.ideate:'';
out.stages.ignite=typeof v.start==='string'?v.start:'';
out.stages.ascend=typeof v.iterate==='string'?v.iterate:'';
out.legacySeed=typeof v.seed==='string'?v.seed:'';
out.legacyScratch=typeof p.scratch==='string'?p.scratch:'';
out.words=Array.isArray(p.words)?p.words.filter(x=>typeof x==='string'):[];
return out;}
function v2Project(p){if(!p||typeof p.title!=='string')return null;let q=newProject(p.title,p.palette&&typeof p.palette==='object'?p.palette:defaults());q.id=typeof p.id==='string'&&p.id?p.id:uuid();q.createdAt=Number(p.createdAt)||Date.now();q.updatedAt=Number(p.updatedAt)||Date.now();for(const s of stages)if(typeof p.stages?.[s[0]]==='string')q.stages[s[0]]=p.stages[s[0]];q.legacySeed=typeof p.legacySeed==='string'?p.legacySeed:'';q.legacyScratch=typeof p.legacyScratch==='string'?p.legacyScratch:'';q.words=Array.isArray(p.words)?p.words.filter(w=>typeof w==='string'):[];q.outtakes=Array.isArray(p.outtakes)?p.outtakes.filter(x=>x&&typeof x.text==='string').map(x=>({...x,id:x.id||uuid(),name:String(x.name||'Untitled alternative')})):[];return q;}
function initState(){let old=null;try{old=JSON.parse(localStorage.getItem(OLD)||'null')}catch(e){} 
let base={version:2,activeId:null,phase:'imagine',mode:'explore',theme:'midnight',projects:[],paletteTemplate:defaults(),updatedAt:Date.now()};
if(old&&Array.isArray(old.projects)&&old.projects.length){base.projects=old.projects.filter(p=>p&&typeof p.title==='string').map(fromLegacy);base.activeId=base.projects.some(p=>p.id===old.activeId)?old.activeId:base.projects[0]?.id;base.phase=({collect:'cluster',ideate:'imagine',seed:'imagine',start:'ignite',iterate:'ascend'})[old.phase]||'imagine';base.theme=themes.some(t=>t[0]===old.theme)?old.theme:'midnight';base.paletteTemplate=clone(base.projects[0]?.palette||defaults());}
if(!base.projects.length){let p=newProject('Untitled idea');base.projects=[p];base.activeId=p.id;}
return base;
}
let state;try{let s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&s.version===2&&Array.isArray(s.projects)&&s.projects.length){state={...initState(),...s,projects:s.projects.map(v2Project).filter(Boolean)};}else state=initState();}catch(e){state=initState();}
if(!state.projects.length){state.projects=[newProject('Untitled idea')];state.activeId=state.projects[0].id;}
if(!state.projects.some(p=>p.id===state.activeId))state.activeId=state.projects[0].id;
if(!stages.some(s=>s[0]===state.phase))state.phase='imagine';
if(!themes.some(t=>t[0]===state.theme))state.theme='midnight';
if(!state.paletteTemplate||typeof state.paletteTemplate!=='object')state.paletteTemplate=defaults();
let tool='wordverse',panelOpen=(typeof window!=='undefined'&&window.innerWidth>900),expTab='generate',expr={a:'',b:'',result:''},selected='',selectedStart=0,selectedEnd=0,caretByStage={},lastStage=state.phase,toastTimer,compareId=null;
let root=document.createElement('div');root.id='laced-v2';root.setAttribute('data-theme',state.theme);document.body.classList.add('v2-active');document.body.appendChild(root);
function p(){return state.projects.find(q=>q.id===state.activeId)||state.projects[0]}
function save(){p().updatedAt=Date.now();state.updatedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(state));const el=root.querySelector('#v2-save');if(el)el.textContent='Saved locally';}catch(e){const el=root.querySelector('#v2-save');if(el)el.textContent='Save failed';}}
function toast(msg){const el=root.querySelector('#v2-toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2700);}
function btn(label,act,klass){return '<button type="button" class="v2-btn '+(klass||'')+'" data-act="'+act+'">'+h(label)+'</button>';}
function chooseTools(){return [['blueprints','Blueprints'],['constellations','Constellations'],['wordverse','Wordverse'],['crosswire','Crosswire'],['outtakes','Outtakes'],['circuits','The Circuits'],['calibration','Calibration']];}
function render(){
root.setAttribute('data-theme',state.theme);
root.innerHTML='<header class="v2-head"><div class="v2-brand">laced<em>notes</em><small>THE LITTLE IDEA STUDIO</small></div>'+
'<button class="v2-btn v2-btn-quiet v2-project" data-tool="blueprints" title="Switch Blueprint">'+h(p().title)+' ▾</button>'+
'<div class="v2-spacer"></div><span class="v2-mini v2-save" id="v2-save">Saved locally</span>'+
'<button class="v2-btn" data-act="cycle-mode" title="Switch workspace mode">'+h(state.mode==='focus'?'Focus':state.mode==='expanded'?'Expanded':'Explore')+'</button>'+
'<button class="v2-btn" data-tool="calibration" title="Calibration">⚙</button>'+
'<button class="v2-btn v2-btn-primary" data-act="new-project" aria-label="New Spark" title="New Spark">+ <span class="v2-new-spark">New Spark</span></button></header>'+
'<div class="v2-layout"><nav class="v2-side" aria-label="Workspace modules"><div class="v2-label">The work</div>'+
chooseTools().slice(0,5).map(([id,name])=>'<button type="button" class="'+(tool===id?'active':'')+'" data-tool="'+id+'">'+h(name)+'</button>').join('')+
'<div class="v2-side-bottom"></div><div class="v2-label">The system</div>'+chooseTools().slice(5).map(([id,name])=>'<button type="button" class="'+(tool===id?'active':'')+'" data-tool="'+id+'">'+h(name)+'</button>').join('')+'</nav>'+
'<section class="v2-main"><nav class="v2-stages" aria-label="Creative stages">'+stages.map((s,i)=>'<button type="button" class="'+(state.phase===s[0]?'active':'')+'" data-stage="'+s[0]+'" '+(state.phase===s[0]?'aria-current="page"':'')+'><span>0'+(i+1)+'</span>'+s[1]+'</button>').join('')+'</nav>'+
'<div class="v2-work '+(panelOpen?'tool-open':'')+'" id="v2-work" data-mode="'+state.mode+'"><div class="v2-writing">'+editorHtml()+'</div>'+
'<aside class="v2-tool" id="v2-tool" aria-label="Contextual workspace"><div class="v2-tool-top"><strong id="v2-tool-title"></strong><button class="v2-btn v2-btn-quiet" data-act="close-tool" aria-label="Close contextual tool">✕</button></div><div class="v2-tool-body" id="v2-tool-body"></div></aside></div></section></div>'+
'<nav class="v2-bottom" aria-label="Mobile tools"><button data-tool="blueprints">Blueprints</button><button data-tool="wordverse">Wordverse</button><button data-tool="crosswire">Crosswire</button><button data-tool="outtakes">Outtakes</button><button data-tool="circuits">The Circuits</button></nav>'+
'<div role="status" aria-live="polite" class="v2-toast" id="v2-toast"></div>';
renderTool();
const c=caretByStage[p().id+':'+state.phase],editor=root.querySelector('#v2-editor');if(c&&editor){editor.setSelectionRange(Math.min(c[0],editor.value.length),Math.min(c[1],editor.value.length));}
}
function editorHtml(){
const s=stages.find(x=>x[0]===state.phase)||stages[1],value=p().stages[state.phase]||'';
let subtitle='<div class="v2-mini">YOUR ACTIVE BLUEPRINT / '+h(s[1].toUpperCase())+'</div><h1 class="v2-editor-title">'+h(s[1])+'</h1><p class="v2-sub">'+h(s[2])+'</p>';
let extra='';
if(state.phase==='imagine'&&p().legacySeed)extra='<details class="v2-legacy"><summary>Earlier concept material (preserved from V1 Seed)</summary><p>'+h(p().legacySeed)+'</p>'+btn('Copy to current draft','copy-seed')+'</details>';
if(state.phase==='bloom')extra='<div class="v2-stage-note">Use Wordverse to collect words and explore suffix matches. This canvas holds your independent language experiments.</div>';
if(state.phase==='ignite')extra='<div class="v2-editor-actions">'+['Verse','Pre-Chorus','Chorus','Bridge','Outro'].map(x=>'<button class="v2-btn" data-insert-section="'+x+'">+ '+x+'</button>').join('')+'</div>';
if(state.phase==='ascend')extra='<div class="v2-stage-note">Preserve a version in Outtakes before replacing a line or an entire section.</div>';
return '<div class="v2-editor-head">'+subtitle+'<span class="v2-mini" id="v2-count">'+(value.trim().split(/\s+/).filter(Boolean).length)+' words</span></div>'+
'<article class="v2-editor-card"><label class="v2-mini" for="v2-name">BLUEPRINT NAME</label>'+
'<input id="v2-name" class="v2-input-title" aria-label="Blueprint name" maxlength="120" value="'+h(p().title)+'">'+
'<label for="v2-editor" class="v2-mini">WORKING DRAFT</label>'+
'<textarea id="v2-editor" class="v2-textarea" spellcheck="true" placeholder="'+h(s[3])+'">'+h(value)+'</textarea>'+
'<div class="v2-editor-actions">'+btn('Save to Outtakes','save-outtake')+btn('Crosswire ↗','use-crosswire')+btn('Wordverse ↗','use-wordverse')+'</div></article>'+extra;
}
function openTool(t){tool=t;panelOpen=true;if(state.mode==='focus')state.mode='explore';renderTool();let w=root.querySelector('#v2-work');if(w){w.classList.add('tool-open');w.dataset.mode=state.mode;}root.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x.dataset.tool===t));}
function markSelection(){let ta=root.querySelector('#v2-editor');if(!ta)return;selectedStart=ta.selectionStart||0;selectedEnd=ta.selectionEnd||0;selected=ta.value.slice(selectedStart,selectedEnd);caretByStage[p().id+':'+state.phase]=[selectedStart,selectedEnd];}
function renderTool(){let titles=Object.fromEntries(chooseTools());titles.wardrobe='Wardrobe';root.querySelector('#v2-tool-title').textContent=titles[tool]||'Creative tools';let el=root.querySelector('#v2-tool-body');if(!el)return;
switch(tool){
case 'blueprints':el.innerHTML=blueprintsHtml();break;
case 'wordverse':el.innerHTML=wordsHtml();break;
case 'constellations':el.innerHTML=paletteHtml();break;
case 'crosswire':el.innerHTML=crosswireHtml();break;
case 'outtakes':el.innerHTML=outtakesHtml();break;
case 'circuits':el.innerHTML=circuitsHtml();break;
case 'calibration':el.innerHTML=calibrationHtml();break;
case 'wardrobe':el.innerHTML=wardrobeHtml();break;
default:el.innerHTML=blueprintsHtml();
}}
function blueprintsHtml(){return '<p class="v2-muted">Return to unfinished work or begin without a setup ritual.</p>'+btn('+ New Spark','new-project','v2-btn-primary')+
state.projects.slice().sort((a,b)=>b.updatedAt-a.updatedAt).map(q=>'<div class="v2-row"><div><strong>'+h(q.title)+'</strong><div class="v2-mini">'+new Date(q.updatedAt).toLocaleDateString()+'</div></div><button class="v2-btn" data-project-id="'+h(q.id)+'">'+(q.id===p().id?'Current':'Open')+'</button></div>').join('')+
'<div class="v2-panel"><label class="v2-mini" for="v2-search">Find a Blueprint</label><input id="v2-search" class="v2-field" type="search" placeholder="Search titles"></div>';}
function wordsHtml(){let words=p().words||[];return '<p class="v2-muted">Saved vocabulary is preserved from V1. Add, search, insert or investigate possible word endings.</p>'+
'<div class="v2-inline"><input class="v2-field" id="v2-word-new" placeholder="Word or phrase" maxlength="90">'+btn('Add','add-word','v2-btn-primary')+'</div>'+
'<div class="v2-panel"><label class="v2-mini" for="v2-word-search">Search Wordverse</label><input class="v2-field" id="v2-word-search" placeholder="Find saved words"></div>'+
'<div id="v2-words-list">'+words.map((w,i)=>'<span class="v2-chip" data-word-row="'+i+'"><button title="Insert into writing" data-word-insert="'+i+'">'+h(w)+'</button><button aria-label="Remove '+h(w)+'" title="Remove word" data-word-remove="'+i+'">×</button></span>').join('')+'</div>'+
'<div class="v2-panel"><h3>Ending explorer</h3><p>Find similar written endings among saved words. Spelling similarity is not a guarantee of rhyme.</p><input class="v2-field" id="v2-ending" placeholder="Enter ending, e.g. ight"><button class="v2-btn" data-act="find-ending">Find matching endings</button><div id="v2-ending-result" class="v2-muted"></div></div>';}
function paletteHtml(){return '<p class="v2-muted">Your categories and choices remain editable. Removed defaults stay removed from new Blueprints.</p>'+
'<div class="v2-inline"><input class="v2-field" id="v2-new-category" placeholder="New influence category" maxlength="55">'+btn('Create','add-category')+'</div>'+
Object.entries(p().palette||{}).map(([key,words])=>'<section class="v2-panel"><div class="v2-row"><h3>'+h(key)+'</h3><span><button class="v2-btn" data-palette-rename="'+h(key)+'">Rename</button> <button class="v2-btn" data-palette-delete="'+h(key)+'">×</button></span></div>'+
'<div>'+words.map((w,i)=>'<span class="v2-chip">'+h(w)+' <button title="Insert influence" data-palette-insert="'+h(key)+'" data-i="'+i+'">↗</button><button title="Remove influence" data-palette-remove="'+h(key)+'" data-i="'+i+'">×</button></span>').join('')+'</div>'+
'<div class="v2-inline"><input class="v2-field" data-palette-input="'+h(key)+'" placeholder="Add influence"><button class="v2-btn" data-palette-add="'+h(key)+'">Add</button></div></section>').join('');}
function crosswireHtml(){let active=selected||p().stages[state.phase]||'';return '<p class="v2-muted">Creative experiments without fake AI. A chosen lyric can become an editable alternative, never an automatic overwrite.</p>'+
'<div class="v2-tabs">'+[['generate','Generate'],['transform','Transform'],['diagnose','Diagnose']].map(([id,name])=>'<button class="'+(expTab===id?'active':'')+'" data-exp-tab="'+id+'">'+name+'</button>').join('')+'</div>'+
(expTab==='generate'?'<div class="v2-panel"><h3>Concept Collision</h3><p>Two competing ideas. What changes when both must be true?</p><label class="v2-mini">CONCEPT A</label><input class="v2-field" id="v2-exp-a" placeholder="Longing" value="'+h(expr.a)+'"><label class="v2-mini">CONCEPT B</label><input class="v2-field" id="v2-exp-b" placeholder="Self-preservation" value="'+h(expr.b)+'">'+btn('Build collision scaffold','run-collision')+'</div>':
expTab==='transform'?'<div class="v2-panel"><h3>Refrain Reversal</h3><p>Turn the assumption against itself. Write the reversal rather than asking a random-word machine to invent insight.</p><label class="v2-mini">ORIGINAL LINE</label><textarea class="v2-field v2-area" id="v2-exp-a">'+h(expr.a||active)+'</textarea>'+btn('Create reversal scaffold','run-reversal')+'</div>':
'<div class="v2-panel"><h3>Song Diagnostic</h3><p>Verifiable language signals only: repetition, line lengths and repeated opening words.</p><label class="v2-mini">TEXT TO EXAMINE</label><textarea class="v2-field v2-area" id="v2-exp-a">'+h(expr.a||active)+'</textarea>'+btn('Analyze observable patterns','run-diagnostic')+'</div>')+
'<div class="v2-panel"><h3>Working result</h3><textarea class="v2-field v2-area" id="v2-exp-result" placeholder="Your experiment appears here. Edit freely.">'+h(expr.result)+'</textarea>'+
'<div class="v2-inline">'+btn('Save to Outtakes','save-experiment')+btn('Insert into draft','insert-result')+'</div></div>';}
function outtakesHtml(){const out=p().outtakes||[];let compare=out.find(x=>x.id===compareId);return '<p class="v2-muted">Intentional versions, separate from autosave. Nothing restores itself.</p>'+
btn('Preserve selected passage / current draft','save-outtake','v2-btn-primary')+
(p().legacyScratch?'<details class="v2-legacy"><summary>Preserved V1 scratch note</summary>'+h(p().legacyScratch)+'</details>':'')+
(!out.length?'<div class="v2-panel"><p>No saved versions yet. Select a line in the editor and preserve it.</p></div>':'')+
out.slice().reverse().map(x=>'<div class="v2-panel"><div class="v2-row"><strong>'+h(x.name)+'</strong><span class="v2-mini">'+h(x.stage||'idea')+'</span></div><p>'+h(x.text.slice(0,180))+'</p><div class="v2-inline"><button class="v2-btn" data-out-compare="'+h(x.id)+'">Compare</button><button class="v2-btn" data-out-copy="'+h(x.id)+'">Copy</button><button class="v2-btn" data-out-restore="'+h(x.id)+'">Replace draft…</button><button class="v2-btn" data-out-rename="'+h(x.id)+'">Rename</button><button class="v2-btn" data-out-remove="'+h(x.id)+'">Delete</button></div></div>').join('')+
(compare?'<div class="v2-panel"><h3>Comparison: '+h(compare.name)+'</h3><div class="v2-compare"><div><p>Saved alternative</p><textarea class="v2-field v2-area" readonly>'+h(compare.text)+'</textarea></div><div><p>Current '+h(state.phase)+' writing</p><textarea class="v2-field v2-area" readonly>'+h(p().stages[state.phase])+'</textarea></div></div></div>':'');}
function circuitsHtml(){return '<p class="v2-muted">Real project operations preserved from V1, including backup and import.</p><div class="v2-panel"><h3>Blueprint actions</h3>'+
'<div class="v2-inline">'+btn('New Spark','new-project')+btn('Rename Blueprint','rename-project')+btn('Duplicate','duplicate-project')+btn('Delete Blueprint','delete-project')+'</div></div>'+
'<div class="v2-panel"><h3>Portable backups</h3><p>Export regularly. Data lives in the browser on this device, not on GitHub.</p>'+
'<div class="v2-inline">'+btn('Export JSON backup','backup-json','v2-btn-primary')+btn('Export text','backup-text')+'<label class="v2-btn" style="cursor:pointer">Import JSON<input type="file" id="v2-import" accept=".json,application/json" style="display:none"></label></div></div>';}
function calibrationHtml(){return '<div class="v2-panel"><h3>Appearance</h3><p>Wardrobe contains all theme choices, including the original seven.</p>'+btn('Open Wardrobe','open-wardrobe','v2-btn-primary')+'</div>'+
'<div class="v2-panel"><h3>Workspace behavior</h3><p>Mode determines how much of the writing surface remains visible.</p>'+
'<div class="v2-inline">'+['focus','explore','expanded'].map(m=>'<button class="v2-btn" data-mode="'+m+'">'+m[0].toUpperCase()+m.slice(1)+'</button>').join('')+'</div></div>'+
'<div class="v2-panel"><h3>Local-first storage</h3><p>V2 writing uses a new browser-local key. The original V1 key is left intact. Use The Circuits to create a backup.</p>'+btn('Open The Circuits','open-circuits')+'</div>';}
function wardrobeHtml(){return btn('← Calibration','open-calibration')+'<p class="v2-muted">Theme changes affect presentation, never your writing.</p>'+themes.map(([id,name])=>'<button class="v2-row" style="width:100%;background:transparent;color:inherit;border-left:0;border-top:0;border-right:0;text-align:left" data-theme-id="'+id+'"><strong>'+h(name)+'</strong><span>'+ (state.theme===id?'✓ Active':'Preview / apply')+'</span></button>').join('');}
function addOuttake(text,name,src){let raw=String(text||'').trim();if(!raw){toast('Nothing to preserve yet');return;}let title=name||prompt('Name this Outtake','Alternate '+stages.find(x=>x[0]===state.phase)?.[1])||'';if(!title)return;let o={id:uuid(),name:title.slice(0,100),text:raw,stage:state.phase,type:src||'passage',createdAt:Date.now()};p().outtakes.push(o);save();toast('Saved separately in Outtakes');if(tool==='outtakes')renderTool();}
function setStage(id){markSelection();state.phase=id;lastStage=id;save();render();}
function changeMode(mode){state.mode=mode;panelOpen=mode==='expanded'?true:panelOpen;save();const work=root.querySelector('#v2-work');work.dataset.mode=mode;work.classList.toggle('tool-open',panelOpen&&mode!=='focus');root.querySelector('[data-act=cycle-mode]').textContent=mode[0].toUpperCase()+mode.slice(1);}
function copyText(txt){if(navigator.clipboard?.writeText){navigator.clipboard.writeText(txt).then(()=>toast('Copied')).catch(()=>{window.prompt('Copy text',txt);});}else window.prompt('Copy text',txt);}
function insertText(str){let area=root.querySelector('#v2-editor'),a=selectedStart,b=selectedEnd;if(!area)return;let src=area.value; if(a>src.length)a=src.length;if(b>src.length)b=a;
let insert=String(str||'');if(!insert)return;area.value=src.slice(0,a)+insert+src.slice(b);p().stages[state.phase]=area.value;selectedStart=a+insert.length;selectedEnd=selectedStart;save();area.focus();area.setSelectionRange(selectedStart,selectedEnd);root.querySelector('#v2-count').textContent=area.value.trim().split(/\s+/).filter(Boolean).length+' words';toast('Inserted into working draft');}
function chooseProject(id){if(!state.projects.some(x=>x.id===id))return;state.activeId=id;save();panelOpen=false;render();}
function download(name,value,type){let b=new Blob([value],{type:type||'text/plain'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function safeName(){return p().title.replace(/[^a-z0-9_-]/gi,'_').slice(0,60)||'Laced_Notes';}
function diagnose(src){let lines=src.split(/\r?\n/).filter(x=>x.trim());let tokens=(src.toLowerCase().match(/[a-z']+/g)||[]);let ignore=new Set(['the','a','an','and','of','to','in','my','your','i','you','is','it','that','this','for','on','with']);let counts={};tokens.filter(t=>t.length>2&&!ignore.has(t)).forEach(t=>counts[t]=(counts[t]||0)+1);let repeats=Object.entries(counts).filter(x=>x[1]>1).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]+' ×'+x[1]);let opening={};lines.forEach(line=>{let w=line.trim().split(/\s+/)[0]?.toLowerCase();if(w)opening[w]=(opening[w]||0)+1});let open=Object.entries(opening).filter(x=>x[1]>1).map(x=>x[0]+' ×'+x[1]);let sizes=lines.map(x=>x.trim().split(/\s+/).length);return 'OBSERVABLE PATTERNS\nLines with text: '+lines.length+'\nWords: '+tokens.length+'\nShortest / longest line: '+(sizes.length?Math.min(...sizes):0)+' / '+(sizes.length?Math.max(...sizes):0)+' words\nRepeated significant words: '+(repeats.join(', ')||'none')+'\nRepeated line openings: '+(open.join(', ')||'none')+'\n\nQUESTIONS TO TEST (not automated judgments)\n• Does intentional repetition strengthen the refrain?\n• Which change of line length alters the rhythm?\n• Where could a surprising image replace familiar phrasing?';}
function runExperiment(action){const a=root.querySelector('#v2-exp-a');const b=root.querySelector('#v2-exp-b');const result=root.querySelector('#v2-exp-result');expr.a=a?.value||'';expr.b=b?.value||expr.b;
if(action==='run-collision'){if(!expr.a.trim()||!expr.b.trim()){toast('Give both concepts a role');return;}expr.result='CONCEPT A: '+expr.a+'\nCONCEPT B: '+expr.b+'\n\nCOLLISION: What does '+expr.a+' demand that '+expr.b+' threatens?\n\nPOINT OF TENSION: Both seem necessary, but neither can win unchanged.\n\nYOUR THIRD POSSIBILITY:\n[Write what emerges when the two demands collide.]';}
if(action==='run-reversal'){if(!expr.a.trim()){toast('Select or enter an original line');return;}expr.result='ORIGINAL: '+expr.a.trim()+'\n\nREVERSE THE CLAIM:\n[What if the opposite were true?]\n\nREVERSE THE POWER:\n[Who now gets to refuse, leave, or choose?]\n\nSHIFT THE EMOTION:\n[What would this mean if hope became relief, or relief became grief?]\n\nNEW REFRAIN:\n[Write the transformed line here.]';}
if(action==='run-diagnostic')expr.result=diagnose(expr.a);
if(result)result.value=expr.result;}
function handleAct(act){
if(act==='close-tool'){panelOpen=false;root.querySelector('#v2-work').classList.remove('tool-open');return;}
if(act==='cycle-mode'){let list=['focus','explore','expanded'];changeMode(list[(list.indexOf(state.mode)+1)%3]);return;}
if(act==='use-crosswire'||act==='use-wordverse'){markSelection();expr.a=selected||p().stages[state.phase]||'';openTool(act==='use-crosswire'?'crosswire':'wordverse');return;}
if(act==='open-wardrobe'){openTool('wardrobe');return;}
if(act==='open-calibration'){openTool('calibration');return;}
if(act==='open-circuits'){openTool('circuits');return;}
if(act==='new-project'){let q=newProject('Untitled idea',state.paletteTemplate);state.projects.push(q);state.activeId=q.id;state.phase='cluster';panelOpen=false;save();render();root.querySelector('#v2-editor')?.focus();toast('New Spark created. Start writing.');return;}
if(act==='rename-project'){let name=prompt('Rename this Blueprint',p().title);if(name!==null&&name.trim()){p().title=name.trim().slice(0,120);save();render();}return;}
if(act==='duplicate-project'){let q=clone(p());q.id=uuid();q.title+=' (copy)';q.createdAt=Date.now();q.updatedAt=Date.now();state.projects.push(q);state.activeId=q.id;save();render();return;}
if(act==='delete-project'){if(!confirm('Delete this Blueprint and all its writing? Export a backup first.'))return;let idx=state.projects.findIndex(x=>x.id===state.activeId);state.projects.splice(idx,1);if(!state.projects.length)state.projects.push(newProject('Untitled idea',state.paletteTemplate));state.activeId=state.projects[0].id;save();render();return;}
if(act==='save-outtake'){markSelection();addOuttake(selected||p().stages[state.phase]);return;}
if(act==='save-experiment'){let field=root.querySelector('#v2-exp-result');if(field)expr.result=field.value;addOuttake(expr.result,null,'crosswire');return;}
if(act==='copy-seed'){copyText(p().legacySeed);return;}
if(act==='run-collision'||act==='run-reversal'||act==='run-diagnostic'){runExperiment(act);return;}
if(act==='insert-result'){let field=root.querySelector('#v2-exp-result');if(field)expr.result=field.value;insertText(expr.result);return;}
if(act==='add-word'){let el=root.querySelector('#v2-word-new'),value=el?.value.trim();if(value&&!(p().words||[]).includes(value)){p().words.push(value);save();renderTool();}return;}
if(act==='find-ending'){let ending=(root.querySelector('#v2-ending')?.value||'').trim().toLowerCase();let found=p().words.filter(w=>w.toLowerCase().endsWith(ending)&&ending);root.querySelector('#v2-ending-result').textContent=found.length?found.join(', '):'No written ending matches in your saved words.';return;}
if(act==='add-category'){let el=root.querySelector('#v2-new-category'),name=el?.value.trim();if(!name)return;if(Object.keys(p().palette).some(x=>x.toLowerCase()===name.toLowerCase())){toast('Category already exists');return;}p().palette[name]=[];state.paletteTemplate[name]=[];save();renderTool();return;}
if(act==='backup-json'){save();download('Laced_Notes_V2_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),'application/json');toast('JSON backup exported');return;}
if(act==='backup-text'){let body=p().title+'\n\n'+stages.map(s=>s[1].toUpperCase()+'\n'+p().stages[s[0]]).join('\n\n---------\n\n')+'\n\nLEGACY SEED:\n'+p().legacySeed+'\n\nLEGACY SCRATCH:\n'+p().legacyScratch+'\n\nOUTTAKES:\n'+p().outtakes.map(o=>o.name+'\n'+o.text).join('\n\n');download(safeName()+'.txt',body);return;}
}
root.addEventListener('input',e=>{
let t=e.target;
if(t.id==='v2-editor'){p().stages[state.phase]=t.value;root.querySelector('#v2-count').textContent=t.value.trim().split(/\s+/).filter(Boolean).length+' words';save();}
if(t.id==='v2-name'){p().title=t.value.trim()||'Untitled idea';let head=root.querySelector('.v2-project');if(head)head.textContent=p().title+' ▾';save();}
if(t.id==='v2-exp-result')expr.result=t.value;
if(t.id==='v2-exp-a')expr.a=t.value;if(t.id==='v2-exp-b')expr.b=t.value;
if(t.id==='v2-word-search'){let needle=t.value.toLowerCase();root.querySelectorAll('[data-word-row]').forEach(x=>x.hidden=!x.textContent.toLowerCase().includes(needle));}
if(t.id==='v2-search'){let needle=t.value.toLowerCase();root.querySelectorAll('[data-project-id]').forEach(x=>x.closest('.v2-row').hidden=!x.closest('.v2-row').textContent.toLowerCase().includes(needle));}
});
root.addEventListener('click',e=>{
let t=e.target.closest('button');if(!t)return;
if(t.dataset.stage){setStage(t.dataset.stage);return;}
if(t.dataset.tool){markSelection();openTool(t.dataset.tool);return;}
if(t.dataset.projectId){chooseProject(t.dataset.projectId);return;}
if(t.dataset.mode){changeMode(t.dataset.mode);return;}
if(t.dataset.themeId){state.theme=t.dataset.themeId;save();render();openTool('wardrobe');toast('Wardrobe theme applied');return;}
if(t.dataset.expTab){expTab=t.dataset.expTab;renderTool();return;}
if(t.dataset.insertSection){markSelection();insertText('\n['+t.dataset.insertSection+']\n\n');return;}
if(t.dataset.wordInsert!==undefined){markSelection();insertText(p().words[+t.dataset.wordInsert]);return;}
if(t.dataset.wordRemove!==undefined){p().words.splice(+t.dataset.wordRemove,1);save();renderTool();return;}
if(t.dataset.paletteInsert){markSelection();insertText(p().palette[t.dataset.paletteInsert][+t.dataset.i]);return;}
if(t.dataset.paletteRemove){let key=t.dataset.paletteRemove,index=+t.dataset.i,value=p().palette[key][index];p().palette[key].splice(index,1);if(Array.isArray(state.paletteTemplate[key]))state.paletteTemplate[key]=state.paletteTemplate[key].filter(x=>x!==value);save();renderTool();return;}
if(t.dataset.paletteAdd){let k=t.dataset.paletteAdd,input=[...root.querySelectorAll('[data-palette-input]')].find(x=>x.dataset.paletteInput===k),v=input?.value.trim();if(v&&!p().palette[k].includes(v)){p().palette[k].push(v);if(!Array.isArray(state.paletteTemplate[k]))state.paletteTemplate[k]=[];if(!state.paletteTemplate[k].includes(v))state.paletteTemplate[k].push(v);save();renderTool();}return;}
if(t.dataset.paletteDelete){let k=t.dataset.paletteDelete;if(confirm('Remove category '+k+' and its choices?')){delete p().palette[k];delete state.paletteTemplate[k];save();renderTool();}return;}
if(t.dataset.paletteRename){let k=t.dataset.paletteRename,v=prompt('Rename category',k)?.trim();if(v&&v!==k&&!p().palette[v]){p().palette[v]=p().palette[k];delete p().palette[k];state.paletteTemplate[v]=state.paletteTemplate[k]||[];delete state.paletteTemplate[k];save();renderTool();}return;}
if(t.dataset.outCompare){compareId=t.dataset.outCompare;renderTool();return;}
if(t.dataset.outCopy){let out=p().outtakes.find(o=>o.id===t.dataset.outCopy);if(out)copyText(out.text);return;}
if(t.dataset.outRename){let out=p().outtakes.find(o=>o.id===t.dataset.outRename);let n=out&&prompt('Rename Outtake',out.name);if(n?.trim()){out.name=n.trim();save();renderTool();}return;}
if(t.dataset.outRemove){let idx=p().outtakes.findIndex(o=>o.id===t.dataset.outRemove);if(idx>=0&&confirm('Delete this saved Outtake?')){p().outtakes.splice(idx,1);if(compareId===t.dataset.outRemove)compareId=null;save();renderTool();}return;}
if(t.dataset.outRestore){let out=p().outtakes.find(o=>o.id===t.dataset.outRestore);if(!out)return;if(!confirm('Replace the current '+state.phase+' draft with this saved alternative? Your current draft will first be preserved in Outtakes.'))return;
let current=p().stages[state.phase];if(current.trim())p().outtakes.push({id:uuid(),name:'Before restore · '+new Date().toLocaleString(),text:current,stage:state.phase,type:'restore-safety',createdAt:Date.now()});
p().stages[state.phase]=out.text;save();render();openTool('outtakes');toast('Restored with recoverable prior draft');return;}
if(t.dataset.act)handleAct(t.dataset.act);
});
root.addEventListener('mouseup',e=>{if(e.target.id==='v2-editor')markSelection()});root.addEventListener('keyup',e=>{if(e.target.id==='v2-editor')markSelection()});
root.addEventListener('change',async e=>{
if(e.target.id!=='v2-import')return;let file=e.target.files?.[0];if(!file)return;if(file.size>15e6){toast('Choose a backup under 15 MB');return;}
try{let data=JSON.parse(await file.text());let arr;if(data.version===2&&Array.isArray(data.projects))arr=data.projects.map(v2Project).filter(Boolean);else if(Array.isArray(data.projects))arr=data.projects.filter(x=>x&&typeof x.title==='string').map(fromLegacy);else throw Error('No valid projects');if(!arr.length||arr.length>1000)throw Error('No usable projects');
for(let q of arr){q.id=uuid();q.title=q.title+' (imported)';state.projects.push(q);}
state.activeId=arr[0].id;save();render();toast('Imported '+arr.length+' Blueprints as copies');}catch(err){toast('Import failed: '+err.message);}
});
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save()});
render();save();
})();
