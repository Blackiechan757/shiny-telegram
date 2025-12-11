// =========================================================
// CHROMA-LEX CORE LOGIC (PWA EDITION)
// =========================================================

// --- STATE ---
let projectData = {
    projectTitle: "Ephemeral Echoes",
    availablePoems: [
        { id: 'uuid-a', title: "Ode to the Concrete", status: 'Final', content: "The quiet river runs deep...", linkedResearchIds: [] },
    ],
    architectOrder: [], // Stores book structure
    bookMetaData: { author: "Author", year: "2025", publisher: "ChromaLex Press", dedication: "" },
    designSettings: {
        headerFont: "'Playfair Display', serif", bodyFont: "'Cormorant Garamond', serif",
        fontSize: "12", lineHeight: "1.6", paperType: "paper-white",
        useDropCaps: false, dividerStyle: "divider-stars"
    },
    settings: { darkMode: false, autosaveInterval: 5000 }
};

let activePoemId = null;
let autosaveTimer = null;
const STORAGE_KEY = 'chromaLexPWA_v1';

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    if(projectData.availablePoems.length > 0) activePoemId = projectData.availablePoems[0].id;
    
    // Architect Init
    if (!projectData.architectOrder || projectData.architectOrder.length === 0) {
        projectData.architectOrder = projectData.availablePoems.map(p => ({ type: 'poem', id: p.id }));
    }

    applyTheme();
    renderPoemList();
    if(activePoemId) loadPoem(activePoemId);
    
    // Events
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tabId)));
    document.getElementById('poemContent').addEventListener('input', () => { autosave(); updateStats(); });
    document.getElementById('poemTitle').addEventListener('input', autosave);
    
    // Muse Menu Events
    const editor = document.getElementById('poemContent');
    editor.addEventListener('mouseup', handleTextSelection);
    editor.addEventListener('keyup', handleTextSelection);
    document.addEventListener('mousedown', (e) => {
        if (!e.target.closest('#museMenu') && e.target !== editor) hideMuseMenu();
    });

    switchTab('write');
});

// --- PERSISTENCE ---
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
}
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) projectData = { ...projectData, ...JSON.parse(data) };
}

// --- TABS & UI ---
function switchTab(tabId) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    
    // Show specific content
    const content = document.getElementById(`content-${tabId}`);
    if(content) content.style.display = 'block'; // Use block, flex handles internal layout
    
    // Update Active Tab State
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
    document.querySelector(`[data-tab-id="${tabId}"]`)?.classList.add('tab-active');
    
    // Update Header Title
    document.getElementById('currentTabTitle').textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
    
    // Initialize specific module logic
    if(tabId === 'compile') renderArchitectList();
    if(tabId === 'design') loadDesignStudio();
    if(tabId === 'analytics') loadAnalytics();
    
    // NOTE: We do NOT toggle drawer here automatically anymore in JS, 
    // because we added onclick="toggleDrawer()" directly to the buttons in HTML.
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    sidebar.classList.toggle('open'); 
    // In actual CSS, use a class to translate the sidebar in/out
    sidebar.style.transform = sidebar.classList.contains('open') ? 'translateX(0)' : 'translateX(-100%)';
    overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
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
    const lines = text.split('\n').length;
    
    // 1. Update Counts
    document.getElementById('wordCount').textContent = words;
    document.getElementById('lineCount').textContent = lines;
    
    // 2. Calculate Reading Time (avg 200 wpm for prose, slower for poetry)
    const readTime = Math.ceil(words / 130); 
    
    // 3. Syllable Est. (Rough Approximation)
    const syllables = Math.round(words * 1.5); // avg syllables per word
    const avgSyl = lines > 0 ? (syllables / lines).toFixed(1) : 0;
    document.getElementById('avgSyllables').textContent = avgSyl;

    // 4. Luxury Tone Analysis (Simulated)
    // We alternate colors based on content length to simulate "AI Analysis" visual feedback
    const tones = [
        { label: 'Ethereal ✨', color: 'text-purple-400' },
        { label: 'Somber 🌑', color: 'text-gray-400' },
        { label: 'Gilded 🏆', color: 'text-yellow-400' },
        { label: 'Vivid 🔥', color: 'text-red-400' }
    ];
    
    // Hash the text length to pick a stable tone (simulated)
    const toneIndex = text.length % tones.length;
    const toneEl = document.getElementById('predictedTone');
    
    toneEl.textContent = tones[toneIndex].label;
    // Remove old color classes and add the new one
    toneEl.className = `font-medium transition-colors duration-500 ${tones[toneIndex].color}`;
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
            showToast("Saved");
        }
    }, projectData.settings.autosaveInterval);
}

function renderPoemList() {
    document.getElementById('poemListContainer').innerHTML = projectData.availablePoems.map(p => 
        `<button onclick="loadPoem('${p.id}')" class="w-full text-left p-2 text-sm rounded ${p.id === activePoemId ? 'bg-indigo-100 text-indigo-700 font-bold' : 'hover:bg-gray-100'}">${p.title}</button>`
    ).join('');
}

function createNewPoem() {
    const id = `p-${Date.now()}`;
    projectData.availablePoems.unshift({ id, title: "Untitled", content: "", status: 'Draft' });
    projectData.architectOrder.push({ type: 'poem', id }); // Auto-add to architect
    saveData();
    loadPoem(id);
}

// --- ZEN MODE ---
function toggleZenMode() {
    document.body.classList.toggle('zen-active');
}

// --- MUSE MENU ---
const museMenu = document.getElementById('museMenu');
function handleTextSelection() {
    const sel = window.getSelection();
    const text = sel.toString().trim();
    if(text.length > 0 && text.length < 25) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        museMenu.style.left = `${rect.left + rect.width/2}px`;
        museMenu.style.top = `${rect.top + window.scrollY}px`;
        museMenu.classList.remove('hidden');
        museMenu.classList.add('fade-in-up');
    } else {
        hideMuseMenu();
    }
}
function hideMuseMenu() {
    museMenu.classList.add('hidden');
    museMenu.classList.remove('fade-in-up');
}
function museAction(type) {
    const text = window.getSelection().toString();
    alert(`Simulated ${type} result for: "${text}"`);
    hideMuseMenu();
}

// --- ARCHITECT (BOOK BUILDER) ---
function renderArchitectList() {
    const list = document.getElementById('architectList');
    list.innerHTML = projectData.architectOrder.map((item, i) => {
        let label = "Unknown";
        if(item.type === 'poem') label = projectData.availablePoems.find(p => p.id === item.id)?.title || "Poem";
        if(item.type === 'section') label = `SECTION: ${item.title}`;
        if(item.type === 'matter') label = `PAGE: ${item.subType.toUpperCase()}`;
        return `<div draggable="true" data-index="${i}" class="architect-item type-${item.type}" ondragstart="dragStart(event)" ondragover="allowDrop(event)" ondrop="drop(event)"><span>${label}</span><button onclick="removeItem(${i})" class="text-xs text-red-400">✕</button></div>`;
    }).join('');
    document.getElementById('bookPoemCount').textContent = projectData.architectOrder.filter(i => i.type === 'poem').length;
}

function addStructureItem(type) {
    if(type === 'section') {
        const t = prompt("Section Title:");
        if(t) projectData.architectOrder.push({ type: 'section', title: t });
    }
    saveData(); renderArchitectList();
}

function autoPopulateFrontMatter() {
    projectData.architectOrder.unshift(
        { type: 'matter', subType: 'title' },
        { type: 'matter', subType: 'copyright' },
        { type: 'matter', subType: 'dedication' }
    );
    saveData(); renderArchitectList();
}

function removeItem(i) {
    projectData.architectOrder.splice(i, 1);
    saveData(); renderArchitectList();
}

// Drag & Drop for Architect
let draggedIdx = null;
function dragStart(e) { draggedIdx = e.target.closest('.architect-item').dataset.index; }
function allowDrop(e) { e.preventDefault(); }
function drop(e) {
    e.preventDefault();
    const targetIdx = e.target.closest('.architect-item').dataset.index;
    if(draggedIdx !== null && targetIdx !== null) {
        const item = projectData.architectOrder.splice(draggedIdx, 1)[0];
        projectData.architectOrder.splice(targetIdx, 0, item);
        saveData(); renderArchitectList();
    }
}

// --- TYPESETTER & EXPORT ---
function loadDesignStudio() {
    updateDesign();
}
function updateDesign() {
    const s = projectData.designSettings;
    // Bind inputs to settings (simplified for brevity)
    s.headerFont = document.getElementById('headerFontSelect').value;
    s.bodyFont = document.getElementById('bodyFontSelect').value;
    // Apply to preview
    const prev = document.getElementById('bookPreviewPage');
    prev.className = `book-page-simulation ${document.getElementById('paperSelect').value}`;
    document.getElementById('previewHeader').style.fontFamily = s.headerFont;
    document.getElementById('previewBodyText').style.fontFamily = s.bodyFont;
    document.getElementById('previewBodyText').classList.toggle('has-drop-cap', document.getElementById('dropCapToggle').checked);
    document.getElementById('previewDivider').className = document.getElementById('divider-stars')?.checked ? 'divider-stars' : '';
}

function generateFullManuscript() {
    let text = `${projectData.projectTitle.toUpperCase()}\n\n`;
    projectData.architectOrder.forEach(item => {
        if(item.type === 'poem') {
            const p = projectData.availablePoems.find(x => x.id === item.id);
            if(p) text += `\n\n${p.title}\n${p.content}\n\n* * *\n`;
        }
        if(item.type === 'section') text += `\n\n[ ${item.title.toUpperCase()} ]\n\n`;
    });
    downloadFile("Manuscript.txt", text);
}

function generateStyledBook() {
    // Generate HTML Proof
    const html = `<html><head><style>
        body { padding: 40px; font-family: ${projectData.designSettings.bodyFont}; }
        h1, h2 { font-family: ${projectData.designSettings.headerFont}; text-align: center; }
        .page-break { page-break-after: always; }
    </style></head><body><h1>${projectData.projectTitle}</h1><div class="page-break"></div><p>Simulated Book Content...</p></body></html>`;
    downloadFile("BookProof.html", html);
}

function downloadFile(name, content) {
    const blob = new Blob([content], {type: 'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

// --- METADATA & SETTINGS ---
function showMetadataModal() { document.getElementById('metadataModal').classList.remove('hidden'); document.getElementById('metadataModal').classList.add('flex'); }
function closeMetadataModal() { document.getElementById('metadataModal').classList.add('hidden'); document.getElementById('metadataModal').classList.remove('flex'); }
function saveMetadata() { /* Save logic */ closeMetadataModal(); showToast("Metadata Saved"); }

function showSettingsModal() { document.getElementById('settingsModal').classList.remove('hidden'); document.getElementById('settingsModal').classList.add('flex'); }
function closeSettingsModal() { document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('settingsModal').classList.remove('flex'); }
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    projectData.settings.darkMode = document.body.classList.contains('dark');
    saveData();
}
function applyTheme() {
    if(projectData.settings.darkMode) document.body.classList.add('dark');
    document.getElementById('darkModeToggle').checked = projectData.settings.darkMode;
}

// --- ANALYTICS STUB ---
function loadAnalytics() {
    document.getElementById('analyticsDashboard').innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-indigo-50 rounded">Readership: High</div>
            <div class="p-4 bg-green-50 rounded">Est. Revenue: $420</div>
        </div>
    `;
}
