// =========================================================
// CHROMA-LEX: MAGNATE EDITION
// =========================================================

const CONFIG = { storageKey: 'chromalex_magnate_final', secretsKey: 'chromalex_secrets' };

let appState = {
    title: "Untitled Project",
    tree: [{ id: 'ch-1', title: 'Chapter 1', type: 'folder', children: [{ id: 'p-1', title: 'Page 1', type: 'page', contentId: 'c-1' }] }],
    content: { 'c-1': "The blank page awaits..." },
    notes: [], 
    ideas: [],
    settings: { theme: 'dark', sound: true, typewriter: false, goal: 500 }
};

let activeId = 'p-1';
let activeContentId = 'c-1';
let autosaveTimer = null;
let ctxTarget = null;
let lensMode = false;

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    applyTheme();
    renderTree();
    if(activeId) selectNode(activeId);
    new ParticleEngine();
    window.soundFx = new SoundEngine();
    setupEvents();
    renderInspector('notes'); renderInspector('ideas');
    document.getElementById('dailyQuote').innerText = ["“Poetry is truth in its Sunday clothes.”","“A poem begins as a lump in the throat.”","“Painting is silent poetry.”"][Math.floor(Math.random()*3)];
});

// --- CORE TREE & EDITOR ---
function renderTree() { document.getElementById('fileTree').innerHTML = buildHtml(appState.tree); document.getElementById('projectTitle').value = appState.title; }
function buildHtml(nodes) { return nodes.map(n => { const a=n.id===activeId?'active':''; const i=n.type==='folder'?'📂':'📄'; let h=`<div class="tree-node ${a}" onclick="selectNode('${n.id}')" oncontextmenu="openCtx(event, '${n.id}')"><span class="mr-2 opacity-50 text-[10px]">${i}</span><span class="truncate">${n.title}</span></div>`; if(n.children) h+=`<div class="tree-children pl-2">${buildHtml(n.children)}</div>`; return h; }).join(''); }

function selectNode(id) {
    const node = findNode(appState.tree, id); if(!node) return;
    activeId = id; renderTree();
    
    // Switch Views based on Type
    if(node.type === 'page') {
        switchTab('write');
        activeContentId = node.contentId;
        const text = appState.content[activeContentId] || "";
        document.getElementById('editor').value = text;
        document.getElementById('activeDocLabel').innerText = node.title;
        if(lensMode) updateLens();
        if(window.innerWidth < 768) toggleDrawer();
    } else if (node.type === 'folder') {
        renderMosaic(node);
        switchTab('mosaic');
    }
}

function addChapter() { appState.tree.push({ id: `f-${Date.now()}`, title: 'New Chapter', type: 'folder', children: [] }); saveData(); renderTree(); }

// --- THE LENS (X-RAY) ---
function toggleLens() {
    lensMode = !lensMode;
    const b = document.getElementById('btnLens');
    const w = document.getElementById('content-write');
    if(lensMode) { b.classList.add('text-purple-400'); w.classList.add('lens-active'); document.getElementById('lensStatus').classList.remove('hidden'); updateLens(); }
    else { b.classList.remove('text-purple-400'); w.classList.remove('lens-active'); document.getElementById('lensStatus').classList.add('hidden'); }
}
function updateLens() {
    if(!lensMode) return;
    const txt = document.getElementById('editor').value;
    let html = txt.replace(/\b(\w+ly)\b/gi, '<span class="hl-adv">$1</span>')
                  .replace(/\b(was|were|is|are|been)\s+(\w+ed)\b/gi, '<span class="hl-pass">$1 $2</span>')
                  .replace(/\b(felt|saw|heard|noticed)\b/gi, '<span class="hl-filt">$1</span>');
    document.getElementById('editorOverlay').innerHTML = html;
}

// --- THE MOSAIC (CORKBOARD) ---
function renderMosaic(folder) {
    const g = document.getElementById('mosaicGrid');
    if(!folder.children || folder.children.length===0) { g.innerHTML='<div class="col-span-full text-center text-gray-500 mt-20">Empty Chapter</div>'; return; }
    g.innerHTML = folder.children.map(n => {
        let p = "Folder"; if(n.type==='page') p = (appState.content[n.contentId]||"").substring(0,150)+"...";
        return `<div class="mosaic-card group" onclick="selectNode('${n.id}')"><div class="flex justify-between mb-2"><h4>${n.title}</h4><span class="text-[10px] text-gray-600">${n.type.toUpperCase()}</span></div><p>${p}</p></div>`;
    }).join('');
}

// --- INSPECTOR ---
function setInspectorTab(t) {
    ['oracle','notes','ideas'].forEach(x=>{ document.getElementById(`tab-${x}`).classList.remove('text-purple-400','border-b-2','border-purple-500'); document.getElementById(`insp-${x}`).classList.add('hidden'); });
    document.getElementById(`tab-${t}`).classList.add('text-purple-400','border-b-2','border-purple-500'); document.getElementById(`insp-${t}`).classList.remove('hidden');
}
function renderInspector(t) {
    if(t==='notes') document.getElementById('researchList').innerHTML = appState.notes.map(n=>`<div class="p-2 bg-white/5 rounded text-xs text-gray-300 border border-white/5 relative group">${n.text}<button onclick="delItem('notes',${n.id})" class="absolute top-1 right-1 text-red-500 hidden group-hover:block">✕</button></div>`).join('');
    if(t==='ideas') document.getElementById('ideaList').innerHTML = appState.ideas.map(n=>`<div class="p-2 bg-white/5 rounded text-xs text-purple-300 border border-purple-500/20 relative group">${n.text}<button onclick="delItem('ideas',${n.id})" class="absolute top-1 right-1 text-red-500 hidden group-hover:block">✕</button></div>`).join('');
}
function addIdea(){ const v=document.getElementById('ideaInput').value; if(v){ appState.ideas.unshift({id:Date.now(), text:v}); saveData(); renderInspector('ideas'); document.getElementById('ideaInput').value=''; } }
function delItem(k,id){ appState[k]=appState[k].filter(i=>i.id!==id); saveData(); renderInspector(k); }

// --- AI ORACLE ---
async function askOracle() { const q=document.getElementById('oracleInput').value; if(!q)return; showOracle("Consulting...",true); const r=await callGemini(`Research: ${q}. Summary.`, "Librarian"); showOracle(r); }
async function quickOracle(m) { const s=window.getSelection().toString()||document.getElementById('editor').value.substring(0,50); showOracle("Refracting...",true); let p=""; if(m==='synonym')p=`Synonyms for "${s}"`; if(m==='rhyme')p=`Rhymes for "${s}"`; if(m==='etymology')p=`Etymology of "${s}"`; if(m==='sensory')p=`Describe "${s}" via 5 senses`; const r=await callGemini(p,"Muse"); showOracle(r); }
function showOracle(t,l=false) { document.getElementById('oracleResult').classList.remove('hidden'); document.getElementById('oracleText').innerHTML = l?`<span class="animate-pulse">${t}</span>`:t; window.curOracle=t; }
function clipToNotes() { if(window.curOracle){ appState.notes.unshift({id:Date.now(), text:window.curOracle}); saveData(); renderInspector('notes'); showToast("Clipped"); } }

// --- COMMERCE & DESIGN VIEWS ---
function openView(id) { 
    const v=document.getElementById('viewOverlay'); v.classList.remove('hidden','flex'); v.classList.add('flex');
    const c=document.getElementById('viewContent');
    document.getElementById('viewTitle').innerText = id==='commerce'?'Store Manager':(id==='design'?'Typesetter':'Settings');
    if(id==='settings') c.innerHTML = `<div class="max-w-md mx-auto space-y-4"><label class="text-xs font-bold text-gray-500">Gemini API Key</label><input id="sKey" type="password" class="w-full p-3 bg-white/5 border border-white/10 rounded text-white" value="${getSecrets().geminiKey||''}"><label class="text-xs font-bold text-gray-500">Google Sheet URL</label><input id="sUrl" class="w-full p-3 bg-white/5 border border-white/10 rounded text-white" value="${getSecrets().googleScriptUrl||''}"><button onclick="saveKeys()" class="w-full py-3 bg-yellow-600 text-black font-bold rounded">Save Keys</button></div>`;
    else c.innerHTML = '<div class="text-center text-gray-500 mt-20">View Loaded. (Use previous Commerce/Typesetter code here for full UI)</div>';
    if(window.innerWidth < 768) toggleDrawer();
}
function closeView(){ document.getElementById('viewOverlay').classList.add('hidden'); document.getElementById('viewOverlay').classList.remove('flex'); }
function saveKeys(){ localStorage.setItem(CONFIG.secretsKey, JSON.stringify({geminiKey:document.getElementById('sKey').value, googleScriptUrl:document.getElementById('sUrl').value})); showToast("Saved"); closeView(); }

// --- SYSTEM ---
function saveData(){ appState.title=document.getElementById('projectTitle').value; localStorage.setItem(CONFIG.storageKey, JSON.stringify(appState)); }
function loadData(){ const d=localStorage.getItem(CONFIG.storageKey); if(d) appState={...appState, ...JSON.parse(d)}; }
function setupEvents(){ const ed=document.getElementById('editor'); ed.addEventListener('input', ()=>{ appState.content[activeContentId]=ed.value; if(lensMode) updateLens(); updateStats(); clearTimeout(autosaveTimer); autosaveTimer=setTimeout(saveData,1000); }); ed.addEventListener('keydown', e=>{if(appState.settings.sound && (e.key.length===1||e.key==='Enter'))window.soundFx.play();}); document.addEventListener('click', e=>{if(!e.target.closest('#ctxMenu'))document.getElementById('ctxMenu').classList.remove('active');}); }
function findNode(n,id){ for(let i of n){ if(i.id===id)return i; if(i.children){const f=findNode(i.children,id); if(f)return f;} } return null; }
function deleteNode(id){ const i=appState.tree.findIndex(n=>n.id===id); if(i>-1) appState.tree.splice(i,1); else appState.tree.forEach(n=>n.children && (n.children=n.children.filter(c=>c.id!==id))); saveData(); renderTree(); }
function openCtx(e,id){ e.preventDefault(); ctxTarget=id; const m=document.getElementById('ctxMenu'); m.classList.add('active'); m.style.left=e.clientX+'px'; m.style.top=e.clientY+'px'; }
function ctxAction(a){ document.getElementById('ctxMenu').classList.remove('active'); const n=findNode(appState.tree, ctxTarget); if(a==='rename'){const x=prompt("Name",n.title); if(x)n.title=x;} if(a==='add_page'&&n.type==='folder'){const c=`c-${Date.now()}`; n.children.push({id:`p-${Date.now()}`, title:'New Page', type:'page', contentId:c}); appState.content[c]="";} if(a==='open_mosaic')selectNode(n.id); if(a==='delete')deleteNode(ctxTarget); saveData(); renderTree(); }
function switchTab(id) { document.querySelectorAll('.tab-content').forEach(e=>e.classList.add('hidden')); document.getElementById(`content-${id}`).classList.remove('hidden'); }
function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('-translate-x-full'); document.getElementById('sidebar').classList.toggle('absolute'); }
function toggleInspector(){ document.getElementById('inspector').classList.toggle('translate-x-full'); document.getElementById('inspector').classList.toggle('absolute'); }
function toggleTheme(){ appState.settings.theme=appState.settings.theme==='dark'?'light':'dark'; saveData(); applyTheme(); }
function applyTheme(){ document.body.className=appState.settings.theme==='dark'?'dark bg-black text-gray-200':'light bg-gray-50 text-gray-900'; }
function toggleSound(){ appState.settings.sound=!appState.settings.sound; saveData(); showToast(appState.settings.sound?"Audio On":"Muted"); }
function toggleTypewriter(){ appState.settings.typewriter=!appState.settings.typewriter; document.getElementById('btnTypewriter').classList.toggle('text-yellow-500'); document.getElementById('editorWrapper').classList.toggle('typewriter-active'); }
function toggleZen(){ document.body.classList.toggle('zen-active'); } // Add specific zen CSS as needed
function showToast(m){ const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('opacity-0'); setTimeout(()=>t.classList.add('opacity-0'),3000); }
function updateStats(){ document.getElementById('wordCount').innerText = document.getElementById('editor').value.split(/\s+/).length + " words"; }
function getSecrets() { const s=JSON.parse(localStorage.getItem(CONFIG.secretsKey)); return s?s:{}; }
async function callGemini(p,r){ const k=getSecrets().geminiKey; if(!k)return"Add API Key"; try{const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${k}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:`Role: ${r}. ${p}`}]}]})});const d=await res.json();return d.candidates[0].content.parts[0].text;}catch(e){return"Error";} }
class SoundEngine{constructor(){this.ctx=null;}play(){if(!appState.settings.sound)return;if(!this.ctx)this.ctx=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume();const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+0.05);}}
class ParticleEngine{constructor(){this.c=document.getElementById('dustCanvas');this.ctx=this.c.getContext('2d');this.p=[];this.resize();window.onresize=()=>this.resize();this.init();this.animate();}resize(){this.c.width=window.innerWidth;this.c.height=window.innerHeight;}init(){for(let i=0;i<40;i++)this.p.push({x:Math.random()*this.c.width,y:Math.random()*this.c.height,s:Math.random()*2,v:Math.random()*.5});}animate(){this.ctx.clearRect(0,0,this.c.width,this.c.height);this.p.forEach(p=>{p.y-=p.v;if(p.y<0)p.y=this.c.height;this.ctx.fillStyle='rgba(212,175,55,0.4)';this.ctx.beginPath();this.ctx.arc(p.x,p.y,p.s,0,6.28);this.ctx.fill();});requestAnimationFrame(()=>this.animate());}}
