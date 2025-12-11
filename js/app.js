// =========================================================
// CHROMA-LEX: MASTER EDITION
// =========================================================

const STORAGE_KEY = 'chromaLexPWA_v3';
const SECRETS_KEY = 'chromaLexSecrets';

let projectData = {
    projectTitle: "Ephemeral Echoes",
    availablePoems: [{ id: 'p-1', title: "Ode to Midnight", content: "The quiet river runs deep...", status: 'Final' }],
    architectOrder: [{ type: 'poem', id: 'p-1' }],
    bookMetaData: { author: "Author", year: "2025" },
    designSettings: { headerFont: "'Playfair Display', serif", bodyFont: "'Cormorant Garamond', serif", fontSize: "12", lineHeight: "1.6", paperType: "paper-white", useDropCaps: false },
    settings: { autosaveInterval: 5000 },
    ideaFragments: []
};
let activePoemId = 'p-1';
let autosaveTimer = null;
let typewriterMode = false;

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    if(projectData.availablePoems.length === 0) createNewPoem();
    else loadPoem(projectData.availablePoems[0].id);

    // Initialize Engines
    setTimeout(() => { new ParticleEngine(); new SoundEngine(); }, 500);

    // Events
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tabId)));
    const editor = document.getElementById('poemContent');
    editor.addEventListener('input', () => { autosave(); updateStats(); updateGoalRing(); });
    editor.addEventListener('keyup', handleTypewriterScroll);
    editor.addEventListener('mouseup', handleTextSelection);
    editor.addEventListener('click', handleTypewriterScroll);
    
    // Global Key Listener for Sound
    editor.addEventListener('keydown', (e) => { 
        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') window.soundFx?.playClick(); 
    });
    
    document.getElementById('poemTitle').addEventListener('input', autosave);
    document.addEventListener('mousedown', (e) => { if (!e.target.closest('#museMenu') && e.target !== editor) hideMuseMenu(); });

    switchTab('write');
    updateGoalRing();
});

// --- CORE UTILS ---
function getSecrets() { const d = localStorage.getItem(SECRETS_KEY); return d ? JSON.parse(d) : { geminiKey: '' }; }
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData)); }
function loadData() { const d = localStorage.getItem(STORAGE_KEY); if(d) projectData = {...projectData, ...JSON.parse(d)}; }
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('active'); setTimeout(() => t.classList.remove('active'), 3000); }

// --- UI TABS ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(`content-${tabId}`).style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
    document.querySelector(`[data-tab-id="${tabId}"]`)?.classList.add('tab-active');
    document.getElementById('currentTabTitle').textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
    if(tabId === 'compile') renderArchitectList();
    if(tabId === 'design') updateDesign();
}

// --- WRITING STUDIO ---
function loadPoem(id) {
    activePoemId = id;
    const poem = projectData.availablePoems.find(p => p.id === id);
    if(!poem) return;
    document.getElementById('poemTitle').value = poem.title;
    document.getElementById('poemContent').value = poem.content;
    renderPoemList(); updateStats(); updateGoalRing();
}
function updateStats() {
    const text = document.getElementById('poemContent').value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('wordCount').textContent = words;
    document.getElementById('lineCount').textContent = text.split('\n').length;
    const tones = ['Ethereal ✨', 'Somber 🌑', 'Gilded 🏆', 'Vivid 🔥'];
    document.getElementById('predictedTone').textContent = tones[text.length % 4];
}
function renderPoemList() {
    document.getElementById('poemListContainer').innerHTML = projectData.availablePoems.map(p => 
        `<button onclick="loadPoem('${p.id}')" class="w-full text-left p-2 text-sm rounded transition ${p.id === activePoemId ? 'bg-yellow-500/20 text-yellow-500 font-bold' : 'text-gray-400 hover:bg-white/5'}">${p.title}</button>`
    ).join('');
}
function createNewPoem() {
    const id = `p-${Date.now()}`;
    projectData.availablePoems.unshift({ id, title: "Untitled", content: "" });
    projectData.architectOrder.push({ type: 'poem', id });
    saveData(); loadPoem(id);
}
function autosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        const poem = projectData.availablePoems.find(p => p.id === activePoemId);
        if(poem) { poem.title = document.getElementById('poemTitle').value; poem.content = document.getElementById('poemContent').value; saveData(); renderPoemList(); }
    }, projectData.settings.autosaveInterval);
}

// --- SENSORY ENGINES ---
class ParticleEngine {
    constructor() { this.c = document.getElementById('dustCanvas'); this.ctx = this.c.getContext('2d'); this.p = []; this.resize(); window.onresize = ()=>this.resize(); this.init(); this.animate(); }
    resize() { this.c.width = window.innerWidth; this.c.height = window.innerHeight; }
    init() { for(let i=0; i<40; i++) this.p.push({x:Math.random()*this.c.width, y:Math.random()*this.c.height, s:Math.random()*2, vx:(Math.random()-.5)*.2, vy:(Math.random()-.5)*.2, o:Math.random()*.5}); }
    animate() {
        this.ctx.clearRect(0,0,this.c.width,this.c.height);
        this.p.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; if(p.x<0)p.x=this.c.width; if(p.x>this.c.width)p.x=0; if(p.y<0)p.y=this.c.height; if(p.y>this.c.height)p.y=0; this.ctx.fillStyle=`rgba(212,175,55,${p.o})`; this.ctx.beginPath(); this.ctx.arc(p.x,p.y,p.s,0,6.28); this.ctx.fill(); });
        requestAnimationFrame(()=>this.animate());
    }
}
class SoundEngine {
    constructor() { this.on = true; this.ctx = null; window.soundFx = this; }
    playClick() {
        if(!this.on) return;
        if(!this.ctx) this.ctx = new (window.AudioContext||window.webkitAudioContext)();
        if(this.ctx.state==='suspended') this.ctx.resume();
        const t=this.ctx.currentTime, o=this.ctx.createOscillator(), g=this.ctx.createGain(), f=this.ctx.createBiquadFilter();
        o.type='sawtooth'; o.frequency.setValueAtTime(800,t); o.frequency.linearRampToValueAtTime(100,t+.05);
        f.type='lowpass'; f.frequency.setValueAtTime(2000,t); f.frequency.linearRampToValueAtTime(100,t+.05);
        g.gain.setValueAtTime(.05,t); g.gain.linearRampToValueAtTime(.001,t+.05);
        o.connect(f); f.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t+.05);
    }
}
function toggleSound() { window.soundFx.on = !window.soundFx.on; showToast(window.soundFx.on ? "Sound ON" : "Sound OFF"); }

function updateGoalRing() {
    const w = document.getElementById('wordCount').textContent;
    const t = 500;
    const p = Math.min(w/t, 1);
    const r = document.getElementById('goalRing');
    if(r) { r.style.strokeDashoffset = 100 - (p*100); r.style.stroke = w>=t ? "#10b981" : "#d4af37"; }
    document.getElementById('goalCurrent').textContent = w;
}

// --- TYPEWRITER MODE ---
function toggleTypewriterMode() {
    typewriterMode = !typewriterMode;
    const btn = document.getElementById('typewriterBtn');
    const ta = document.getElementById('poemContent');
    const container = document.getElementById('editorContainer');
    
    if(typewriterMode) {
        btn.classList.add('text-yellow-500');
        container.classList.add('typewriter-active');
        handleTypewriterScroll();
    } else {
        btn.classList.remove('text-yellow-500');
        container.classList.remove('typewriter-active');
    }
}
function handleTypewriterScroll() {
    if(!typewriterMode) return;
    const ta = document.getElementById('poemContent');
    const lh = parseInt(window.getComputedStyle(ta).lineHeight);
    const lines = ta.value.substr(0, ta.selectionStart).split("\n").length;
    const container = document.getElementById('editorContainer');
    // Center logic: ScrollTop = (LineNum * LineHeight) - (ContainerHeight / 2)
    container.scrollTop = (lines * lh) - (container.clientHeight / 2);
}

// --- GEMINI AI (MUSE & CRITIC) ---
async function callLLM(prompt, context) {
    const k = getSecrets().geminiKey;
    if(!k) return "(Simulated AI: Add Key in Settings)";
    try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${k}`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({contents:[{parts:[{text:`Role: Poet Assistant. Context: ${context}. Task: ${prompt}`}]}]})
        });
        const d = await r.json();
        return d.candidates[0].content.parts[0].text.trim();
    } catch(e) { console.error(e); return "AI Error"; }
}

async function runCriticAnalysis() {
    const text = document.getElementById('poemContent').value;
    if(!text) return;
    showToast("The Critic is reading...");
    const report = document.getElementById('criticReport');
    report.classList.remove('hidden');
    report.textContent = "Analyzing...";
    
    const prompt = `Analyze this poem. 1. Meter/Rhythm check. 2. Tone consistency. 3. Suggest 2 improvements. Keep it brief. Poem: \n${text}`;
    const result = await callLLM(prompt, "Literary Critic");
    report.textContent = result;
}

// --- TIME MACHINE (BACKUP) ---
function exportProjectJSON() {
    const blob = new Blob([JSON.stringify(projectData)], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ChromaLex_Backup_${Date.now()}.json`;
    a.click();
    showToast("Backup Saved 💾");
}
function importProjectJSON(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            projectData = JSON.parse(e.target.result);
            saveData();
            loadPoem(projectData.availablePoems[0].id);
            showToast("Library Restored!");
        } catch(err) { showToast("Invalid File"); }
    };
    reader.readAsText(file);
}

// --- ZEN MODE ---
function toggleZenMode() { document.body.classList.toggle('zen-active'); }

// --- SOCIAL EXPORT ---
function createSocialCard() {
    const t = document.getElementById('poemTitle').value;
    const c = document.getElementById('poemContent').value;
    document.getElementById('socialStageTitle').textContent = t;
    document.getElementById('socialStageContent').textContent = c;
    html2canvas(document.getElementById('socialExportStage'), {backgroundColor:null, scale:2}).then(cv=>{
        const a=document.createElement('a'); a.download=`ChromaLex_${t}.png`; a.href=cv.toDataURL("image/png"); a.click(); showToast("Saved Image 📸");
    });
}

// --- ARCHITECT/TYPESETTER STUBS (Shortened for space, logic remains same) ---
function renderArchitectList() { document.getElementById('architectList').innerHTML = projectData.architectOrder.map((i,x)=>`<div draggable="true" class="architect-item type-${i.type}"><span>${i.type}</span><button onclick="projectData.architectOrder.splice(${x},1); saveData(); renderArchitectList()">✕</button></div>`).join(''); }
function addStructureItem(t) { if(t==='section') projectData.architectOrder.push({type:'section', title:prompt("Title")}); saveData(); renderArchitectList(); }
function updateDesign() { 
    const s = projectData.designSettings;
    s.headerFont = document.getElementById('headerFontSelect').value;
    s.bodyFont = document.getElementById('bodyFontSelect').value;
    document.getElementById('previewHeader').style.fontFamily = s.headerFont;
    document.getElementById('previewBodyText').style.fontFamily = s.bodyFont;
}
function saveSettings() {
    const s = { geminiKey: document.getElementById('geminiKey').value };
    localStorage.setItem(SECRETS_KEY, JSON.stringify(s));
    document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('settingsModal').classList.remove('flex');
    showToast("Settings Saved");
}
function showSettingsModal() { 
    document.getElementById('geminiKey').value = getSecrets().geminiKey || '';
    document.getElementById('settingsModal').classList.remove('hidden'); document.getElementById('settingsModal').classList.add('flex');
}
function closeSettingsModal() { document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('settingsModal').classList.remove('flex'); }
// --- MUSE MENU HANDLERS ---
async function museAction(type) {
    const sel = window.getSelection().toString().trim();
    hideMuseMenu();
    if(type==='capture') { if(sel) { projectData.ideaFragments.push({text:sel}); showToast("Clipped"); } return; }
    showToast("Consulting Muse...");
    const p = type==='synonym'?`Synonyms for "${sel}"`:`Rhymes for "${sel}"`;
    const r = await callLLM(p, "Poet");
    alert(r);
}
function handleTextSelection() {
    const sel = window.getSelection(); const txt = sel.toString().trim();
    const mm = document.getElementById('museMenu');
    if(txt.length>0 && txt.length<30) {
        const r = sel.getRangeAt(0).getBoundingClientRect();
        mm.style.left=`${r.left+r.width/2}px`; mm.style.top=`${r.top+window.scrollY}px`;
        mm.classList.remove('hidden'); mm.classList.add('flex');
    } else hideMuseMenu();
}
function hideMuseMenu() { document.getElementById('museMenu').classList.add('hidden'); document.getElementById('museMenu').classList.remove('flex'); }
