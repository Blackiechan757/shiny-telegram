// =========================================================
// CHROMA-LEX: FINAL STUDIO EDITION
// =========================================================

const STORAGE_KEY = 'chromaLexPWA_v8';
const SECRETS_KEY = 'chromaLexSecrets';

let projectData = {
    bookTree: [{ id: 'ch-1', type: 'folder', title: 'Chapter 1', children: [{ id: 'p-1', type: 'page', title: 'The Beginning', contentId: 'c-1' }] }],
    drafts: [],
    contentMap: { 'c-1': "The quiet river runs deep..." },
    coverDesign: { titleX: '50px', titleY: '50px', authorX: '50px', authorY: '400px', bgColor: '#1a1a1a' },
    nexusItems: [],
    settings: { goal: 500, theme: 'dark', autosaveInterval: 5000 }
};

let activeNodeId = 'p-1';
let activeContentId = 'c-1';
let contextTargetId = null;
let autosaveTimer = null;
let typewriterMode = false;
let dragTarget = null;

const quotes = ["“Poetry is truth in its Sunday clothes.”", "“Genuine poetry can communicate before it is understood.”", "“A poem begins as a lump in the throat.”"];

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    applyTheme(projectData.settings.theme);
    
    // Init Sensory
    setTimeout(() => { new ParticleEngine(); new SoundEngine(); }, 500);
    
    // Events
    setupEvents();
    
    // Initial Render
    renderSidebarTree();
    renderDrafts();
    updateGoalRing();
    document.getElementById('dailyQuote').innerText = quotes[Math.floor(Math.random() * quotes.length)];
    
    // Load last
    if(activeNodeId) selectNode(activeNodeId);
});

// --- CORE UTILS ---
function getSecrets() { const d = localStorage.getItem(SECRETS_KEY); return d ? JSON.parse(d) : { geminiKey: '', googleScriptUrl: '' }; }
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData)); }
function loadData() { const d = localStorage.getItem(STORAGE_KEY); if(d) projectData = {...projectData, ...JSON.parse(d)}; }
function showToast(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('opacity-0'); setTimeout(()=>t.classList.add('opacity-0'),3000); }

// --- TREE & SIDEBAR ---
function renderSidebarTree() {
    const container = document.getElementById('fileTree');
    container.innerHTML = buildTreeHTML(projectData.bookTree);
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
        if(node.type === 'page') {
            switchTab('write');
            loadContent(node.contentId, node.title);
        }
    }
    renderSidebarTree();
    renderDrafts();
    if(window.innerWidth < 768) toggleDrawer(); // Close drawer on mobile
}

// --- DRAFTS (THE VAULT) ---
function renderDrafts() {
    document.getElementById('draftsList').innerHTML = (projectData.drafts || []).map((d, i) => 
        `<div class="tree-node ${activeNodeId === d.id ? 'active' : ''}" onclick="selectDraft(${i})" oncontextmenu="openContextMenu(event, '${d.id}', true)"><span class="mr-2 opacity-50">📝</span><span class="truncate">${d.title}</span></div>`
    ).join('');
}
function selectDraft(i) {
    const d = projectData.drafts[i];
    activeNodeId = d.id;
    activeContentId = null;
    window.currentDraftIndex = i;
    document.getElementById('poemTitle').value = d.title;
    document.getElementById('poemContent').value = d.content;
    document.getElementById('currentDocLabel').innerText = "Draft";
    switchTab('write');
    renderDrafts(); renderSidebarTree();
    if(window.innerWidth < 768) toggleDrawer();
}
function createDraft() {
    projectData.drafts.push({ id: `d-${Date.now()}`, title: 'Untitled Draft', content: '' });
    saveData(); renderDrafts();
}

// --- EDITOR LOGIC ---
function loadContent(cid, title) {
    activeContentId = cid;
    window.currentDraftIndex = null;
    document.getElementById('poemTitle').value = title;
    document.getElementById('poemContent').value = projectData.contentMap[cid] || "";
}

function autosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        const t = document.getElementById('poemTitle').value;
        const c = document.getElementById('poemContent').value;
        if(window.currentDraftIndex != null) {
            projectData.drafts[window.currentDraftIndex].title = t;
            projectData.drafts[window.currentDraftIndex].content = c;
        } else if (activeContentId) {
            projectData.contentMap[activeContentId] = c;
            const n = findNode(projectData.bookTree, activeNodeId);
            if(n) n.title = t;
        }
        saveData(); renderSidebarTree(); renderDrafts();
    }, 1000);
}

// --- CONTEXT MENU ---
let touchTimer = null;
function handleTouchStart(e, id) { touchTimer = setTimeout(() => openContextMenu(e, id), 800); }
function handleTouchEnd() { clearTimeout(touchTimer); }
function openContextMenu(e, id, isDraft) {
    e.preventDefault(); contextTargetId = id; window.isTargetDraft = isDraft;
    const m = document.getElementById('contextMenu');
    m.classList.remove('hidden');
    let x = e.clientX || e.touches[0].clientX; let y = e.clientY || e.touches[0].clientY;
    if(x+200 > window.innerWidth) x = window.innerWidth-210;
    m.style.left=`${x}px`; m.style.top=`${y}px`;
}
function contextAction(action) {
    document.getElementById('contextMenu').classList.add('hidden');
    if(window.isTargetDraft && action === 'delete') {
        const idx = projectData.drafts.findIndex(d => d.id === contextTargetId);
        projectData.drafts.splice(idx,1); saveData(); renderDrafts(); return;
    }
    const node = findNode(projectData.bookTree, contextTargetId);
    if(!node) return;
    if(action==='rename') { const n=prompt("Name:", node.title); if(n) { node.title=n; saveData(); renderSidebarTree(); } }
    if(action==='add_page' && node.type==='folder') {
        const id=`p-${Date.now()}`; const cid=`c-${Date.now()}`; projectData.contentMap[cid]="";
        node.children.push({id, type:'page', title:'New Page', contentId:cid}); saveData(); renderSidebarTree();
    }
    if(action==='add_chapter' && node.type==='folder') {
        node.children.push({id:`f-${Date.now()}`, type:'folder', title:'New Section', children:[]}); saveData(); renderSidebarTree();
    }
    if(action==='delete') {
        if(confirm("Delete?")) { deleteNode(projectData.bookTree, contextTargetId); saveData(); renderSidebarTree(); switchTab('write'); }
    }
}

// --- THE NEXUS (RESEARCH) ---
async function nexusAdd(type) {
    const val = document.getElementById('nexusInput').value;
    if(!val) return;
    if(type==='idea') projectData.nexusItems.unshift({type:'idea', content:val});
    if(type==='research') {
        showToast("Asking AI...");
        const res = await callLLM(`Research: ${val}`, "Librarian");
        projectData.nexusItems.unshift({type:'research', content:res});
    }
    saveData(); renderNexus(); document.getElementById('nexusInput').value='';
}
function renderNexus() {
    const g = document.getElementById('nexusGrid'); if(!g) return;
    g.innerHTML = (projectData.nexusItems||[]).map((i,x)=>`<div class="glass-panel p-4 border border-white/10"><span class="text-[10px] uppercase font-bold text-yellow-500">${i.type}</span><p class="text-xs text-gray-300 mt-2 whitespace-pre-wrap">${i.content}</p><button onclick="projectData.nexusItems.splice(${x},1);saveData();renderNexus()" class="text-red-500 text-xs mt-2">Delete</button></div>`).join('');
}

// --- COMMERCE (GOOGLE SHEETS) ---
async function saveProductToCloud() {
    const url = getSecrets().googleScriptUrl;
    if(!url) { showToast("Set API URL in Settings"); return; }
    const p = {
        title: document.getElementById('prodTitle').value,
        price: document.getElementById('prodPrice').value,
        image: document.getElementById('prodImage').value,
        link: document.getElementById('prodLink').value,
        status: 'active'
    };
    try {
        await fetch(url, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(p) });
        showToast("Published!");
    } catch(e) { showToast("Error: "+e.message); }
}
async function refreshStoreList() {
    const url = getSecrets().googleScriptUrl;
    if(!url) return;
    try {
        const r = await fetch(url); const d = await r.json();
        document.getElementById('adminProductList').innerHTML = d.map(p=>`<div class="p-2 bg-white/5 border border-white/10 mb-2 rounded flex justify-between"><span class="text-xs">${p.title}</span><span class="text-xs text-yellow-500">$${p.price}</span></div>`).join('');
    } catch(e) { console.error(e); }
}

// --- AI & UTILS ---
async function callLLM(p, c) {
    const k = getSecrets().geminiKey; if(!k) return "Simulated AI: Add Key";
    try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${k}`, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contents:[{parts:[{text:`Role: ${c}. Task: ${p}`}]}]})
        });
        const d = await r.json(); return d.candidates[0].content.parts[0].text;
    } catch(e) { return "AI Error"; }
}
async function runCriticAnalysis() {
    const c = document.getElementById('criticReport'); c.classList.remove('hidden'); c.innerText = "Analyzing...";
    const res = await callLLM(`Critique poem: ${document.getElementById('poemContent').value}`, "Critic");
    c.innerText = res; document.getElementById('criticModal').classList.remove('hidden'); document.getElementById('criticModal').classList.add('flex');
}
function closeCritic() { document.getElementById('criticModal').classList.add('hidden'); document.getElementById('criticModal').classList.remove('flex'); }

// --- SETTINGS & HELPERS ---
function applyTheme(t) {
    document.body.classList.toggle('light', t==='light');
    document.body.classList.toggle('dark', t!=='light');
}
function toggleTheme() {
    const n = projectData.settings.theme === 'dark' ? 'light' : 'dark';
    projectData.settings.theme = n; saveData(); applyTheme(n);
}
function saveSettings() {
    localStorage.setItem(SECRETS_KEY, JSON.stringify({ geminiKey: document.getElementById('geminiKey').value, googleScriptUrl: document.getElementById('googleScriptUrl').value }));
    closeSettingsModal();
}
function showSettingsModal() { 
    const s = getSecrets(); document.getElementById('geminiKey').value=s.geminiKey||''; document.getElementById('googleScriptUrl').value=s.googleScriptUrl||'';
    document.getElementById('settingsModal').classList.remove('hidden'); document.getElementById('settingsModal').classList.add('flex');
}
function closeSettingsModal() { document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('settingsModal').classList.remove('flex'); }
function addStructureItem(t) { projectData.bookTree.push({id:`f-${Date.now()}`, type:'folder', title:'New Chapter', children:[]}); saveData(); renderSidebarTree(); }
function findNode(nodes, id) { for(let n of nodes) { if(n.id===id) return n; if(n.children) { const f = findNode(n.children, id); if(f) return f; } } return null; }
function deleteNode(nodes, id) { const i = nodes.findIndex(n=>n.id===id); if(i>-1) nodes.splice(i,1); else nodes.forEach(n=>n.children && deleteNode(n.children, id)); }
function setupEvents() {
    document.getElementById('poemContent').addEventListener('keyup', handleTypewriterScroll);
    document.getElementById('poemContent').addEventListener('click', handleTypewriterScroll);
    document.addEventListener('click', (e) => { if(!e.target.closest('#contextMenu')) document.getElementById('contextMenu').classList.add('hidden'); });
}
function updateGoalRing() {
    const w = document.getElementById('poemContent').value.split(/\s+/).length;
    const t = projectData.settings.goal;
    document.getElementById('wordCount').innerText = w;
    document.getElementById('goalCurrent').innerText = w;
    document.getElementById('goalTarget').innerText = t;
    document.getElementById('goalRing').style.strokeDashoffset = 113 - (Math.min(w/t, 1)*113);
}
function handleTypewriterScroll() {
    if(!typewriterMode) return;
    const ta = document.getElementById('poemContent');
    const lh = 28; // approx line height
    const lines = ta.value.substring(0, ta.selectionStart).split("\n").length;
    ta.scrollTo({ top: (lines - 1) * lh, behavior: 'smooth' });
}
function toggleTypewriterMode() {
    typewriterMode = !typewriterMode;
    const t = document.getElementById('typewriterBtn');
    if(typewriterMode) { t.classList.add('text-yellow-500'); document.querySelector('.typewriter-active')?.classList.remove('typewriter-active'); document.getElementById('editorContainer').classList.add('typewriter-active'); handleTypewriterScroll(); }
    else { t.classList.remove('text-yellow-500'); document.getElementById('editorContainer').classList.remove('typewriter-active'); }
}
function openArtStudio() { document.getElementById('artModal').classList.remove('hidden'); document.getElementById('artModal').classList.add('flex'); document.getElementById('artTitle').innerText=document.getElementById('poemTitle').value; document.getElementById('artContent').innerText=document.getElementById('poemContent').value; }
function closeArtStudio() { document.getElementById('artModal').classList.add('hidden'); document.getElementById('artModal').classList.remove('flex'); }
function generateBackground(type) { document.getElementById('artBackground').style.background = type==='nebula' ? 'linear-gradient(45deg, #3b0764, #1e1b4b)' : '#000'; }
function downloadArt() { html2canvas(document.getElementById('artStage')).then(c=>{ const a=document.createElement('a'); a.download='art.png'; a.href=c.toDataURL(); a.click(); }); }

// Engines
class ParticleEngine { constructor() { /* Simplified for brevity */ } }
class SoundEngine { constructor() { this.on=true; this.ctx=null; window.soundFx=this; } playClick() { if(!this.on)return; if(!this.ctx)this.ctx=new(window.AudioContext||window.webkitAudioContext)(); if(this.ctx.state==='suspended')this.ctx.resume(); const t=this.ctx.currentTime, o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t+0.05); } }
function toggleSound() { window.soundFx.on=!window.soundFx.on; showToast(window.soundFx.on?"Sound ON":"Sound OFF"); }
