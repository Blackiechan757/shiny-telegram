// =========================================================
// CHROMA-LEX FRONT-END CORE LOGIC (V. 1.3 Consolidated)
// This file contains ALL application behavior and state management.
// =========================================================

// --- SIMULATED GLOBAL PROJECT STATE (ChromaLexProject) ---
let projectData = {
    projectTitle: "Ephemeral Echoes",
    availablePoems: [
        { id: 'uuid-a', title: "Ode to the Concrete Ocean", status: 'Final', content: "The quiet river runs deep and dark,\nAnd the midnight shadows slowly creep." },
        { id: 'uuid-c', title: "The Geometry of Grief", status: 'Final', content: "Such is the geometry of grief: a perfect, small square\nWhere the future used to be." },
        { id: 'uuid-b', title: "A Study in Pale Blue", status: 'Draft', content: "Here, the sky is a page, unbound and immense,\nWhere every forgotten thought is scrawled in faint, silver ink." },
    ],
    compilationOrder: ['uuid-c', 'uuid-a', 'uuid-b'], // The Book Order
    ideaFragments: [
        { id: 'frag-1', text: "The color of regret is a muted, wet ochre.", tags: ['Metaphor', 'Color'], linkedPoemId: null },
    ],
    researchItems: [
        { research_id: 'res-1', source_url: 'https://en.wikipedia.org/wiki/Iambic_pentameter', clipped_text: 'Iambic pentameter is a metre in poetry where each line contains ten syllables, five unstressed and five stressed.', citation: 'Wikipedia. (n.d.). Iambic pentameter. Retrieved 2025.' , keywords: ['meter', 'form'] },
        { research_id: 'res-2', source_url: '', clipped_text: 'Need to research the color palette of old photographs from 1957.', citation: 'Author Note, 2025.', keywords: ['color', '1957', 'note'] }
    ],
    versionHistory: [
        { id: 'v-1', timestamp: new Date(Date.now() - 3600000), name: "Initial Brain Dump", content: "The river runs deep,\nAnd the shadows creep." },
    ],
    definedProducts: [],
};

let constraintSettings = {
    isActive: false,
    syllables: 0,
    rhymeScheme: ''
};

const previewPoem = projectData.availablePoems[0];

// --- UTILITIES & RESPONSIVENESS ---

function showToast(message, duration = 3000) {
    const toastEl = document.getElementById('toast');
    if (toastEl) {
        toastEl.textContent = message;
        toastEl.classList.add('active');
        setTimeout(() => {
            toastEl.classList.remove('active');
        }, duration);
    }
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    if (!sidebar || !overlay) return;
    sidebar.classList.toggle('open');
    overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    const contentEl = document.getElementById(`content-${tabId}`);
    if (contentEl) contentEl.style.display = 'block';

    document.querySelectorAll('[id^="tab-"]').forEach(btn => btn.classList.remove('tab-active'));
    const tabBtn = document.getElementById(`tab-${tabId}`);
    if (tabBtn) tabBtn.classList.add('tab-active');

    document.getElementById('currentTabTitle').textContent = tabId.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Load content specific to the tab
    if (tabId === 'compile') loadCompilerView();
    if (tabId === 'brainstorm') loadIdeaCanvas();
    if (tabId === 'design') loadDesignStudio();
    if (tabId === 'analytics') loadAnalyticsDashboard();
    if (tabId === 'research') loadResearchLibrary();
    
    // Close mobile menu after switching tabs
    if (window.innerWidth < 1024 && document.getElementById('sidebar').classList.contains('open')) {
        toggleMobileMenu();
    }
}

// --- MODAL MANAGEMENT (Responsive-enabled) ---

function closeExportModal() { document.getElementById('exportModal')?.classList.remove('active'); }
function showExportModal() { document.getElementById('exportModal')?.classList.add('active'); }

function closeStoreModal() { document.getElementById('storeModal')?.classList.remove('active'); }
function showStoreModal() { document.getElementById('storeModal')?.classList.add('active'); }

function closeResearchModal() { document.getElementById('researchModal')?.classList.remove('active'); }
function showResearchModal() { document.getElementById('researchModal')?.classList.add('active'); }

function closeAnthologyModal() { document.getElementById('anthologyModal')?.classList.remove('active'); }
function showAnthologyModal() { document.getElementById('anthologyModal')?.classList.add('active'); }


// --- PHASE 1: COMPILER ---
function loadCompilerView() { renderCompilationList(); updateBookPoemCount(); }
function renderCompilationList() { 
    const listEl = document.getElementById('compilationList');
    if (!listEl) return;
    listEl.innerHTML = projectData.compilationOrder.map(id => {
        const poem = projectData.availablePoems.find(p => p.id === id);
        return `<div data-id="${id}" class="poem-item p-3 bg-white border border-gray-200 rounded-lg shadow-sm cursor-grab flex justify-between items-center">${poem ? poem.title : 'Deleted Poem'}</div>`;
    }).join('');
}
function updateCompilationOrder() { showToast("Compilation order updated (Simulated)", 1500); }
function updateBookPoemCount() { 
    const countEl = document.getElementById('bookPoemCount');
    if (countEl) countEl.textContent = projectData.compilationOrder.length;
}
function generateBook() { showToast(`Generating final book with ${projectData.compilationOrder.length} poems...`, 5000); }

// --- PHASE 1: IDEA CANVAS ---
function loadIdeaCanvas() {
    const grid = document.getElementById('ideasGrid');
    if (grid) {
        grid.innerHTML = projectData.ideaFragments.map(fragment => `
            <div id="fragment-${fragment.id}" class="idea-card bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500 flex flex-col justify-between">
                <p class="text-gray-800 mb-3 text-sm italic">${fragment.text.substring(0, 100)}...</p>
                <button onclick="exportFragmentToEditor('${fragment.id}')" class="text-xs text-purple-600 hover:underline">
                    Export to Editor
                </button>
            </div>
        `).join('');
    }
}
function showNewIdeaModal() { 
    const text = prompt("Enter new fragment:");
    if (text) addNewIdea(text.split('|')[0], text.split('|')[1]?.split(',') || []);
}
function addNewIdea(text, tags) { /* ... adds fragment to projectData ... */ showToast('New idea fragment captured!', 3000); loadIdeaCanvas(); }
function exportFragmentToEditor(fragmentId) { 
    const fragment = projectData.ideaFragments.find(f => f.id === fragmentId);
    if (fragment) { document.getElementById('poemContent').value += '\n\n' + fragment.text; switchTab('write'); showToast(`Fragment exported!`); }
}

// --- PHASE 1: CONSTRAINT WRITING MODE ---
function toggleConstraintMode() { 
    const checkbox = document.getElementById('constraintMode');
    const optionsDiv = document.getElementById('constraintOptions');
    constraintSettings.isActive = checkbox.checked;
    optionsDiv.style.display = checkbox.checked ? 'flex' : 'none';
    if (checkbox.checked) updateConstraintSettings();
}
function updateConstraintSettings() {
    constraintSettings.syllables = parseInt(document.getElementById('syllablesPerLine').value) || 0;
    constraintSettings.rhymeScheme = document.getElementById('rhymeScheme').value.toUpperCase().trim();
    checkConstraints();
}
function checkConstraints() {
    if (!constraintSettings.isActive) return;
    const lines = document.getElementById('poemContent')?.value.split('\n').filter(line => line.trim() !== '');
    if (!lines || lines.length === 0) return;
    const warnings = [];
    if (constraintSettings.syllables > 0) warnings.push(...simulateSyllableCheck(lines, constraintSettings.syllables));
    if (warnings.length > 0) showToast(`Constraint Warning: ${warnings[0]}`, 4000);
    updatePoemStats(lines);
}
function simulateSyllableCheck(lines, target) { return lines.map((line, i) => (line.length % 5 + 5 !== target) ? `Line ${i + 1} mismatch.` : '').filter(w => w); }
function updatePoemStats(lines) { /* ... updates AI Refinement Palette (rhythm, rhyme suggestion) ... */ }


// --- PHASE 1: VERSION & AUDIO ---
function saveVersion() { 
    projectData.versionHistory.push({ id: `v-${Date.now()}`, timestamp: new Date(), name: prompt("Enter version name:"), content: document.getElementById('poemContent').value });
    updateVersionCountDisplay(); showToast(`Version saved!`); 
}
function updateVersionCountDisplay() { 
    const countEl = document.getElementById('versionCount');
    if (countEl) countEl.textContent = ` (${projectData.versionHistory.length})`;
}
function showVersionHistory() { alert(`Showing Version History:\n${projectData.versionHistory.map(v => v.name + ' - ' + v.timestamp.toLocaleDateString()).join('\n')}`); }
function loadVersion(versionId) { showToast("Version loaded (Simulated)."); }
function readAloud() { 
    const synth = window.speechSynthesis;
    if (synth.speaking) { synth.cancel(); showToast("Reading stopped."); return; }
    const utterance = new SpeechSynthesisUtterance(document.getElementById('poemContent').value);
    synth.speak(utterance); showToast("Reading aloud..."); 
}

// --- PHASE 2: DESIGN STUDIO ---
function loadDesignStudio() { 
    document.getElementById('previewTitle').textContent = previewPoem.title;
    document.getElementById('previewAuthor').textContent = previewPoem.author || "C. Lex Author";
    document.getElementById('previewContent').textContent = previewPoem.content;
    updateSliderValues();
    updatePreview();
}
function updateSliderValues() { 
    document.getElementById('fontSizeValue').textContent = document.getElementById('fontSizeSlider').value;
    document.getElementById('lineSpacingValue').textContent = document.getElementById('lineSpacingSlider').value;
}
function updatePreview() {
    const contentEl = document.getElementById('previewContent');
    const previewEl = document.getElementById('bookPreview');
    if (contentEl) {
        contentEl.style.fontFamily = document.getElementById('fontSelect')?.value;
        contentEl.style.fontSize = `${document.getElementById('fontSizeSlider').value}pt`;
        contentEl.style.lineHeight = document.getElementById('lineSpacingSlider').value;
    }
    if (previewEl) {
        previewEl.style.borderColor = document.getElementById('coverColorPicker')?.value;
    }
    showToast('Design Preview Updated!', 1000);
}

// --- PHASE 2: EXPORT ---
function processExport() {
    const payload = { title: document.getElementById('bookTitle').value, compilation_order: projectData.compilationOrder };
    console.log("Export Payload:", payload);
    closeExportModal();
    showToast(`Export request submitted! Generating DOCX, PDF/X, and EPUB files...`, 7000);
}

// --- PHASE 3: STORE & MARKETING ---
function defineProduct() {
    closeStoreModal();
    showToast(`Product defined! Ready for listing.`, 6000);
}
function generateSocialGraphic() {
    showToast(`Requesting AI graphic generation...`, 6000);
}

// --- PHASE 3: ANALYTICS ---
let analyticsData = { sales: [{ month: 'Jan', units: 120, revenue: 598.80 }], distribution: [], social: [], readership: { avgLineCompletion: 0.78, mostReadPoem: 'The Geometry of Grief' } };
function loadAnalyticsDashboard() {
    const data = simulateFetchAnalytics(); 
    // Simplified rendering for app.js
    const avgCompletion = document.getElementById('kpiAvgCompletion');
    if (avgCompletion) avgCompletion.textContent = `${(data.readership.avgLineCompletion * 100).toFixed(0)}%`;
    const mostRead = document.getElementById('kpiMostRead');
    if (mostRead) mostRead.textContent = data.readership.mostReadPoem;
}
function simulateFetchAnalytics() { return analyticsData; }
function renderSalesGraph(salesData) { /* ... simulates chart rendering ... */ }
function renderDistributionTable(distData) { /* ... renders sales table ... */ }


// --- PHASE 4: RESEARCH LIBRARY ---
function loadResearchLibrary() { 
    const container = document.getElementById('researchLibraryContainer');
    if (!container) return;
    container.innerHTML = projectData.researchItems.map(item => `
        <div class="bg-white border rounded-xl shadow-sm p-4">
            <p class="text-sm italic">${item.clipped_text.substring(0, 150)}...</p>
            <p class="text-[10px] bg-gray-50 p-1 rounded mt-2">${item.citation}</p>
        </div>
    `).join('');
}
function addNewResearchItem() {
     const newItem = { research_id: `res-${Date.now()}`, clipped_text: document.getElementById('researchText').value, citation: "Simulated Citation", keywords: [] };
     projectData.researchItems.push(newItem);
     closeResearchModal();
     loadResearchLibrary();
     showToast('Research Item saved to Library!', 3000);
}

// --- PHASE 5: AI RESEARCH MODULE ---
async function runAIResearch() {
    const query = document.getElementById('aiResearchQuery').value.trim();
    const resultsDiv = document.getElementById('aiResearchResults');
    const responseTextEl = document.getElementById('aiResponseText');
    if (!query) { showToast("Please enter a research question first.", 3000); return; }

    document.getElementById('runResearchBtn').disabled = true;
    document.getElementById('runResearchBtn').textContent = "Analyzing Context...";
    await new Promise(resolve => setTimeout(resolve, 3000)); 

    const simulatedResponse = generateSimulatedAIResponse(query);
    
    document.getElementById('runResearchBtn').disabled = false;
    document.getElementById('runResearchBtn').textContent = "Run AI Query";
    
    responseTextEl.textContent = simulatedResponse;
    resultsDiv.classList.remove('hidden');
    showToast("AI research complete!", 3000);
}

function generateSimulatedAIResponse(query) {
    if (query.toLowerCase().includes('syllable') || query.toLowerCase().includes('meter')) {
        return "The Iambic Pentameter is effective for establishing a formal, reflective tone, common in Romantic poetry. Given your project's theme, consider breaking the meter occasionally to introduce dissonance.";
    } else if (query.toLowerCase().includes('history') || query.toLowerCase().includes('context')) {
        return "The era of the 'Pale Blue' in post-war literature often symbolizes detachment or fading hope, contrasting with the vibrant optimism of the 1960s.";
    } else {
        return "The AI suggests that focusing on sensory details—specifically the sound of silence and the feel of wet concrete—will anchor your abstract metaphors in physical reality.";
    }
}

function clipAIResearch() {
    const aiResponseText = document.getElementById('aiResponseText').textContent;
    if (!aiResponseText) return;
    const newItem = { research_id: `res-${Date.now()}`, clipped_text: aiResponseText, citation: `AI Response, ${new Date().toLocaleDateString()}`, keywords: ['AI', 'Research'] };
    projectData.researchItems.push(newItem);
    loadResearchLibrary();
    document.getElementById('aiResearchResults').classList.add('hidden');
    showToast('AI Research clipped to your library!', 4000);
}

// --- PHASE 4: ANTHOLOGY MODULE ---
let simulatedProjects = [
    { id: 'proj-b', title: "Tides of the Concrete", poemCount: 35, creationDate: '2023-01-15' },
    { id: 'proj-c', title: "Winter Soliloquy", poemCount: 18, creationDate: '2024-05-20' },
];
function renderProjectSelection() {
    const listContainer = document.getElementById('projectSelectionList');
    if (!listContainer) return;
    listContainer.innerHTML = simulatedProjects.map(p => `
        <label class="flex items-center gap-3 p-2 bg-white rounded-lg cursor-pointer hover:bg-gray-100">
            <input type="checkbox" data-project-id="${p.id}" class="rounded text-purple-600">
            <div><span class="font-medium">${p.title} (${p.poemCount} poems)</span></div>
        </label>
    `).join('');
}
function createAnthology() {
    closeAnthologyModal();
    showToast(`Anthology creation request sent.`, 7000);
}


// --- FINAL INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadCompilerView();
    loadIdeaCanvas();
    loadDesignStudio();
    loadAnalyticsDashboard();
    loadResearchLibrary();
    switchTab('write'); 
    document.getElementById('poemContent')?.addEventListener('input', checkConstraints);
    document.getElementById('mobileOverlay')?.addEventListener('click', toggleMobileMenu);
});