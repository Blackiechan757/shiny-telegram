// =========================================================
// CHROMA-LEX: UNIVERSAL STUDIO
// =========================================================

const CONFIG = { storageKey: 'chromalex_v11', secretsKey: 'chromalex_secrets' };

let appState = {
    title: "Untitled Project",
    tree: [{ id: 'ch-1', title: 'Chapter 1', type: 'folder', children: [{ id: 'p-1', title: 'Page 1', type: 'page', contentId: 'c-1' }] }],
    content: { 'c-1': "The blank page awaits..." },
    notes: [], 
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
    renderInspector('notes'); 
    document.getElementById('dailyQuote').innerText = ["“Poetry is truth in its Sunday clothes.”","“A poem begins as a lump in the throat.”"][Math.floor(Math.random()*2)];
});

// --- CORE ---
function renderTree() { document.getElementById('fileTree').innerHTML = buildHtml(appState.tree); }
function buildHtml(nodes) { return nodes.map(n => { const a=n.id===activeId?'active':''; const i=n.type==='folder'?'📂':'📄'; let h=`<div class="tree-node ${a}" onclick="selectNode('${n.id}')" oncontextmenu="openCtx(event, '${n.id}')" ontouchstart="touchCtx(event, '${n.id}')" ontouchend="clearTouchCtx()"><span class="mr-2 opacity-50 text-[10px]">${i}</span><span class="truncate">${n.title}</span></div>`; if(n.children) h+=`<div class="tree-children pl-2">${buildHtml(n.children)}</div>`; return h; }).join(''); }

function selectNode(id) {
    const node = findNode(appState.tree, id); if(!node) return;
    activeId = id; renderTree();
    
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
        if(window.innerWidth < 768) toggleDrawer();
    }
}

function addChapter() { appState.tree.push({ id: `f-${Date.now()}`, title: 'New Chapter', type: 'folder', children: [] }); saveData(); renderTree(); }

// --- UI & TOOLS ---
function toggleDrawer() { 
    const sb = document.getElementById('sidebar');
    const overlay = document.getElementById('drawerOverlay');
    if(sb.classList.contains('-translate-x-full')) {
        sb.classList.remove('-translate-x-full');
        overlay.classList.add('active');
    } else {
        sb.classList.add('-translate-x-full');
        overlay.classList.remove('active');
    }
}

function toggleInspector() {
    const i = document.getElementById('inspector');
    // On desktop it's static, on mobile it slides
    if(window.innerWidth < 768) {
        if(i.classList.contains('translate-x-full')) i.classList.remove('translate-x-full');
        else i.classList.add('translate-x-full');
    } else {
        // Desktop toggle logic if needed (currently static)
        i.classList.toggle('hidden');
    }
}

function openView(id) { 
    const v=document.getElementById('viewOverlay'); v.classList.remove('hidden','flex'); v.classList.add('flex');
    const c=document.getElementById('viewContent');
    document.getElementById('viewTitle').innerText = id==='commerce'?'Store Manager':(id==='design'?'Typesetter':'Settings');
    
    // Lazy load content
    if(id==='settings') c.innerHTML = `<div class="max-w-md mx-auto space-y-4"><label class="text-xs font-bold text-gray-500">Gemini API Key</label><input id="sKey" type="password" class="w-full p-3 bg-white/5 border border-white/10 rounded text-white" value="${getSecrets().geminiKey||''}"><label class="text-xs font-bold text-gray-500">Google Sheet URL</label><input id="sUrl" class="w-full p-3 bg-white/5 border border-white/10 rounded text-white" value="${getSecrets().googleScriptUrl||''}"><button onclick="saveKeys()" class="w-full py-3 bg-yellow-600 text-black font-bold rounded">Save Keys</button></div>`;
    else c.innerHTML = '<div class="text-center text-gray-500 mt-20">Feature Module Loaded</div>';
    
    if(window.innerWidth < 768) toggleDrawer();
}
function closeView(){ document.getElementById('viewOverlay').classList.add('hidden'); document.getElementById('viewOverlay').classList.remove('flex'); }

// --- CONTEXT MENU (Mobile Optimized) ---
let touchTimer = null;
function touchCtx(e, id) { touchTimer = setTimeout(() => openCtx(e.touches[0], id), 600); }
function clearTouchCtx() { clearTimeout(touchTimer); }

function openCtx(e, id) {
    e.preventDefault(); 
    ctxTarget = id; 
    const m = document.getElementById('ctxMenu');
    m.classList.remove('hidden');
    requestAnimationFrame(() => m.classList.add('active')); // Animation trigger
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Bounds check
    const menuW = 192;
    if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 10;
    if (y + 200 > window.innerHeight) y = window.innerHeight - 200;
    
    m.style.left = `${x}px`; 
    m.style.top = `${y}px`;
}

function ctxAction(a) { 
    document.getElementById('ctxMenu').classList.remove('active');
    setTimeout(() => document.getElementById('ctxMenu').classList.add('hidden'), 200);
    
    const node = findNode(appState.tree, ctxTarget);
    if(a==='rename') { const x=prompt("Name", node.title); if(x) node.title=x; }
    if(a==='add_page') { const c=`c-${Date.now()}`; node.children.push({id:`p-${Date.now()}`, title:'New Page', type:'page', contentId:c}); appState.content[c]=""; }
    if(a==='open_mosaic') { selectNode(node.id); }
    if(a==='delete') { deleteNode(ctxTarget); switchTab('write'); }
    saveData(); renderTree(); 
}

// --- SYSTEM ---
function saveData(){ localStorage.setItem(CONFIG.storageKey, JSON.stringify(appState)); showToast("Saved"); }
function loadData(){ const d=localStorage.getItem(CONFIG.storageKey); if(d) appState={...appState, ...JSON.parse(d)}; }
function setupEvents(){ 
    const ed=document.getElementById('editor'); 
    ed.addEventListener('input', ()=>{ appState.content[activeContentId]=ed.value; if(lensMode) updateLens(); updateStats(); clearTimeout(autosaveTimer); autosaveTimer=setTimeout(saveData,1000); }); 
    document.addEventListener('click', e=>{if(!e.target.closest('#ctxMenu')) {document.getElementById('ctxMenu').classList.remove('active'); setTimeout(()=>document.getElementById('ctxMenu').classList.add('hidden'),200);}});
}
function findNode(n,id){ for(let i of n){ if(i.id===id)return i; if(i.children){const f=findNode(i.children,id); if(f)return f;} } return null; }
function deleteNode(id){ const i=appState.tree.findIndex(n=>n.id===id); if(i>-1) appState.tree.splice(i,1); else appState.tree.forEach(n=>n.children && (n.children=n.children.filter(c=>c.id!==id))); saveData(); renderTree(); }
function switchTab(id) { document.querySelectorAll('.tab-content').forEach(e=>e.classList.add('hidden')); document.getElementById(`content-${id}`).classList.remove('hidden'); }
function toggleTheme() { appState.settings.theme = appState.settings.theme==='dark'?'light':'dark'; saveData(); applyTheme(); }
function applyTheme() { document.body.className = appState.settings.theme==='dark'?'dark bg-black text-gray-200':'light bg-gray-50 text-gray-900'; }
function showToast(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('opacity-0'); setTimeout(()=>t.classList.add('opacity-0'),2000); }
function updateStats(){ document.getElementById('wordCount').innerText = document.getElementById('editor').value.split(/\s+/).length + " words"; }
function getSecrets() { const s=JSON.parse(localStorage.getItem(CONFIG.secretsKey)); return s?s:{}; }
function saveKeys(){ localStorage.setItem(CONFIG.secretsKey, JSON.stringify({geminiKey:document.getElementById('sKey').value, googleScriptUrl:document.getElementById('sUrl').value})); showToast("Keys Saved"); closeView(); }

// --- INSPECTOR ---
function setInspectorTab(t) {
    ['oracle','notes'].forEach(x=>{ document.getElementById(`tab-${x}`).classList.remove('text-purple-400','border-b-2','border-purple-500'); document.getElementById(`insp-${x}`).classList.add('hidden'); });
    document.getElementById(`tab-${t}`).classList.add('text-purple-400','border-b-2','border-purple-500'); document.getElementById(`insp-${t}`).classList.remove('hidden');
}
function renderInspector(t) { if(t==='notes') document.getElementById('researchList').innerHTML = appState.notes.map(n=>`<div class="p-3 bg-white/5 rounded text-xs text-gray-300 border border-white/5 relative group">${n.text}<button onclick="delNote(${n.id})" class="absolute top-1 right-1 text-red-500 hidden group-hover:block">✕</button></div>`).join(''); }
function delNote(id){ appState.notes=appState.notes.filter(i=>i.id!==id); saveData(); renderInspector('notes'); }
async function askOracle() { const q=document.getElementById('oracleInput').value; if(!q)return; showOracle("Consulting...",true); const r=await callGemini(`Research: ${q}. Summary.`, "Librarian"); showOracle(r); }
async function quickOracle(m) { const s=window.getSelection().toString()||document.getElementById('editor').value.substring(0,50); showOracle("Refracting...",true); const r=await callGemini(`Analyze: ${s}. Mode: ${m}`, "Muse"); showOracle(r); }
function showOracle(t,l=false) { document.getElementById('oracleResult').classList.remove('hidden'); document.getElementById('oracleText').innerHTML = l?`<span class="animate-pulse">${t}</span>`:t; window.currentOracleText=t; }
function clipToNotes() { if(window.currentOracleText) { appState.notes.unshift({id:Date.now(), text:window.currentOracleText}); saveData(); renderInspector('notes'); showToast("Clipped"); } }
async function callGemini(p,c){ const k=getSecrets().geminiKey; if(!k)return"Add Key in Settings"; try{ const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${k}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:`Role: ${c}. ${p}`}]}]})}); const d=await r.json(); return d.candidates[0].content.parts[0].text; }catch(e){return"AI Error";} }

// --- FEATURES ---
function toggleTypewriter(){ appState.settings.typewriter=!appState.settings.typewriter; document.getElementById('btnTypewriter').classList.toggle('text-yellow-500'); document.getElementById('editorWrapper').classList.toggle('typewriter-active'); if(appState.settings.typewriter) handleTypewriter(); }
function handleTypewriter(){ if(!appState.settings.typewriter)return; const ta=document.getElementById('editor'); const lh=36; const l=ta.value.substring(0, ta.selectionStart).split("\n").length; ta.scrollTo({ top: (l-1)*lh, behavior: 'smooth' }); }
function toggleLens(){ lensMode=!lensMode; const b=document.getElementById('btnLens'); const w=document.getElementById('content-write'); if(lensMode){ b.classList.add('text-purple-400'); document.getElementById('editor').classList.add('text-transparent'); document.getElementById('editorOverlay').classList.remove('hidden'); updateLens(); } else { b.classList.remove('text-purple-400'); document.getElementById('editor').classList.remove('text-transparent'); document.getElementById('editorOverlay').classList.add('hidden'); } }
function updateLens(){ if(!lensMode)return; const txt=document.getElementById('editor').value; let h=txt.replace(/\b(\w+ly)\b/gi, '<span style="color:#c084fc;font-weight:bold">$1</span>').replace(/\b(was|were)\b/gi, '<span style="color:#f87171;text-decoration:underline">$1</span>'); document.getElementById('editorOverlay').innerHTML=h; }
function renderMosaic(f){ const g=document.getElementById('mosaicGrid'); if(!f.children.length){g.innerHTML='<div class="col-span-3 text-center text-gray-500 mt-10">Empty</div>';return;} g.innerHTML=f.children.map(n=>`<div class="p-4 bg-white/5 rounded border border-white/10 h-32 flex flex-col justify-between hover:border-yellow-500 cursor-pointer" onclick="selectNode('${n.id}')"><span class="font-bold text-gray-300">${n.title}</span><span class="text-[10px] text-gray-500 uppercase">${n.type}</span></div>`).join(''); }
function toggleZen(){ document.body.classList.toggle('zen-active'); if(document.body.classList.contains('zen-active')){ document.getElementById('sidebar').classList.add('hidden'); document.getElementById('inspector').classList.add('hidden'); } else { document.getElementById('sidebar').classList.remove('hidden'); document.getElementById('inspector').classList.remove('hidden'); } }
class ParticleEngine{constructor(){this.c=document.getElementById('dustCanvas');this.ctx=this.c.getContext('2d');this.p=[];this.resize();window.onresize=()=>this.resize();this.init();this.animate();}resize(){this.c.width=window.innerWidth;this.c.height=window.innerHeight;}init(){for(let i=0;i<40;i++)this.p.push({x:Math.random()*this.c.width,y:Math.random()*this.c.height,s:Math.random()*2,v:Math.random()*.5});}animate(){this.ctx.clearRect(0,0,this.c.width,this.c.height);this.p.forEach(p=>{p.y-=p.v;if(p.y<0)p.y=this.c.height;this.ctx.fillStyle='rgba(212,175,55,0.4)';this.ctx.beginPath();this
