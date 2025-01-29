import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDpFnEoKWRQG1fXXQ282hdwjGyLCtAYWuM",
    authDomain: "pcmi---chatbot-abfd0.firebaseapp.com",
    projectId: "pcmi---chatbot-abfd0",
    storageBucket: "pcmi---chatbot-abfd0.firebasestorage.app",
    messagingSenderId: "162065597510",
    appId: "1:162065597510:web:9c1759f6b59d2e2d9db647"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentDoc = '';
let originalContent = '';

// DOM Elements
const editor = document.getElementById('editor');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const saveStatus = document.getElementById('saveStatus');
const lineNumbers = document.querySelector('.line-numbers');
const searchBox = document.getElementById('searchBox');
const searchInput = document.getElementById('searchInput');

// Document Selection
document.querySelectorAll('.doc-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        document.querySelectorAll('.doc-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        currentDoc = btn.dataset.doc;
        document.getElementById('currentDoc').textContent = btn.textContent;
        
        try {
            const docRef = doc(db, 'training-data', currentDoc);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                originalContent = docSnap.data().content;
                editor.value = originalContent;
                updateLineNumbers();
                enableButtons();
            }
        } catch (error) {
            console.error('Error loading document:', error);
            saveStatus.textContent = 'Error loading document';
        }
    });
});

// Line numbers
function updateLineNumbers() {
    const lines = editor.value.split('\n').length;
    lineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => `<div>${i + 1}</div>`).join('');
}

editor.addEventListener('input', () => {
    const hasChanges = editor.value !== originalContent;
    saveBtn.disabled = !hasChanges;
    resetBtn.disabled = !hasChanges;
    updateLineNumbers();
});

// Save Handler
saveBtn.addEventListener('click', async () => {
    try {
        const docRef = doc(db, 'training-data', currentDoc);
        await updateDoc(docRef, {
            content: editor.value
        });
        
        originalContent = editor.value;
        saveStatus.textContent = 'Changes saved successfully!';
        disableButtons();
        
        setTimeout(() => {
            saveStatus.textContent = '';
        }, 3000);
    } catch (error) {
        console.error('Error saving document:', error);
        saveStatus.textContent = 'Error saving changes';
    }
});

// Reset Handler
resetBtn.addEventListener('click', () => {
    editor.value = originalContent;
    updateLineNumbers();
    disableButtons();
});

// Search functionality
let searchMatches = [];
let currentMatchIndex = -1;

document.getElementById('searchBtn').addEventListener('click', () => {
    searchBox.classList.toggle('hidden');
    if (!searchBox.classList.contains('hidden')) {
        searchInput.focus();
    }
});

document.getElementById('closeSearch').addEventListener('click', () => {
    searchBox.classList.add('hidden');
    clearSearch();
});

function performSearch() {
    const searchTerm = searchInput.value;
    if (!searchTerm) {
        clearSearch();
        return;
    }

    const text = editor.value;
    searchMatches = [...text.matchAll(new RegExp(searchTerm, 'gi'))].map(match => match.index);
    currentMatchIndex = searchMatches.length > 0 ? 0 : -1;
    highlightCurrentMatch();
}

function clearSearch() {
    searchMatches = [];
    currentMatchIndex = -1;
    editor.focus();
}

function highlightCurrentMatch() {
    if (currentMatchIndex >= 0 && searchMatches.length > 0) {
        const matchIndex = searchMatches[currentMatchIndex];
        editor.focus();
        editor.setSelectionRange(matchIndex, matchIndex + searchInput.value.length);
    }
}

document.getElementById('prevMatch').addEventListener('click', () => {
    if (currentMatchIndex > 0) {
        currentMatchIndex--;
        highlightCurrentMatch();
    }
});

document.getElementById('nextMatch').addEventListener('click', () => {
    if (currentMatchIndex < searchMatches.length - 1) {
        currentMatchIndex++;
        highlightCurrentMatch();
    }
});

searchInput.addEventListener('input', performSearch);

// Undo/Redo functionality
let undoStack = [];
let redoStack = [];

editor.addEventListener('input', () => {
    undoStack.push(editor.value);
    redoStack = [];
});

document.getElementById('undoBtn').addEventListener('click', () => {
    if (undoStack.length > 1) {
        redoStack.push(undoStack.pop());
        editor.value = undoStack[undoStack.length - 1];
        updateLineNumbers();
    }
});

document.getElementById('redoBtn').addEventListener('click', () => {
    if (redoStack.length > 0) {
        const value = redoStack.pop();
        undoStack.push(value);
        editor.value = value;
        updateLineNumbers();
    }
});

// Fullscreen functionality
const fullscreenBtn = document.getElementById('fullscreenBtn');
const editorSection = document.querySelector('.editor-section');

fullscreenBtn.addEventListener('click', () => {
    editorSection.classList.toggle('fullscreen-editor');
    const icon = fullscreenBtn.querySelector('.material-icons');
    if (editorSection.classList.contains('fullscreen-editor')) {
        icon.textContent = 'fullscreen_exit';
    } else {
        icon.textContent = 'fullscreen';
    }
});

// Exit fullscreen with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editorSection.classList.contains('fullscreen-editor')) {
        editorSection.classList.remove('fullscreen-editor');
        fullscreenBtn.querySelector('.material-icons').textContent = 'fullscreen';
    }
});

function enableButtons() {
    saveBtn.disabled = false;
    resetBtn.disabled = false;
}

function disableButtons() {
    saveBtn.disabled = true;
    resetBtn.disabled = true;
}

// Initialize
updateLineNumbers();