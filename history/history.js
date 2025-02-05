import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  where,
  getDocs 
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Use the same Firebase config from script.js
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

const ipList = document.getElementById('ip-list');
const chatContainer = document.getElementById('chat-container');
const selectedUser = document.getElementById('selected-user');

// Load unique IP addresses
// Load unique IP addresses
const loadUserIPs = async () => {
  try {
    const chatHistoryRef = collection(db, "chat-history");
    const querySnapshot = await getDocs(chatHistoryRef);
    
    const uniqueIPs = new Set();
    querySnapshot.forEach(doc => {
      uniqueIPs.add(doc.data().userIP);
    });

    ipList.innerHTML = '';
    uniqueIPs.forEach(ip => {
      const ipDiv = document.createElement('div');
      ipDiv.classList.add('ip-item');
      ipDiv.textContent = ip;
      
      // Add active state handling
      ipDiv.addEventListener('click', () => {
        // Remove active class from all IPs
        document.querySelectorAll('.ip-item').forEach(item => {
          item.classList.remove('active');
        });
        
        // Add active class to clicked IP
        ipDiv.classList.add('active');
        
        // Load chat history for this IP
        loadChatHistory(ip);
      });
      
      ipList.appendChild(ipDiv);
    });
  } catch (error) {
    console.error('Error loading IPs:', error);
    ipList.innerHTML = '<div class="error">Error loading user IPs</div>';
  }
};

// Load chat history for selected IP
const loadChatHistory = async (ip) => {
  try {
    // Show loading state
    selectedUser.textContent = `Loading chat history for ${ip}...`;
    chatContainer.innerHTML = '<div class="loading">Loading messages...</div>';

    const chatHistoryRef = collection(db, "chat-history");
    const q = query(
      chatHistoryRef,
      where("userIP", "==", ip),
      orderBy("timestamp", "asc")
    );

    const querySnapshot = await getDocs(q);
  
    
    // Clear container after loading
    chatContainer.innerHTML = '';
    selectedUser.textContent = `Chat History for ${ip}`;
    
    if (querySnapshot.empty) {
      chatContainer.innerHTML = '<div class="no-messages">No messages found</div>';
      return;
    }

    querySnapshot.forEach(doc => {
      const data = doc.data();
      
      // Create user message
      const userMessage = document.createElement('div');
      userMessage.classList.add('message', 'outgoing');
      userMessage.innerHTML = `
        <div class="message-content">
          <p class="text">${data.message}</p>
          <small class="time">${data.philippinesTime}</small>
        </div>
      `;
      
      // Create bot response
      const botMessage = document.createElement('div');
      botMessage.classList.add('message', 'incoming');
      botMessage.innerHTML = `
        <div class="message-content">
          <div class="header-row">
            <div class="avatar-container">
              <img class="avatar default-avatar" src="./images/avatars/pcmi-bot.png" alt="Bot avatar">
            </div>
          </div>
          <p class="text">${data.response}</p>
          <small class="time">${data.philippinesTime}</small>
        </div>
      `;

      chatContainer.appendChild(userMessage);
      chatContainer.appendChild(botMessage);
    });

    // Scroll to top of chat history
    chatContainer.scrollTop = 0;

  } catch (error) {
    console.error('Error loading chat history:', error);
    if (error.message.includes('requires an index')) {
      chatContainer.innerHTML = '<div class="error">Setting up database indexes. Please try again in a few minutes.</div>';
    } else {
      chatContainer.innerHTML = '<div class="error">Error loading chat history. Please try again.</div>';
    }
    selectedUser.textContent = 'Error loading chat history';
  }
};  

// Load IP list on page load
loadUserIPs();