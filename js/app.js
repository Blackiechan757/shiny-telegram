// =========================================================
// CHROMA-LEX STUDIO: POWER PACK EDITION
// =========================================================

// --- STATE & SECRETS ---
const STORAGE_KEY = 'chromaLexPWA_v2';
const SECRETS_KEY = 'chromaLexSecrets';

let projectData = {
    projectTitle: "Ephemeral Echoes",
    availablePoems: [{ id: 'p-1', title: "Ode to Midnight", content: "The quiet river runs deep...", status: 'Final' }],
    architectOrder: [{ type: 'poem', id: 'p-1' }],
    bookMetaData: { author: "Author", year: "2025" },
    designSettings: {
        headerFont: "'Playfair Display', serif", bodyFont: "'Cormorant Garamond', serif",
        fontSize: "12", lineHeight: "1.6", paperType: "paper-white", useDropCaps: false
    },
    settings: { autosaveInterval: 5000 },
    ideaFragments: []
};
let activePoemId = 'p-1';
let autosaveTimer = null;
let supabaseClient = null;

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    if(projectData.availablePoems.length === 0) createNewPoem();
    else loadPoem(projectData.availablePoems[0].id);
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tabId)));
    
    // Editor Events
    const editor = document.getElementById('poemContent');
    editor.addEventListener('input', () => { autosave(); updateStats(); });
    document.getElementById('poemTitle').addEventListener('input', autosave);
    
    // Muse Events
    editor.addEventListener('mouseup', handleTextSelection);
    editor.addEventListener('keyup', handleTextSelection);
    document.addEventListener('mousedown', (e) => {
        if (!e.target.closest('#museMenu') && e.target !== editor) hideMuseMenu();
    });

    switchTab('write');
});

function getSecrets() {
    const data = localStorage.getItem(SECRETS_KEY);
    return data ? JSON.parse(data) : { supabaseUrl: '', supabaseKey: '', geminiKey: '' };
}

// --- CORE UI ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    const content = document.getElementById(`content-${tabId}`);
    if(content) content.style.display = 'block';
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
    document.querySelector(`[data-tab-id="${tabId}"]`)?.classList.add('tab-active');
    document.getElementById('currentTabTitle').textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
    
    if(tabId === 'compile') renderArchitectList();
    if(tabId === 'design') updateDesign();
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('active');
    setTimeout(() => t.classList.remove('active'), 3000);
}

// --- WRITING STUDIO ---
function loadPoem(id) {
    activePoemId = id;
    const poem = projectData.availablePoems.find(p => p.id === id);
    if(!poem) return;
    document.getElementById('poemTitle').value = poem.title;
    document.getElementById('poemContent').value = poem.content;
    renderPoemList();
    updateStats();
}

function updateStats() {
    const text = document.getElementById('poemContent').value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('wordCount').textContent = words;
    document.getElementById('lineCount').textContent = text.split('\n').length;
    
    const tones = ['Ethereal ✨', 'Somber 🌑', 'Gilded 🏆', 'Vivid 🔥'];
    const toneIndex = text.length % tones.length;
    const toneEl = document.getElementById('predictedTone');
    toneEl.textContent = tones[toneIndex];
    // Color logic
    toneEl.className = toneIndex === 2 ? 'text-yellow-500 font-bold' : 'text-gray-400 font-medium';
}

function autosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        const poem = projectData.availablePoems.find(p => p.id === activePoemId);
        if(poem) {
            poem.title = document.getElementById('poemTitle').value;
            poem.content = document.getElementById('poemContent').value;
            saveData();
            renderPoemList();
        }
    }, projectData.settings.autosaveInterval);
}

function renderPoemList() {
    document.getElementById('poemListContainer').innerHTML = projectData.availablePoems.map(p => 
        `<button onclick="loadPoem('${p.id}')" class="w-full text-left p-2 text-sm rounded transition ${p.id === activePoemId ? 'bg-yellow-500/20 text-yellow-500 font-bold border border-yellow-500/30' : 'text-gray-400 hover:bg-white/5'}">${p.title}</button>`
    ).join('');
}

function createNewPoem() {
    const id = `p-${Date.now()}`;
    projectData.availablePoems.unshift({ id, title: "Untitled", content: "" });
    projectData.architectOrder.push({ type: 'poem', id });
    saveData();
    loadPoem(id);
}

// --- NEURAL MUSE (GEMINI AI) ---
async function callLLM(prompt, type) {
    const secrets = getSecrets();
    if (!secrets.geminiKey) return "(Simulated) void, echo, silence"; // Fallback

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${secrets.geminiKey}`;
        const payload = { contents: [{ parts: [{ text: `You are a poetic assistant. Context: ${type}. Request: ${prompt}` }] }] };
        
        const response = await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text.trim();
    } catch (e) {
        console.error(e);
        showToast("AI Error: Check API Key");
        return "(API Error)";
    }
}

async function museAction(type) {
    const selection = window.getSelection().toString().trim();
    hideMuseMenu();
    
    if (type === 'capture') {
        if(selection) {
            projectData.ideaFragments.push({ id: Date.now(), text: selection });
            showToast("Clipped to Ideas");
        }
        return;
    }

    if (!selection) return;
    showToast("Consulting Muse...");
    
    let prompt = "";
    if (type === 'synonym') prompt = `Give 5 poetic synonyms for "${selection}", comma separated.`;
    if (type === 'rhyme') prompt = `Give 5 creative rhymes for "${selection}", comma separated.`;
    
    const res = await callLLM(prompt, type);
    alert(`MUSE (${type.toUpperCase()}):\n\n${res}`);
}

const museMenu = document.getElementById('museMenu');
function handleTextSelection() {
    const sel = window.getSelection();
    const text = sel.toString().trim();
    if(text.length > 0 && text.length < 30) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        museMenu.style.left = `${rect.left + rect.width/2}px`;
        museMenu.style.top = `${rect.top + window.scrollY}px`;
        museMenu.classList.remove('hidden');
        museMenu.classList.add('flex');
    } else hideMuseMenu();
}
function hideMuseMenu() { museMenu.classList.add('hidden'); museMenu.classList.remove('flex'); }

// --- SOCIAL IMAGE GEN ---
function createSocialCard() {
    const title = document.getElementById('poemTitle').value || "Untitled";
    const content = document.getElementById('poemContent').value || "";
    if(!content) { showToast("Canvas Empty"); return; }
    
    showToast("Rendering Card...");
    document.getElementById('socialStageTitle').textContent = title;
    document.getElementById('socialStageContent').textContent = content;

    html2canvas(document.getElementById('socialExportStage'), { backgroundColor: null, scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `ChromaLex_${title}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("Saved to Photos! 📸");
    });
}

// --- CLOUD SYNC ---
function initSupabase() {
    const s = getSecrets();
    if (s.supabaseUrl && s.supabaseKey && window.supabase) {
        supabaseClient = window.supabase.createClient(s.supabaseUrl, s.supabaseKey);
    }
}
async function syncToCloud() {
    initSupabase();
    if (!supabaseClient) { showToast("Setup Cloud Settings"); return; }
    showToast("Syncing...");
    const { error } = await supabaseClient.from('projects').upsert({ id: 'user-data', payload: projectData, updated_at: new Date() });
    if(error) showToast("Error: " + error.message);
    else showToast("Synced ☁️");
}
async function loadFromCloud() {
    initSupabase();
    if (!supabaseClient) { showToast("Setup Cloud Settings"); return; }
    showToast("Downloading...");
    const { data, error } = await supabaseClient.from('projects').select('*').eq('id', 'user-data').single();
    if(data) {
        projectData = data.payload;
        saveData(); loadPoem(activePoemId);
        showToast("Restored!");
    } else showToast("Error/No Data");
}

// --- SETTINGS & DATA ---
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData)); }
function loadData() { const d = localStorage.getItem(STORAGE_KEY); if(d) projectData = {...projectData, ...JSON.parse(d)}; }
function saveSettings() {
    const s = {
        supabaseUrl: document.getElementById('supabaseUrl').value,
        supabaseKey: document.getElementById('supabaseKey').value,
        geminiKey: document.getElementById('geminiKey').value
    };
    localStorage.setItem(SECRETS_KEY, JSON.stringify(s));
    projectData.settings.autosaveInterval = document.getElementById('autosaveInterval').value;
    saveData();
    document.getElementById('settingsModal').classList.add('hidden');
    document.getElementById('settingsModal').classList.remove('flex');
    showToast("Saved");
}
function showSettingsModal() { 
    const s = getSecrets();
    document.getElementById('supabaseUrl').value = s.supabaseUrl || '';
    document.getElementById('supabaseKey').value = s.supabaseKey || '';
    document.getElementById('geminiKey').value = s.geminiKey || '';
    document.getElementById('settingsModal').classList.remove('hidden'); 
    document.getElementById('settingsModal').classList.add('flex'); 
}
function closeSettingsModal() { document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('settingsModal').classList.remove('flex'); }

// --- MISC UTILS ---
function toggleZenMode() { document.body.classList.toggle('zen-active'); }
function renderArchitectList() { /* Simplified for brevity */ } 
function updateDesign() { /* Simplified for brevity */ }
function generateFullManuscript() { /* Simplified */ }
function generateStyledBook() { /* Simplified */ }
