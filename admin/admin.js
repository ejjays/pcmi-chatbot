import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs,
    doc, 
    getDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDpFnEoKWRQG1fXXQ282hdwjGyLCtAYWuM",
    authDomain: "pcmi---chatbot-abfd0.firebaseapp.com",
    projectId: "pcmi---chatbot-abfd0",
    storageBucket: "pcmi---chatbot-abfd0.firebasestorage.app",
    messagingSenderId: "162065597510",
    appId: "1:162065597510:web:9c1759f6b59d2e2d9db647"
};

let db;

async function initializeFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        console.log('✅ Firebase App initialized successfully:', app);
        
        db = getFirestore(app);
        console.log('✅ Firestore initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        return false;
    }
}

// Single DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase first
    const isInitialized = await initializeFirebase();
    if (!isInitialized) {
        console.error('Failed to initialize Firebase');
        return;
    }

    // Initialize variables
    let currentDoc = '';
    let originalContent = '';
    let undoStack = [];
    let redoStack = [];
    let searchMatches = [];
    let currentMatchIndex = -1;

    // DOM Elements
    const documentList = document.getElementById('documentList');
    const editorView = document.getElementById('editorView');
    const docButtons = document.querySelector('.doc-buttons');
    const editor = document.getElementById('editor');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const saveStatus = document.getElementById('saveStatus');
    const searchBox = document.getElementById('searchBox');
    const searchInput = document.getElementById('searchInput');

    // Check if all elements are available
    if (!documentList || !editorView || !docButtons || !editor || !saveBtn || 
        !resetBtn || !saveStatus || !searchBox || !searchInput) {
        console.error('One or more required DOM elements are missing.');
        return; 
    }

    // Load documents when page loads
    async function loadDocuments() {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.textContent = 'Loading documents...';
        documentList.appendChild(loadingIndicator);
        
        console.group('📚 Loading Training Documents');
        try {
            console.log('🔄 Fetching documents from collection: training-data');
            const querySnapshot = await getDocs(collection(db, 'training-data'));
            console.log(`📊 Total documents found: ${querySnapshot.size}`);

            if (querySnapshot.size === 0) {
                console.warn('⚠️ No documents found in collection');
                docButtons.innerHTML = '<p>No documents available</p>';
                return;
            }
            
            docButtons.innerHTML = ''; // Clear existing buttons
            
            let loadedCount = 0;
            querySnapshot.forEach((doc) => {
                loadedCount++;
                console.log(`📄 Document ${loadedCount}/${querySnapshot.size}:`, {
                    id: doc.id,
                    exists: doc.exists(),
                    size: JSON.stringify(doc.data()).length + ' bytes'
                });
                
                const btn = document.createElement('button');
                btn.className = 'doc-btn';
                btn.dataset.doc = doc.id;
                btn.textContent = doc.id;
                docButtons.appendChild(btn);
            });

            console.log('✅ All document buttons created successfully');

            // Add click handlers to buttons with logging
            document.querySelectorAll('.doc-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    console.group(`📝 Loading Document: ${btn.dataset.doc}`);
                    console.time(`Load time for ${btn.dataset.doc}`);
                    
                    document.querySelectorAll('.doc-btn').forEach(b => 
                        b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    currentDoc = btn.dataset.doc;
                    
                    try {
                        const docRef = doc(db, 'training-data', currentDoc);
                        console.log('🔄 Fetching document content...');
                        
                        const docSnap = await getDoc(docRef);
                        
                        if (docSnap.exists()) {
                            originalContent = docSnap.data().content;
                            console.log('📊 Document stats:', {
                                id: docSnap.id,
                                contentLength: originalContent.length,
                                contentSize: new Blob([originalContent]).size + ' bytes'
                            });
                            
                            editor.value = originalContent;
                            enableButtons();
                            
                            documentList.style.display = 'none';
                            editorView.style.display = 'flex';
                            
                            console.log('✅ Document loaded successfully');
                        } else {
                            console.warn('⚠️ Document does not exist');
                        }
                        
                    } catch (error) {
                        console.error('❌ Error loading document:', error);
                        console.error('Stack trace:', error.stack);
                        saveStatus.textContent = 'Error loading document';
                    }
                    
                    console.timeEnd(`Load time for ${btn.dataset.doc}`);
                    console.groupEnd();
                });
            });

            console.log('✅ Document loading process completed successfully');
            
        } catch (error) {
            console.error('❌ Error loading documents:', error);
            console.error('Stack trace:', error.stack);
        } finally {
            loadingIndicator.remove();
            console.groupEnd();
        }
    }

    // Editor event listeners
    editor.addEventListener('input', () => {
        const hasChanges = editor.value !== originalContent;
        saveBtn.disabled = !hasChanges;
        resetBtn.disabled = !hasChanges;
        
        // Add to undo stack
        undoStack.push(editor.value);
        redoStack = [];
    });

    // Save functionality
    saveBtn.addEventListener('click', async () => {
        console.group('💾 Saving Document Changes');
        try {
            const docRef = doc(db, 'training-data', currentDoc);
            console.log('🔄 Updating document:', currentDoc);
            
            await updateDoc(docRef, {
                content: editor.value
            });
            
            originalContent = editor.value;
            saveStatus.textContent = 'Changes saved successfully!';
            console.log('✅ Document saved successfully');
            disableButtons();
            
            setTimeout(() => {
                saveStatus.textContent = '';
            }, 3000);
        } catch (error) {
            console.error('❌ Error saving document:', error);
            console.error('Stack trace:', error.stack);
            saveStatus.textContent = 'Error saving changes';
        }
        console.groupEnd();
    });

    // Reset functionality
    resetBtn.addEventListener('click', () => {
        editor.value = originalContent;
        disableButtons();
    });

    // Search functionality
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
    document.getElementById('undoBtn').addEventListener('click', () => {
        if (undoStack.length > 1) {
            redoStack.push(undoStack.pop());
            editor.value = undoStack[undoStack.length - 1];
        }
    });

    document.getElementById('redoBtn').addEventListener('click', () => {
        if (redoStack.length > 0) {
            const value = redoStack.pop();
            undoStack.push(value);
            editor.value = value;
        }
    });

    // Cleanup function
    function cleanup() {
        document.querySelectorAll('.doc-btn').forEach(btn => {
            btn.removeEventListener('click', handleButtonClick);
        });
    }

    // Add a function to beautify the text
    function beautifyText() {
        let text = editor.value;
        
        // Split into lines and remove empty lines at start and end
        let lines = text.split('\n').filter(line => line.trim());
        
        // Process each line
        lines = lines.map(line => {
            // Trim whitespace
            line = line.trim();
            
            // Add proper spacing after punctuation
            line = line.replace(/([.,!?:;])(\S)/g, '$1 $2');
            
            // Remove multiple spaces
            line = line.replace(/\s+/g, ' ');
            
            return line;
        });
        
        // Join lines with proper spacing
        text = lines.join('\n\n');
        
        // Update editor content
        editor.value = text;
        
        // Add to undo stack
        undoStack.push(editor.value);
        redoStack = [];
        
        // Enable save button since content has changed
        saveBtn.disabled = false;
        resetBtn.disabled = false;
    }

    // Add event listener for beautify button
    document.getElementById('beautifyBtn').addEventListener('click', beautifyText);

    // Menu button (back to document list)
    document.getElementById('menuBtn').addEventListener('click', () => {
        editorView.style.display = 'none';
        documentList.style.display = 'block';
    });

    // Utility functions
    function enableButtons() {
        saveBtn.disabled = false;
        resetBtn.disabled = false;
    }

    function disableButtons() {
        saveBtn.disabled = true;
        resetBtn.disabled = true;
    }

    // Error boundary for unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
        console.error('Unhandled promise rejection:', event.reason);
        saveStatus.textContent = 'An unexpected error occurred';
    });

    // Initialize
    loadDocuments();
});