// =========================================================
// CHROMA-LEX FRONT-END CORE LOGIC (V. 3.0 - FULL IMPLEMENTATION)
// =========================================================

// --- SIMULATED GLOBAL PROJECT STATE (ChromaLexProject) ---
let projectData = {
    projectTitle: "Ephemeral Echoes",
    availablePoems: [
        { id: 'uuid-a', title: "Ode to the Concrete Ocean", status: 'Final', content: "The quiet river runs deep and dark,\nAnd the midnight shadows slowly creep.", linkedResearchIds: ['res-1'] },
        { id: 'uuid-c', title: "The Geometry of Grief", status: 'Final', content: "Such is the geometry of grief: a perfect, small square\nWhere the future used to be.", linkedResearchIds: [] },
        { id: 'uuid-b', title: "A Study in Pale Blue", status: 'Draft', content: "Here, the sky is a page, unbound and immense,\nWhere every forgotten thought is scrawled in faint, silver ink.", linkedResearchIds: ['res-2'] },
    ],
    compilationOrder: ['uuid-c', 'uuid-a', 'uuid-b'], 
    ideaFragments: [
        { id: 'frag-1', text: "The color of regret is a muted, wet ochre.", tags: ['Metaphor', 'Color'], linkedPoemId: null },
    ],
    researchItems: [
        { research_id: 'res-1', source_url: 'https://en.wikipedia.org/wiki/Iambic_pentameter', clipped_text: 'Iambic pentameter is a metre in poetry where each line contains ten syllables, five unstressed and five stressed. It is often used in sonnets.', citation: 'Wikipedia. (n.d.). Iambic pentameter. Retrieved 2025.', keywords: ['meter', 'form'], ai_topic: 'Form & Meter', ai_summary: 'Iambic pentameter is a metre in poetry where each line contains ten syllables...' },
        { research_id: 'res-2', source_url: '', clipped_text: 'Need to research the color palette of old photographs from 1957. The use of faint pastels (pale blue, faded pink) is key to the aesthetic.', citation: 'Author Note, 2025.', keywords: ['color', '1957', 'note'], ai_topic: 'Imagery', ai_summary: 'Need to research the color palette of old photographs from 1957...' }
    ],
    versionHistory: [
        { id: 'v-1', timestamp: new Date(Date.now() - 3600000), name: "Initial Brain Dump", content: "The river runs deep,\nAnd the shadows creep." },
    ],
    definedProducts: [],
    isSidebarCollapsed: false,
    settings: {
        darkMode: false,
        autosaveInterval: 5000, 
    }
};

let constraintSettings = {
    isActive: false,
    syllables: 0,
    rhymeScheme: ''
};

// --- GLOBAL STATE VARIABLES ---
let activePoemId = projectData.availablePoems[0].id;
let autosaveTimer = null;
const STORAGE_KEY = 'chromaLexProjectData';
let draggedElement = null; // For Drag and Drop


// --- LOCAL STORAGE PERSISTENCE ---

function saveData() {
    try {
        projectData.isSidebarCollapsed = document.getElementById('sidebar')?.classList.contains('collapsed') || false;
        const serializedData = JSON.stringify(projectData);
        localStorage.setItem(STORAGE_KEY, serializedData);
    } catch (error) {
        console.error("Error saving data to localStorage:", error);
    }
}

function loadData() {
    try {
        const serializedData = localStorage.getItem(STORAGE_KEY);
        if (serializedData === null) return; 
        
        const savedData = JSON.parse(serializedData);
        savedData.versionHistory.forEach(v => v.timestamp = new Date(v.timestamp));
        projectData = savedData;
        
        if (projectData.availablePoems.length > 0) {
            activePoemId = projectData.availablePoems[0].id;
        }

        // Handle settings load 
        if (!projectData.settings) {
            projectData.settings = { darkMode: false, autosaveInterval: 5000 };
        }

    } catch (error) {
        console.error("Error loading data from localStorage:", error);
    }
}

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

function toggleSidebarCollapse() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    if (!sidebar || !mainContent) return;

    const isCollapsed = sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed', isCollapsed);

    projectData.isSidebarCollapsed = isCollapsed;
    saveData();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    const contentEl = document.getElementById(`content-${tabId}`);
    if (contentEl) contentEl.style.display = 'block';

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active', 'bg-purple-600', 'text-white'));
    const tabBtn = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabBtn) tabBtn.classList.add('tab-active', 'bg-purple-600', 'text-white');

    if (tabId === 'write') {
        const poem = projectData.availablePoems.find(p => p.id === activePoemId);
        document.getElementById('currentTabTitle').textContent = `Writing Studio: ${poem ? poem.title : 'Untitled'}`;
    } else {
        document.getElementById('currentTabTitle').textContent = tabId.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    
    // Load content specific to the tab
    if (tabId === 'compile') loadCompilerView();
    if (tabId === 'brainstorm') loadIdeaCanvas();
    if (tabId === 'design') loadDesignStudio();
    if (tabId === 'analytics') loadAnalyticsDashboard();
    if (tabId === 'research') loadResearchLibrary();
    
    if (window.innerWidth < 1024 && document.getElementById('sidebar').classList.contains('open')) {
        toggleMobileMenu();
    }
}

// --- SETTINGS AND DARK MODE LOGIC ---

function showSettingsModal() {
    document.getElementById('darkModeToggle').checked = projectData.settings.darkMode;
    document.getElementById('autosaveInterval').value = projectData.settings.autosaveInterval;
    document.getElementById('settingsModal').classList.add('active');
}
function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
}

function updateSettings() {
    projectData.settings.autosaveInterval = parseInt(document.getElementById('autosaveInterval').value);
    saveData();
    showToast('Settings saved!', 2000);
}

function toggleDarkMode() {
    const isDark = document.getElementById('darkModeToggle').checked;
    projectData.settings.darkMode = isDark;
    
    if (isDark) {
        document.body.classList.add('dark');
        document.getElementById('mainContent').classList.add('dark');
    } else {
        document.body.classList.remove('dark');
        document.getElementById('mainContent').classList.remove('dark');
    }
    saveData();
}

function applySettings() {
    if (projectData.settings.darkMode) {
        document.getElementById('darkModeToggle').checked = true;
        toggleDarkMode();
    }
}


// --- KEYBOARD SHORTCUTS (HOTKEYS) ---

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey)) {
        
        // Ctrl/Cmd + S: Save Version
        if (e.key === 's') {
            e.preventDefault(); 
            saveVersion();
        }
        
        // Ctrl/Cmd + E: Export Modal
        if (e.key === 'e') {
            e.preventDefault(); 
            showExportModal();
        }
        
        // Ctrl/Cmd + Shift + N: New Poem
        if (e.shiftKey && e.key === 'N') {
            e.preventDefault();
            createNewPoem();
        }
    }
});


// --- DYNAMIC EDITOR MANAGEMENT & AUTOSAVE ---

function updateActivePoemContent() {
    const title = document.getElementById('poemTitle')?.value;
    const content = document.getElementById('poemContent')?.value;

    const activePoem = projectData.availablePoems.find(p => p.id === activePoemId);
    if (activePoem) {
        activePoem.title = title;
        activePoem.content = content;
        
        if (content.trim().length > 50 && content.split('\n').length > 5) {
             activePoem.status = 'Draft';
        } else if (content.trim().length > 0) {
             activePoem.status = 'WIP';
        } else {
             activePoem.status = 'Empty';
        }
        
        document.getElementById('currentTabTitle').textContent = `Writing Studio: ${title}`;
    }
}

function autosave() {
    if (autosaveTimer) {
        clearTimeout(autosaveTimer);
    }
    
    const interval = projectData.settings.autosaveInterval;

    autosaveTimer = setTimeout(() => {
        updateActivePoemContent(); 
        saveData(); 
        renderPoemList();
        updatePoemStats();
        showToast('Autosaved!', 1500);
    }, interval); 
}

// --- POEM SELECTION & LIST LOGIC ---

function renderPoemList() {
    const container = document.getElementById('poemListContainer');
    if (!container) return;
    
    container.innerHTML = projectData.availablePoems.map(poem => `
        <button onclick="loadPoem('${poem.id}')" 
            class="w-full text-left p-2 rounded-lg text-sm truncate flex justify-between items-center
            ${poem.id === activePoemId ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}">
            <span class="nav-text">${poem.title}</span> 
            <span class="text-xs ml-2 opacity-70 nav-text status-${poem.status.toLowerCase()}">${poem.status}</span>
        </button>
    `).join('');
}

function loadPoem(poemId) {
    updateActivePoemContent();
    saveData();

    activePoemId = poemId;
    const poem = projectData.availablePoems.find(p => p.id === poemId);
    
    if (poem) {
        document.getElementById('poemTitle').value = poem.title;
        document.getElementById('poemContent').value = poem.content;
    }
    
    renderPoemList();
    loadLinkedResearch();
    updatePoemStats();
    checkConstraints(); // Run check on load
    switchTab('write'); 
}

function createNewPoem() {
    const newId = `uuid-${Date.now()}`;
    const newPoem = {
        id: newId,
        title: "New Untitled Work",
        status: 'Empty',
        content: "",
        linkedResearchIds: [],
    };
    projectData.availablePoems.unshift(newPoem); 
    
    saveData();
    loadPoem(newId); 
    showToast('New poem created!', 3000);
}

// --- REAL-TIME AI REFINEMENT PALETTE ---

function updatePoemStats() {
    const content = document.getElementById('poemContent')?.value || "";
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    document.getElementById('wordCount').textContent = words.length;
    document.getElementById('lineCount').textContent = lines.length;

    if (lines.length > 0) {
        const totalSimulatedSyllables = words.length * 3;
        const avgSyllables = (totalSimulatedSyllables / lines.length).toFixed(1);
        document.getElementById('avgSyllables').textContent = avgSyllables;
    } else {
        document.getElementById('avgSyllables').textContent = 0;
    }

    let tone = 'Neutral';
    if (content.toLowerCase().includes('dark') || content.toLowerCase().includes('grief')) {
        tone = 'Melancholy 😔';
    } else if (content.toLowerCase().includes('light') || content.toLowerCase().includes('joy')) {
        tone = 'Optimistic ✨';
    }
    document.getElementById('predictedTone').textContent = tone;

    checkConstraints();
}

// --- CONTEXTUAL RESEARCH LINKING ---

function loadLinkedResearch() {
    const container = document.getElementById('linkedResearch');
    const poem = projectData.availablePoems.find(p => p.id === activePoemId);
    if (!container || !poem) return;

    const linkedItems = poem.linkedResearchIds
        .map(id => projectData.researchItems.find(r => r.research_id === id))
        .filter(item => item !== undefined);

    if (linkedItems.length === 0) {
        container.innerHTML = `<p class="text-gray-500 italic dark:text-gray-500">No linked research found.</p>`;
        return;
    }

    container.innerHTML = linkedItems.map(item => `
        <div class="border-l-2 border-purple-400 pl-2">
            <p class="font-semibold text-xs text-purple-700 truncate">${item.ai_topic || item.keywords.join(', ')}</p>
            <p class="text-sm">${item.ai_summary || item.clipped_text.substring(0, 50) + '...'}</p>
        </div>
    `).join('');
}


// --- DYNAMIC COMPILATION ORDER (DRAG-AND-DROP) ---

function loadCompilerView() { renderCompilationList(); updateBookPoemCount(); }

function renderCompilationList() {
    const listEl = document.getElementById('compilationList');
    if (!listEl) return;
    
    projectData.compilationOrder = projectData.compilationOrder.filter(id => 
        projectData.availablePoems.some(p => p.id === id)
    );

    listEl.innerHTML = projectData.compilationOrder.map(id => {
        const poem = projectData.availablePoems.find(p => p.id === id);
        if (!poem) return '';
        
        return `<div data-id="${id}" draggable="true" 
            class="poem-item p-3 bg-white border border-gray-200 rounded-lg shadow-sm cursor-grab 
            flex justify-between items-center transition-shadow hover:shadow-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            ondragstart="handleDragStart(event)"
            ondragover="handleDragOver(event)"
            ondrop="handleDrop(event)"
            ondragleave="handleDragLeave(event)"
            ondragend="handleDragEnd(event)">
            <span class="font-medium">${poem.title}</span> 
            <span class="text-xs text-gray-500 dark:text-gray-400">${poem.status}</span>
        </div>`;
    }).join('');
    updateBookPoemCount();
}

function handleDragStart(e) {
    draggedElement = e.target;
    e.dataTransfer.effectAllowed = 'move';
    draggedElement.classList.add('opacity-50', 'border-dashed', 'border-2', 'border-purple-500');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const dropTarget = e.currentTarget;
    if (draggedElement !== dropTarget) {
        dropTarget.classList.add('bg-gray-200', 'dark:bg-gray-700'); 
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('bg-gray-200', 'dark:bg-gray-700');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-gray-200', 'dark:bg-gray-700');

    const dropTarget = e.currentTarget;
    if (draggedElement !== dropTarget) {
        const listContainer = document.getElementById('compilationList');
        const listItems = Array.from(listContainer.children);
        
        const draggedIndex = listItems.indexOf(draggedElement);
        const dropIndex = listItems.indexOf(dropTarget);

        if (draggedIndex < dropIndex) {
            listContainer.insertBefore(draggedElement, dropTarget.nextSibling);
        } else {
            listContainer.insertBefore(draggedElement, dropTarget);
        }

        const draggedId = draggedElement.dataset.id;
        const targetId = dropTarget.dataset.id;
        
        let newOrder = [...projectData.compilationOrder];
        const oldIndex = newOrder.indexOf(draggedId);
        
        newOrder.splice(oldIndex, 1);
        const newTargetIndex = newOrder.indexOf(targetId);
        newOrder.splice(newTargetIndex + (draggedIndex < dropIndex ? 1 : 0), 0, draggedId);

        projectData.compilationOrder = newOrder;
        
        updateCompilationOrder();
    }
}

function handleDragEnd(e) {
    draggedElement.classList.remove('opacity-50', 'border-dashed', 'border-2', 'border-purple-500');
    draggedElement = null;
    document.querySelectorAll('.poem-item').forEach(el => el.classList.remove('bg-gray-200', 'dark:bg-gray-700'));
}

function updateCompilationOrder() { saveData(); showToast("Compilation order updated (Simulated)", 1500); }
function updateBookPoemCount() { 
    const countEl = document.getElementById('bookPoemCount');
    if (countEl) countEl.textContent = projectData.compilationOrder.length;
}
function generateBook() { showToast(`Generating final book with ${projectData.compilationOrder.length} poems...`, 5000); }


// --- IDEA CANVAS LOGIC (WITH FILTERING) ---
function loadIdeaCanvas() {
    const ideasGrid = document.getElementById('ideasGrid');
    const filterText = document.getElementById('ideaFilterInput')?.value.toLowerCase() || '';
    
    if (!ideasGrid) return;
    
    const filteredFragments = projectData.ideaFragments.filter(fragment => {
        const textMatch = fragment.text.toLowerCase().includes(filterText);
        const tagMatch = fragment.tags.some(tag => tag.toLowerCase().includes(filterText));
        return textMatch || tagMatch;
    });

    ideasGrid.innerHTML = filteredFragments.map(fragment => `
        <div class="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm flex flex-col justify-between dark:bg-gray-700 dark:border-gray-600">
            <div>
                <p class="text-gray-800 text-sm mb-3 dark:text-gray-200">${fragment.text}</p>
                <div class="flex flex-wrap gap-1 mb-3">
                    ${fragment.tags.map(tag => `<span class="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full dark:bg-purple-900 dark:text-purple-300">${tag}</span>`).join('')}
                </div>
            </div>
            <div class="flex justify-end space-x-2 border-t pt-3 mt-2 dark:border-gray-600">
                <button onclick="exportFragmentToEditor('${fragment.id}')" class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">Export to Editor</button>
                <button onclick="deleteFragment('${fragment.id}')" class="text-xs text-red-500 hover:text-red-700">Delete</button>
            </div>
        </div>
    `).join('');
}

function showNewIdeaModal() { 
    const text = prompt("Enter new fragment:");
    if (text) addNewIdea(text.split('|')[0], text.split('|')[1]?.split(',') || []);
}

function addNewIdea(text, tags) { 
    const newFragment = { id: `frag-${Date.now()}`, text: text, tags: tags, linkedPoemId: null };
    projectData.ideaFragments.push(newFragment);

    saveData(); 
    showToast('New idea fragment captured!', 3000); 
    loadIdeaCanvas();
}

function deleteFragment(fragmentId) {
    projectData.ideaFragments = projectData.ideaFragments.filter(f => f.id !== fragmentId);
    saveData();
    showToast('Idea fragment deleted.', 2000);
    loadIdeaCanvas(); 
}

function exportFragmentToEditor(fragmentId) { 
    const fragment = projectData.ideaFragments.find(f => f.id === fragmentId);
    if (fragment) { document.getElementById('poemContent').value += '\n\n' + fragment.text; switchTab('write'); autosave(); showToast(`Fragment exported!`); }
}


// --- REAL-TIME CONSTRAINT FEEDBACK ---
function simulateSyllableCheck(lines, target) {
    const warnings = [];
    const simulatedContent = document.getElementById('poemContentSimulated');
    const textarea = document.getElementById('poemContent');
    
    if (!simulatedContent || !textarea) return warnings;

    simulatedContent.scrollTop = textarea.scrollTop;

    const newHtml = lines.map((line, i) => {
        const simulatedSyllables = line.length % 5 + 5; 
        const isViolation = target > 0 && simulatedSyllables !== target;
        
        if (isViolation) {
            warnings.push(`Line ${i + 1} (${simulatedSyllables} syllables) violates the ${target}-syllable constraint.`);
        }
        
        // Use non-breaking space for empty lines to maintain height
        return `<div class="${isViolation ? 'constraint-violation' : ''}">${line || '&nbsp;'}</div>`;

    }).join('');

    simulatedContent.innerHTML = newHtml;
    // Add a final empty div to maintain scrollability parity with textarea
    simulatedContent.innerHTML += `<div style="height: 1.6em;"></div>`; 

    return warnings;
}

function checkConstraints() {
    const textarea = document.getElementById('poemContent');
    const simulatedContent = document.getElementById('poemContentSimulated');
    if (!textarea || !simulatedContent) return;
    
    const lines = textarea.value.split('\n');
    
    if (constraintSettings.isActive) {
        const warnings = simulateSyllableCheck(lines, constraintSettings.syllables);
        
        if (warnings.length > 0) {
            showToast(warnings[0], 4000);
        }
    } else {
        // Clear visualization if constraint mode is off, but keep sync
        simulatedContent.innerHTML = lines.map(line => `<div>${line || '&nbsp;'}</div>`).join('');
    }
}

function toggleConstraintMode() { 
    const checkbox = document.getElementById('constraintMode');
    const optionsDiv = document.getElementById('constraintOptions');
    constraintSettings.isActive = checkbox.checked;
    optionsDiv.style.display = checkbox.checked ? 'flex' : 'none';
    if (checkbox.checked) updateConstraintSettings();
    checkConstraints();
}
function updateConstraintSettings() {
    constraintSettings.syllables = parseInt(document.getElementById('syllablesPerLine').value) || 0;
    constraintSettings.rhymeScheme = document.getElementById('rhymeScheme').value.toUpperCase().trim();
    checkConstraints();
}


// --- VERSION & AUDIO ---
function saveVersion() { 
    const content = document.getElementById('poemContent').value;
    if (content.length === 0) { showToast("Cannot save empty version.", 2000); return; }
    
    updateActivePoemContent();
    
    projectData.versionHistory.push({ id: `v-${Date.now()}`, timestamp: new Date(), name: prompt("Enter version name:"), content: content });
    updateVersionCountDisplay(); 
    saveData();
    showToast(`Version saved!`); 
}
function updateVersionCountDisplay() { 
    const countEl = document.getElementById('versionCount');
    if (countEl) countEl.textContent = ` (${projectData.versionHistory.length})`;
}
function showVersionHistory() { alert(`Showing Version History:\n${projectData.versionHistory.map(v => v.name + ' - ' + v.timestamp.toLocaleDateString()).join('\n')}`); }
function readAloud() { 
    const synth = window.speechSynthesis;
    if (synth.speaking) { synth.cancel(); showToast("Reading stopped."); return; }
    const utterance = new SpeechSynthesisUtterance(document.getElementById('poemContent').value);
    synth.speak(utterance); showToast("Reading aloud..."); 
}


// --- DESIGN STUDIO ---
function loadDesignStudio() { 
    const poem = projectData.availablePoems.find(p => p.id === activePoemId) || { title: "N/A", content: "No poem selected." };
    document.getElementById('previewTitle').textContent = poem.title;
    document.getElementById('previewAuthor').textContent = "C. Lex Author";
    document.getElementById('previewContent').textContent = poem.content;
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


// --- EXPORT ---
function showExportModal() { document.getElementById('exportModal').classList.add('active'); }
function closeExportModal() { document.getElementById('exportModal').classList.remove('active'); }
function processExport() {
    closeExportModal();
    saveData();
    showToast(`Export request submitted! Generating DOCX, PDF/X, and EPUB files...`, 7000);
}


// --- STORE & MARKETING ---
function showStoreModal() { document.getElementById('storeModal').classList.add('active'); }
function closeStoreModal() { document.getElementById('storeModal').classList.remove('active'); }
function defineProduct() {
    closeStoreModal();
    saveData();
    showToast(`Product defined! Ready for listing.`, 6000);
}
function generateSocialGraphic() {
    showToast(`Requesting AI graphic generation...`, 6000);
}


// --- ANALYTICS AND SALES SIMULATION ---

function generateSimulatedAnalytics() {
    const baseUnits = 100;
    const salesData = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 12; i++) {
        const units = baseUnits + Math.floor(Math.random() * 50) * (Math.random() > 0.4 ? 1 : -0.5);
        const revenue = (units * 4.99 * (0.7 + Math.random() * 0.1)).toFixed(2); 
        salesData.push({ month: months[i], units: Math.max(0, units), revenue: parseFloat(revenue) });
    }

    return {
        sales: salesData,
        readership: {
            avgLineCompletion: (0.6 + Math.random() * 0.3).toFixed(2),
            mostReadPoem: projectData.availablePoems[Math.floor(Math.random() * projectData.availablePoems.length)].title,
        },
        distribution: [
            { channel: 'ChromaLex Direct', units: 550, revenue: 2744.50, royalty: 90 },
            { channel: 'Amazon KDP', units: 350, revenue: 1225.00, royalty: 35 },
            { channel: 'IngramSpark', units: 100, revenue: 399.00, royalty: 65 },
        ]
    };
}

function loadAnalyticsDashboard() {
    const data = generateSimulatedAnalytics(); 
    
    document.getElementById('kpiAvgCompletion').textContent = `${(data.readership.avgLineCompletion * 100).toFixed(0)}%`;
    document.getElementById('kpiMostRead').textContent = data.readership.mostReadPoem;
    document.getElementById('kpiTotalShares').textContent = (Math.random() * 5000).toFixed(0);
    document.getElementById('kpiTotalClicks').textContent = (Math.random() * 1200).toFixed(0);
    
    renderSalesGraph(data.sales);
    renderDistributionTable(data.distribution);
}

function renderSalesGraph(salesData) {
    const graphEl = document.getElementById('salesGraph');
    if (!graphEl) return;
    
    const maxRevenue = Math.max(...salesData.map(d => d.revenue));
    
    const graphHTML = `
        <h4 class="text-lg font-semibold mb-4 dark:text-gray-200">Revenue Trend (Last 12 Months)</h4>
        <div class="h-64 flex items-end border-b border-l pb-1 text-xs relative dark:border-gray-600">
            ${salesData.map(d => {
                const heightPercent = (d.revenue / maxRevenue) * 90;
                return `
                    <div title="$${d.revenue} in ${d.month}" 
                         class="flex flex-col items-center justify-end w-1/12 h-full px-1">
                        <div class="w-full bg-blue-500 rounded-t-sm transition-all duration-500" 
                             style="height: ${heightPercent}%;"></div>
                        <span class="text-[10px] text-gray-500 mt-1">${d.month}</span>
                    </div>
                `;
            }).join('')}
             <span class="absolute top-0 left-0 text-gray-500 dark:text-gray-400">\$${maxRevenue.toFixed(0)}</span>
        </div>
    `;
    graphEl.innerHTML = graphHTML;
}

function renderDistributionTable(distData) {
    const tableBody = document.getElementById('distributionTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = distData.map(d => {
        const revenueShare = ((d.revenue / d.units) * (d.royalty / 100)).toFixed(2);
        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">${d.channel}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${d.units}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">\$${d.revenue.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${d.royalty}%</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700 dark:text-green-400">\$${revenueShare} / unit</td>
            </tr>
        `;
    }).join('');
}


// --- RESEARCH LIBRARY (WITH LINKING AND AI ANALYSIS) ---
function showResearchModal() { document.getElementById('researchModal').classList.add('active'); }
function closeResearchModal() { document.getElementById('researchModal').classList.remove('active'); }

function addNewResearchItem() {
    const text = document.getElementById('researchText').value;
    if (text.trim() === '') {
        showToast("Research note cannot be empty.", 2000);
        return;
    }

    const keywords = document.getElementById('researchKeywords').value.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    // Simulate AI Analysis and Summarization
    const topic = text.toLowerCase().includes('greek') ? 'Mythology' : 
                  text.toLowerCase().includes('color') ? 'Imagery' : 
                  'General Context';
    const summary = text.substring(0, 75).trim() + (text.length > 75 ? '...' : '');

    const newItem = { 
        research_id: `res-${Date.now()}`, 
        clipped_text: text, 
        source_url: document.getElementById('researchUrl').value,
        citation: "Simulated Citation, 2025", 
        keywords: keywords,
        ai_topic: topic, 
        ai_summary: summary 
    };
    projectData.researchItems.push(newItem);
    
    const activePoem = projectData.availablePoems.find(p => p.id === activePoemId);
    if (activePoem && !activePoem.linkedResearchIds.includes(newItem.research_id)) {
        activePoem.linkedResearchIds.push(newItem.research_id);
    }

    closeResearchModal();
    loadResearchLibrary();
    loadLinkedResearch();
    saveData();
    showToast(`Research Item (Topic: ${topic}) saved and linked!`, 3000);
}

function loadResearchLibrary() { 
    const container = document.getElementById('researchLibraryContainer');
    if (!container) return;
    container.innerHTML = projectData.researchItems.map(item => {
        const isLinked = projectData.availablePoems.find(p => p.id === activePoemId)?.linkedResearchIds.includes(item.research_id);
        const linkButton = `<button onclick="toggleResearchLink('${item.research_id}')" class="text-xs ${isLinked ? 'text-red-500 hover:text-red-700' : 'text-purple-600 hover:text-purple-800'} ml-3">
            ${isLinked ? 'Unlink from Current' : 'Link to Current Poem'}
        </button>`;

        return `
            <div class="bg-white border rounded-xl shadow-sm p-4 dark:bg-gray-800 dark:border-gray-700">
                <p class="text-xs font-semibold text-indigo-700 mb-1 dark:text-indigo-400">AI Topic: ${item.ai_topic}</p>
                <p class="text-sm italic border-l-2 border-gray-300 pl-2 dark:text-gray-300 dark:border-gray-600">${item.ai_summary}</p>
                <p class="text-[10px] bg-gray-50 p-1 rounded mt-2 flex justify-between items-center dark:bg-gray-900 dark:text-gray-400">
                    ${item.citation} ${linkButton}
                </p>
            </div>
        `;
    }).join('');
}

function toggleResearchLink(researchId) {
    const poem = projectData.availablePoems.find(p => p.id === activePoemId);
    if (!poem) return;

    const index = poem.linkedResearchIds.indexOf(researchId);

    if (index > -1) {
        poem.linkedResearchIds.splice(index, 1);
        showToast("Research unlinked from poem.", 2000);
    } else {
        poem.linkedResearchIds.push(researchId);
        showToast("Research linked to current poem!", 2000);
    }
    
    saveData();
    loadResearchLibrary();
    loadLinkedResearch();
}


// --- AI RESEARCH MODULE ---
async function runAIResearch() { 
    const query = document.getElementById('aiResearchQuery').value;
    if (query.trim() === "") return;

    document.getElementById('runResearchBtn').disabled = true;
    document.getElementById('aiResearchLoading').classList.remove('hidden');
    document.getElementById('aiResearchResults').classList.add('hidden');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000)); 

    const response = generateSimulatedAIResponse(query);
    document.getElementById('aiResponseText').textContent = response;

    document.getElementById('aiResearchLoading').classList.add('hidden');
    document.getElementById('aiResearchResults').classList.remove('hidden');
    document.getElementById('runResearchBtn').disabled = false;
}
function generateSimulatedAIResponse(query) {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('rhyme scheme')) {
        return "The most common rhyme schemes in English sonnets are ABAB CDCD EFEF GG (Shakespearean) and ABBA ABBA CDCDCD (Petrarchan/Italian). The GG couplet offers a strong concluding sense of closure.";
    } else if (lowerQuery.includes('color')) {
        return "The psychological impact of blue often relates to melancholy, vastness, and calm. Pale blue, specifically, suggests memory, fading light, and historical distance, often used to symbolize a beautiful, yet unreachable, past.";
    } else {
        return `AI analysis complete for query: "${query}". Contextual insights: Ensure thematic consistency across key metaphors. The current poem appears to be exploring themes of structure versus emotion. Suggest considering the use of recurring motifs related to architecture.`;
    }
}
function clipAIResearch() {
    document.getElementById('researchText').value = document.getElementById('aiResponseText').textContent;
    closeResearchModal(); 
    showResearchModal();
}


// --- ANTHOLOGY MODULE (PROJECT MANAGEMENT) ---

let simulatedProjects = [
    { id: 'proj-b', title: "Tides of the Concrete", poemCount: 35, creationDate: '2023-01-15', poemData: [] },
    { id: 'proj-c', title: "Winter Soliloquy", poemCount: 18, creationDate: '2024-05-20', poemData: [] },
];

function showAnthologyModal() {
    renderProjectSelection();
    document.getElementById('anthologyModal').classList.add('active');
}
function closeAnthologyModal() { document.getElementById('anthologyModal').classList.remove('active'); }

function renderProjectSelection() {
    const container = document.getElementById('projectSelectionList');
    if (!container) return;

    const currentProjectData = { id: projectData.projectTitle, title: projectData.projectTitle, poemCount: projectData.availablePoems.length, creationDate: new Date().toISOString().split('T')[0] };
    const allProjects = [currentProjectData, ...simulatedProjects];

    container.innerHTML = allProjects.map(proj => `
        <label class="flex items-center gap-3 p-2 bg-white border rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
            <input type="checkbox" name="anthology-project" value="${proj.title}" class="rounded text-purple-600">
            <span class="text-gray-700 dark:text-gray-300">${proj.title} (${proj.poemCount} poems)</span>
        </label>
    `).join('');
}

function createAnthology() {
    const selectedCheckboxes = document.querySelectorAll('#projectSelectionList input[name="anthology-project"]:checked');
    const selectedTitles = Array.from(selectedCheckboxes).map(cb => cb.value);
    const anthologyTitle = document.getElementById('anthologyTitle').value.trim();

    if (selectedTitles.length < 2 || anthologyTitle === '') {
        showToast("Please select at least two projects and provide an Anthology title.", 4000);
        return;
    }

    let totalPoems = 0;
    selectedTitles.forEach(title => {
        if (title === projectData.projectTitle) {
            totalPoems += projectData.availablePoems.length;
        } else {
            const proj = simulatedProjects.find(p => p.title === title);
            if (proj) totalPoems += proj.poemCount;
        }
    });

    closeAnthologyModal();
    alert(`Anthology created! Title: "${anthologyTitle}". Combines ${selectedTitles.length} projects with a total of ${totalPoems} poems. (Simulated New Project Load)`);
    showToast(`Master Anthology "${anthologyTitle}" Created!`, 5000);
}


// --- FINAL INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Load data from previous session
    loadData(); 
    
    // 2. Apply settings from persistence
    applySettings();
    
    // 3. Apply persistence UI state (sidebar collapse)
    if (projectData.isSidebarCollapsed) {
        document.getElementById('sidebar')?.classList.add('collapsed');
        document.getElementById('mainContent')?.classList.add('sidebar-collapsed');
    }
    
    // 4. Initialize content
    loadPoem(activePoemId); 
    updateVersionCountDisplay();
    
    // 5. Set up event listeners
    const textarea = document.getElementById('poemContent');
    const simulatedContent = document.getElementById('poemContentSimulated');
    
    document.getElementById('poemTitle')?.addEventListener('input', autosave);
    textarea?.addEventListener('input', autosave);
    textarea?.addEventListener('input', updatePoemStats);
    
    // Sync scroll position between the textarea (input) and the simulated overlay (output)
    textarea?.addEventListener('scroll', () => {
        simulatedContent.scrollTop = textarea.scrollTop;
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tabId));
    });

    // 6. Initial UI rendering
    loadCompilerView();
    loadIdeaCanvas();
    loadDesignStudio();
    loadAnalyticsDashboard();
    loadResearchLibrary();
    switchTab('write'); 
    
    // Update stats immediately after content is loaded
    updatePoemStats();
});
