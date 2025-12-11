// =========================================================
// CHROMA-LEX STUDIO: MASTER EDITION
// =========================================================

const STORAGE_KEY = 'chromaLexPWA_v9';
const SECRETS_KEY = 'chromaLexSecrets';

let projectData = {
    bookTree: [{ id: 'ch-1', type: 'folder', title: 'Chapter 1', children: [{ id: 'p-1', type: 'page', title: 'The Beginning', contentId: 'c-1' }] }],
    drafts: [],
    contentMap: { 'c-1': "The quiet river runs deep..." },
    coverDesign: { titleX: '50px', titleY: '50px', authorX: '50px', authorY: '400px', bgColor: '#1a1a1a' },
    nexusItems: [],
    designSettings: { headerFont: "'Cinzel', serif", bodyFont: "'Cormorant Garamond', serif", fontSize: "12", lineHeight: "1.6", paperType: "paper-cream", useDropCaps: false, divider: "***" },
    settings: { goal: 500, theme: 'dark', autosaveInterval: 5000 }
};

let activeNodeId = 'p-1';
let activeContentId = 'c-1';
let contextTargetId = null;
let autosaveTimer = null;
let typewriterMode = false;
let nexusMode = 'idea';
let dragTarget = null;

const quotes = ["“Poetry is truth in its Sunday clothes.”", "“Genuine poetry can communicate before it is understood.”", "“A poem begins as a lump in the throat.”"];

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    applyTheme(projectData.settings.theme);
    setTimeout(() => { new ParticleEngine(); new SoundEngine(); }, 500);
    setupEvents();
    renderSidebarTree();
    renderDrafts();
    updateGoalRing();
    document.getElementById('dailyQuote').innerText = quotes[Math.floor(Math.random() * quotes.length)];
    if(activeNodeId) selectNode(activeNodeId);
    setNexusMode('idea'); // Init Nexus UI
});

// --- CORE UTILS ---
function getSecrets() { const d = localStorage.getItem(SECRETS_KEY); return d ? JSON.parse(d) : { geminiKey: '', googleScriptUrl: '' }; }
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData)); }
function loadData() { const d = localStorage.getItem(STORAGE_KEY); if(d) projectData = {...projectData, ...JSON.parse(d)}; }
function showToast(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('opacity-0'); setTimeout(()=>t.classList.add('opacity-0'),3000); }

// --- TREE & SIDEBAR ---
function renderSidebarTree() {
    document.getElementById('fileTree').innerHTML = buildTreeHTML(projectData.bookTree);
}
function buildTreeHTML(nodes) {
    if(!nodes) return '';
    return nodes.map(n => {
        const isActive = n.id === activeNodeId ? 'active' : '';
        const icon = n.type === 'folder' ? '📂' : '📄';
        let html = `<div class="tree-node ${isActive}" onclick="selectNode('${n.id}')" oncontextmenu="openContextMenu(event, '${n.id}')" ontouchstart="handleTouchStart(event, '${n.id}')" ontouchend="handleTouchEnd()"><span class="mr-2 opacity-70 text-[10px]">${icon}</span><span class="truncate">${n.title}</span></div>`;
        if(n.children) html += `<div class="tree-children pl-2">${buildTreeHTML(n.children)}</div>`;
        return html;
    }).join('');
}
function selectNode(id) {
    const node = findNode(projectData.bookTree, id);
    if(node) {
        activeNodeId = id;
        document.getElementById('currentDocLabel').innerText = node.title;
        if(node.type === 'page') { switchTab('write'); loadContent(node.contentId, node.title); }
    }
    renderSidebarTree(); renderDrafts();
    if(window.innerWidth < 768) toggleDrawer();
}

// --- EDITOR & DRAFTS ---
function renderDrafts() {
    document.getElementById('draftsList').innerHTML = (projectData.drafts || []).map((d, i) => `<div class="tree-node ${activeNodeId === d.id ? 'active' : ''}" onclick="selectDraft(${i})" oncontextmenu="openContextMenu(event, '${d.id}', true)"><span class="mr-2 opacity-50">📝</span><span class="truncate">${d.title}</span></div>`).join('');
}
function selectDraft(i) {
    const d = projectData.drafts[i]; activeNodeId = d.id; activeContentId = null; window.currentDraftIndex = i;
    document.getElementById('poemTitle').value = d.title; document.getElementById('poemContent').value = d.content;
    document.getElementById('currentDocLabel').innerText = "Draft";
    switchTab('write'); renderDrafts(); renderSidebarTree(); if(window.innerWidth < 768) toggleDrawer();
}
function createDraft() { projectData.drafts.push({ id: `d-${Date.now()}`, title: 'Untitled Draft', content: '' }); saveData(); renderDrafts(); }
function loadContent(cid, title) {
    activeContentId = cid; window.currentDraftIndex = null;
    document.getElementById('poemTitle').value = title;
    document.getElementById('poemContent').value = projectData.contentMap[cid] || "";
}
function autosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        const t = document.getElementById('poemTitle').value;
        const c = document.getElementById('poemContent').value;
        if(window.currentDraftIndex != null) { projectData.drafts[window.currentDraftIndex].title = t; projectData.drafts[window.currentDraftIndex].content = c; } 
        else if (activeContentId) { projectData.contentMap[activeContentId] = c; const n = findNode(projectData.bookTree, activeNodeId); if(n) n.title = t; }
        saveData(); renderSidebarTree(); renderDrafts();
    }, 1000);
}

// --- NEXUS (COMMAND DECK) ---
function setNexusMode(mode) {
    nexusMode = mode;
    ['idea', 'research', 'prism'].forEach(m => {
        const btn = document.getElementById(`modeBtn-${m}`);
        if(m === mode) { btn.classList.add('bg-white/20', 'text-white'); btn.classList.remove('text-gray-500'); }
        else { btn.classList.remove('bg-white/20', 'text-white'); btn.classList.add('text-gray-500'); }
    });
    const btn = document.getElementById('nexusActionBtn'); const inp = document.getElementById('nexusInput'); const h = document.getElementById('nexusHint');
    if(mode === 'idea') { btn.innerText = "PLANT"; btn.className = "px-6 bg-purple-600/20 text-purple-300 border border-purple-500/50 rounded-xl text-xs font-bold uppercase hover:bg-purple-600 hover:text-white transition"; inp.placeholder = "Enter seed concept..."; h.innerText = "Save idea to fractalize later."; }
    else if(mode === 'research') { btn.innerText = "ASK"; btn.className = "px-6 bg-blue-600/20 text-blue-300 border border-blue-500/50 rounded-xl text-xs font-bold uppercase hover:bg-blue-600 hover:text-white transition"; inp.placeholder = "Question..."; h.innerText = "Ask the Librarian."; }
    else if(mode === 'prism') { btn.innerText = "REFRACT"; btn.className = "px-6 bg-teal-600/20 text-teal-300 border border-teal-500/50 rounded-xl text-xs font-bold uppercase hover:bg-teal-600 hover:text-white transition"; inp.placeholder = "Concept..."; h.innerText = "Deconstruct into 5 senses."; }
}
async function executeNexusAction() {
    const val = document.getElementById('nexusInput').value.trim(); if(!val) return;
    if(nexusMode==='idea') { projectData.nexusItems.unshift({id:Date.now(), type:'idea', content:val, tags:['Seed']}); showToast("Planted 🌱"); }
    else if(nexusMode==='research') { showToast("Asking..."); const res = await callLLM(`Research: ${val}. Concise summary.`, "Librarian"); projectData.nexusItems.unshift({id:Date.now(), type:'research', content:res, query:val}); }
    else if(nexusMode==='prism') { 
        showToast("Refracting..."); 
        try { 
            const res = await callLLM(`Deconstruct "${val}" into 5 senses. JSON format: {"sight":"...","sound":"...","smell":"...","taste":"...","touch":"..."}`, "Mapper"); 
            const json = JSON.parse(res.match(/\{[\s\S]*\}/)[0]); 
            projectData.nexusItems.unshift({id:Date.now(), type:'prism', title:val, senses:json}); 
        } catch(e) { showToast("Error refracting"); }
    }
    saveData(); renderNexus(); document.getElementById('nexusInput').value='';
}
function renderNexus() {
    const g = document.getElementById('nexusGrid'); if(!g) return;
    if(!projectData.nexusItems || projectData.nexusItems.length===0) { g.innerHTML='<div class="col-span-full text-center text-gray-500 mt-10">Nexus Empty</div>'; return; }
    g.innerHTML = projectData.nexusItems.map((i,x) => {
        const del = `<button onclick="projectData.nexusItems.splice(${x},1);saveData();renderNexus()" class="absolute top-2 right-2 text-gray-500 hover:text-red-500">✕</button>`;
        if(i.type==='idea') return `<div class="nexus-card card-idea relative group">${del}<span class="text-[10px] text-purple-400 font-bold uppercase">Idea</span><p class="text-lg font-serif">"${i.content}"</p><button onclick="fractalizeIdea(${i.id})" class="mt-2 text-xs bg-purple-500/10 text-purple-300 px-2 py-1 rounded">💥 Fractalize</button></div>`;
        if(i.type==='research') return `<div class="nexus-card card-research relative group">${del}<span class="text-[10px] text-blue-400 font-bold uppercase">Research: ${i.query}</span><p class="text-xs text-gray-400 font-serif whitespace-pre-wrap">${i.content}</p></div>`;
        if(i.type==='prism') return `<div class="nexus-card card-prism relative group">${del}<span class="text-[10px] text-teal-400 font-bold uppercase">Prism: ${i.title}</span><div class="space-y-1 mt-2">${Object.keys(i.senses).map(k=>`<div class="prism-row"><span class="uppercase text-[9px] text-teal-500 font-bold">${k}</span><span class="prism-val text-xs">${i.senses[k]}</span></div>`).join('')}</div></div>`;
    }).join('');
}
async function fractalizeIdea(id) {
    const item = projectData.nexusItems.find(i=>i.id===id); if(!item) return; showToast("Fractalizing...");
    const res = await callLLM(`Metaphors for "${item.content}". 3 variants pipe separated.`, "Muse");
    res.split('|').forEach(m=>projectData.nexusItems.unshift({id:Date.now()+Math.random(), type:'idea', content:m.trim(), tags:['Fractal']}));
    saveData(); renderNexus();
}

// --- TYPESETTER & COMMERCE ---
function updateDesign() {
    const s = projectData.designSettings;
    s.headerFont=document.getElementById('headerFontSelect').value; s.bodyFont=document.getElementById('bodyFontSelect').value;
    s.fontSize=document.getElementById('baseFontSize').value; s.lineHeight=document.getElementById('baseLineHeight').value;
    saveData();
    const p = document.getElementById('bookPreviewPage'); const h = document.getElementById('previewHeader'); const b = document.getElementById('previewBodyText');
    h.style.fontFamily=s.headerFont; b.style.fontFamily=s.bodyFont; b.style.fontSize=`${s.fontSize}pt`; b.style.lineHeight=s.lineHeight;
}
function setPaper(t) { projectData.designSettings.paperType=t; document.getElementById('bookPreviewPage').className=`book-page-simulation ${t} scale-90`; saveData(); }
async function saveProductToCloud() {
    const url = getSecrets().googleScriptUrl; if(!url) { showToast("Set API URL"); return; }
    const p = { title:document.getElementById('prodTitle').value, price:document.getElementById('prodPrice').value, image:document.getElementById('prodImage').value, link:document.getElementById('prodLink').value, status:'active' };
    try { await fetch(url, {method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(p)}); showToast("Published!"); } catch(e){ showToast("Error"); }
}
async function refreshStoreList() {
    const url = getSecrets().googleScriptUrl; if(!url) return;
    try { const r = await fetch(url); const d = await r.json(); document.getElementById('adminProductList').innerHTML = d.map(p=>`<div class="p-2 bg-white/5 border border-white/10 mb-2 rounded flex justify-between"><span class="text-xs">${p.title}</span><span class="text-xs text-yellow-500">$${p.price}</span></div>`).join(''); } catch(e){}
}

// --- SYSTEM UTILS ---
function toggleTheme() { const n=projectData.settings.theme==='dark'?'light':'dark'; projectData.settings.theme=n; saveData(); applyTheme(n); }
function applyTheme(t) { document.body.classList.toggle('light', t==='light'); document.body.classList.toggle('dark', t!=='light'); }
function addStructureItem(t) { projectData.bookTree.push({id:`f-${Date.now()}`, type:'folder', title:'New Chapter', children:[]}); saveData(); renderSidebarTree(); }
function findNode(nodes, id) { for(let n of nodes) { if(n.id===id) return n; if(n.children) { const f = findNode(n.children, id); if(f) return f; } } return null; }
function deleteNode(nodes, id) { const i = nodes.findIndex(n=>n.id===id); if(i>-1) nodes.splice(i,1); else nodes.forEach(n=>n.children && deleteNode(n.children, id)); }
function handleTypewriterScroll() { if(!typewriterMode) return; const ta=document.getElementById('poemContent'); const lh=28; const l=ta.value.substring(0, ta.selectionStart).split("\n").length; ta.scrollTo({top:(l-1)*lh, behavior:'smooth'}); }
function toggleTypewriterMode() { typewriterMode=!typewriterMode; const b=document.getElementById('typewriterBtn'); if(typewriterMode){ b.classList.add('text-yellow-500'); document.getElementById('editorContainer').classList.add('typewriter-active'); handleTypewriterScroll(); } else { b.classList.remove('text-yellow-500'); document.getElementById('editorContainer').classList.remove('typewriter-active'); } }
function setupEvents() {
    document.getElementById('poemContent').addEventListener('click', handleTypewriterScroll);
    document.getElementById('poemContent').addEventListener('keyup', handleTypewriterScroll);
    document.addEventListener('click', e=>{if(!e.target.closest('#contextMenu'))document.getElementById('contextMenu').classList.add('hidden')});
    document.addEventListener('mousemove', dragMove); document.addEventListener('mouseup', dragEnd);
}
// Context Menu
let touchTimer=null; function handleTouchStart(e,id){touchTimer=setTimeout(()=>openContextMenu(e,id),800);} function handleTouchEnd(){clearTimeout(touchTimer);}
function openContextMenu(e,id,isDraft){ e.preventDefault(); contextTargetId=id; window.isTargetDraft=isDraft; const m=document.getElementById('contextMenu'); m.classList.remove('hidden'); let x=e.clientX||e.touches[0].clientX; let y=e.clientY||e.touches[0].clientY; if(x+200>window.innerWidth)x=window.innerWidth-210; m.style.left=`${x}px`; m.style.top=`${y}px`; }
function contextAction(a) { document.getElementById('contextMenu').classList.add('hidden'); if(window.isTargetDraft && a==='delete'){ const i=projectData.drafts.findIndex(d=>d.id===contextTargetId); projectData.drafts.splice(i,1); saveData(); renderDrafts(); return; } const n=findNode(projectData.bookTree, contextTargetId); if(!n) return; if(a==='rename'){ const nm=prompt("Name:",n.title); if(nm){ n.title=nm; saveData(); renderSidebarTree(); } } if(a==='add_page'&&n.type==='folder'){ const cid=`c-${Date.now()}`; projectData.contentMap[cid]=""; n.children.push({id:`p-${Date.now()}`, type:'page', title:'New Page', contentId:cid}); saveData(); renderSidebarTree(); } if(a==='delete'){ if(confirm("Delete?")){ deleteNode(projectData.bookTree, contextTargetId); saveData(); renderSidebarTree(); switchTab('write'); } } }
// Cover Drag
function startDrag(e,el){ dragTarget=el; e.preventDefault(); }
function dragMove(e){ if(!dragTarget)return; const c=document.getElementById('coverCanvas').getBoundingClientRect(); let x=e.clientX-c.left-(dragTarget.offsetWidth/2); let y=e.clientY-c.top-(dragTarget.offsetHeight/2); dragTarget.style.left=`${x}px`; dragTarget.style.top=`${y}px`; }
function dragEnd(){ if(dragTarget) saveData(); dragTarget=null; }
function uploadCoverImage(i){ const f=i.files[0]; if(!f)return; const r=new FileReader(); r.onload=e=>{ document.getElementById('coverBgImage').src=e.target.result; projectData.coverDesign.image=e.target.result; saveData(); }; r.readAsDataURL(f); }
// Settings & AI
function saveSettings(){ localStorage.setItem(SECRETS_KEY, JSON.stringify({ geminiKey:document.getElementById('geminiKey').value, googleScriptUrl:document.getElementById('googleScriptUrl').value })); closeSettingsModal(); }
function showSettingsModal(){ const s=getSecrets(); document.getElementById('geminiKey').value=s.geminiKey||''; document.getElementById('googleScriptUrl').value=s.googleScriptUrl||''; document.getElementById('settingsModal').classList.remove('hidden'); document.getElementById('settingsModal').classList.add('flex'); }
function closeSettingsModal(){ document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('settingsModal').classList.remove('flex'); }
async function callLLM(p,c){ const k=getSecrets().geminiKey; if(!k)return"Simulated AI"; try{ const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${k}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:`Role: ${c}. Task: ${p}`}]}]})}); const d=await r.json(); return d.candidates[0].content.parts[0].text; }catch(e){return"AI Error";} }
// Misc
function updateGoalRing(){ const w=document.getElementById('poemContent').value.split(/\s+/).length; const t=projectData.settings.goal; document.getElementById('wordCount').innerText=w; document.getElementById('goalCurrent').innerText=w; document.getElementById('goalTarget').innerText=t; document.getElementById('goalRing').style.strokeDashoffset=113-(Math.min(w/t,1)*113); }
function toggleSound(){ window.soundFx.on=!window.soundFx.on; showToast(window.soundFx.on?"Sound ON":"Sound OFF"); }
function toggleZenMode(){ document.body.classList.toggle('zen-active'); }
function openArtStudio(){ document.getElementById('artModal').classList.remove('hidden'); document.getElementById('artModal').classList.add('flex'); document.getElementById('artTitle').innerText=document.getElementById('poemTitle').value; document.getElementById('artContent').innerText=document.getElementById('poemContent').value; }
function closeArtStudio(){ document.getElementById('artModal').classList.add('hidden'); document.getElementById('artModal').classList.remove('flex'); }
function generateBackground(t){ document.getElementById('artBackground').style.background= t==='nebula'?'linear-gradient(45deg, #3b0764, #1e1b4b)':'#000'; }
function downloadArt(){ html2canvas(document.getElementById('artStage')).then(c=>{ const a=document.createElement('a'); a.download='art.png'; a.href=c.toDataURL(); a.click(); }); }
class ParticleEngine{constructor(){this.c=document.getElementById('dustCanvas');this.ctx=this.c.getContext('2d');this.p=[];this.resize();window.onresize=()=>this.resize();this.init();this.animate();}resize(){this.c.width=window.innerWidth;this.c.height=window.innerHeight;}init(){for(let i=0;i<40;i++)this.p.push({x:Math.random()*this.c.width,y:Math.random()*this.c.height,s:Math.random()*2,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,o:Math.random()*.5});}animate(){this.ctx.clearRect(0,0,this.c.width,this.c.height);this.p.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=this.c.width;if(p.x>this.c.width)p.x=0;if(p.y<0)p.y=this.c.height;if(p.y>this.c.height)p.y=0;this.ctx.fillStyle=`rgba(212,175,55,${p.o})`;this.ctx.beginPath();this.ctx.arc(p.x,p.y,p.s,0,6.28);this.ctx.fill();});requestAnimationFrame(()=>this.animate());}}
class SoundEngine{constructor(){this.on=true;this.ctx=null;window.soundFx=this;}playClick(){if(!this.on)return;if(!this.ctx)this.ctx=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume();const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+0.05);}}
