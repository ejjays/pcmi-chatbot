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
                enableButtons();
            }
        } catch (error) {
            console.error('Error loading document:', error);
            saveStatus.textContent = 'Error loading document';
        }
    });
});

// Editor Change Handler
editor.addEventListener('input', () => {
    const hasChanges = editor.value !== originalContent;
    saveBtn.disabled = !hasChanges;
    resetBtn.disabled = !hasChanges;
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
    disableButtons();
});

function enableButtons() {
    saveBtn.disabled = false;
    resetBtn.disabled = false;
}

function disableButtons() {
    saveBtn.disabled = true;
    resetBtn.disabled = true;
}

// Fullscreen functionality
const fullscreenBtn = document.getElementById('fullscreenBtn');
const editorSection = document.querySelector('.editor-section');

fullscreenBtn.addEventListener('click', () => {
    editorSection.classList.toggle('fullscreen-editor');
    const icon = fullscreenBtn.querySelector('.material-symbols-rounded');
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
        fullscreenBtn.querySelector('.material-symbols-rounded').textContent = 'fullscreen';
    }
});