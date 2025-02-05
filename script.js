let conversationFlowRules = ''; 
let aiRules = '';
let churchKnowledge = '';
let conversationHistory = [];
let linkFormatRules = '';
let taglishRules = '';
let userIsScrolling = false;
let areFollowUpsHidden = false; 
let userMessage = null;
let isResponseGenerating = false; 
let isDataLoaded = false;

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  addDoc 
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Firebase configuration
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
const chatHistoryCollection = collection(db, "chat-history");

const loadInitialState = () => {
    areFollowUpsHidden = localStorage.getItem('hideFollowUps') === 'true';
};
loadInitialState();

const getUserIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP:', error);
    return 'unknown';
  }
};


// Real-time Date & Time
function getPhilippinesTime() {
    return new Date().toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        hour12: true,
        hour: "numeric",
        minute: "numeric",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

const formatFacebookLinks = (response) => {
  return response;
};

// Load Training-base
const loadTrainingData = async () => {
    try {
        const [
            churchKnowledgeDoc,
            aiRulesDoc,
            linkFormatRulesDoc,
            conversationFlowDoc,
            taglishVocabularyDoc
        ] = await Promise.all([
            getDoc(doc(db, 'training-data', 'church-knowledge')),
            getDoc(doc(db, 'training-data', 'ai-rules')),
            getDoc(doc(db, 'training-data', 'link-format-rules')),
            getDoc(doc(db, 'training-data', 'conversation-flow')),
            getDoc(doc(db, 'training-data', 'taglish-vocabulary'))
        ]);
        
        // Check if documents exist
        if (!churchKnowledgeDoc.exists() || 
            !aiRulesDoc.exists() || 
            !linkFormatRulesDoc.exists() || 
            !conversationFlowDoc.exists() ||
            !taglishVocabularyDoc.exists()) {  
            throw new Error("Some training data documents are missing");
        }

        // Assign data
        churchKnowledge = churchKnowledgeDoc.data().content;
        aiRules = aiRulesDoc.data().content;
        linkFormatRules = linkFormatRulesDoc.data().content;
        conversationFlowRules = conversationFlowDoc.data().content;
        taglishRules = taglishVocabularyDoc.data().content;  

        isDataLoaded = true;
        console.log('Training data loaded successfully');
    } catch (error) {
        console.error('Error loading training data:', error);
    }
};

// Call it immediately
loadTrainingData();

const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");

// API configuration
const API_KEY = "AIzaSyC0N559LhkMH1GqrvF1Pg7cpkMmaHMZgZg"; // API key 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

// Load theme and chat data from local storage on page load
const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  const savedHistory = localStorage.getItem("conversation-history");
  const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

  // Reset the follow-ups hidden state when loading
  areFollowUpsHidden = false;
  localStorage.removeItem('hideFollowUps');

  // Load conversation history if exists
  if (savedHistory) {
    conversationHistory = JSON.parse(savedHistory);
  }

  // Restore saved chats or clear the chat container
  chatContainer.innerHTML = savedChats || '';
  document.body.classList.toggle("hide-header", savedChats);

  chatContainer.scrollTo(0, chatContainer.scrollHeight);
}
// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
}

const customInitialFollowUps = {
    "What time does Sunday service starts?": [
        "What should I wear?",
        "What do I need to bring?",
        "Do you have parking space?",
        "Is there service pick-up every Sunday?"
    ],
    "Where is your church located?": [
        "What are your church's core beliefs?",
        "Tell me about your services",
        "Do you have online services or resources?",
        "Do you have any contact details?"
    ],
    "What is Intentional Discipleship?": [
        "Do I need to sign up to join?",
        "Is there any requirements?",
        "What time id usually ends?",
        "Are there any fees or cost involved?"
    ],
    "When is the next Youth Fellowship?": [
        "What activities do you have in Youth Fellowship?",
        "What age group can join?",
        "How long does it usually last?",
        "Do I need to bring anything?"
    ]
};

const displaySuggestions = async (messageDiv, aiResponse) => {
    if (isResponseGenerating) return;

    const existingSuggestions = messageDiv.querySelector(".suggestions-container");
    if (existingSuggestions) {
        existingSuggestions.remove();
    }

    let suggestions = [];
    if (customInitialFollowUps.hasOwnProperty(userMessage)) {
        // Use custom follow-ups for initial suggestions
        suggestions = customInitialFollowUps[userMessage];
    } else {
        // Follow-ups Suggestions Rules
        const suggestionsPrompt = `Based on the specific topic and context of your previous response: "${aiResponse}",
            generate exactly 4 natural follow-up questions that:
            1. Directly relate to the main topic just discussed
            2. Follow a logical progression of the conversation
            3. Help users explore different aspects of the same topic
            4. Stay within the context of the current discussion
            5. Just keep it very short, simple and straightforward as POSSIBLE.
            6. Always provide suggestions based on the user's language input. 
            7. When providing suggestions imagine you are the actual user that will ask questions.
            
        ### IMPORTANT: Always make the suggestions in lowest basic language version, straightforward, VERY SHORT SIMPLE.

            Additional rules:
            - Questions must be directly related to the previous response
            - Focus on the specific subject matter being discussed
            - Maintain conversation continuity
            - Avoid generic or unrelated topics
            - Use the church knowledge base "${churchKnowledge}" only when contextually relevant
            - Keep questions conversational and natural
 
            Return only the questions, separated by |`;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: suggestionsPrompt }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            suggestions = data.candidates[0].content.parts[0].text.split("|");
        } catch (error) {
            console.error("Error generating suggestions:", error);
            return; 
        }
    }

    const suggestionsContainer = document.createElement("div");
    suggestionsContainer.classList.add("suggestions-container");
    suggestionsContainer.innerHTML = `
        <div class="suggestions-header">
            <h4 class="suggestions-title">Follow-ups:</h4>
            <div class="suggestions-options">
                <span class="three-dots material-symbols-rounded">cancel</span>
                <div class="options-dropdown">
                    <div class="option-item">Hide</div>
                </div>
            </div>
        </div>
        <div class="suggestions-list">
            ${suggestions.map(suggestion => `
                <div class="suggestion-item">
                    <p class="suggestion-text">${suggestion.trim()}</p>
                </div>
            `).join('<div class="suggestion-separator"></div>')}
        </div>
    `;

    messageDiv.appendChild(suggestionsContainer);

    // Add event listeners
    const threeDots = suggestionsContainer.querySelector('.three-dots');
    threeDots.addEventListener('click', (e) => {
        e.stopPropagation();
        const suggestionsContainer = e.target.closest('.suggestions-container');
        const messageDiv = suggestionsContainer.closest('.message');
        
        suggestionsContainer.classList.add('hiding');
        
        setTimeout(() => {
            suggestionsContainer.style.display = 'none';
            localStorage.setItem('hideFollowUps', 'true');
            areFollowUpsHidden = true;
            
            const menuIcon = messageDiv.querySelector('.menu-icon');
            if (menuIcon) {
                menuIcon.style.display = 'inline-flex';
            }
            
            document.querySelectorAll('.message .menu-icon').forEach(icon => {
                icon.style.display = 'inline-flex';
            });
        }, 400);
    });

    // Click handlers for suggestions
    messageDiv.querySelectorAll(".suggestion-item").forEach(item => {
        item.addEventListener("click", () => {
            const text = item.querySelector(".suggestion-text").textContent;
            document.querySelector(".typing-input").value = text;
            
            document.querySelectorAll(".suggestions-container").forEach(container => {
                container.remove();
            });
            
            document.querySelector("#send-message-button").click();
        });
    });
};


// Show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
    const words = text.split(' ');
    let currentWordIndex = 0;
    let displayedText = '';

    const existingSuggestions = incomingMessageDiv.querySelector(".suggestions-container");
    if (existingSuggestions) {
        existingSuggestions.remove();
    }

    const typingInterval = setInterval(() => {
        displayedText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
        // Process the entire accumulated text for bold formatting
        let formattedText = formatFacebookLinks(displayedText)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\*(.*)/gm, '<strong>■ </strong>⁠$1')
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>');
            
        // Use innerHTML instead of textContent to preserve HTML formatting
        textElement.innerHTML = formattedText;
        incomingMessageDiv.querySelector(".icon").classList.add("hide");

        if (currentWordIndex === words.length) {
            clearInterval(typingInterval);
            isResponseGenerating = false;
            incomingMessageDiv.querySelector(".icon").classList.remove("hide");
            localStorage.setItem("saved-chats", chatContainer.innerHTML);
            
            if (!areFollowUpsHidden && text.trim() !== "I'm sorry, I can't answer that.") {
                setTimeout(() => {
                    displaySuggestions(incomingMessageDiv, text);
                }, 500);
            } else {
                const menuButton = incomingMessageDiv.querySelector('.menu-icon');
                if (menuButton) {
                    menuButton.style.display = 'inline-flex';
                }
            }
        }
        
        if (!userIsScrolling) {
            chatContainer.scrollTo(0, chatContainer.scrollHeight);
        }
    }, 75);
}

// Event listener detect manual scrolling
chatContainer.addEventListener('scroll', () => {
    userIsScrolling = true;
    // Reset the flag after a short delay
    clearTimeout(chatContainer.scrollTimeout);
    chatContainer.scrollTimeout = setTimeout(() => {
        userIsScrolling = false;
    }, 1000);
}, { passive: true });



const createMessageWithMedia = (text, mediaPath) => {
  const isVideo = mediaPath.endsWith('.mp4');
  const mediaElement = isVideo ? 
    `<video class="response-image" autoplay loop muted playsinline>
       <source src="${mediaPath}" type="video/mp4">
     </video>` : 
    `<img class="response-image" src="${mediaPath}" alt="Church media">`;

  const messageContent = `<div class="message-content">
    <div class="header-row">
      <div class="avatar-container">
        <img class="avatar default-avatar" src="images/avatars/pcmi-bot.png" alt="Bot avatar">
        <img class="avatar thinking-avatar" src="images/avatars/thinking.gif" alt="Thinking avatar">
      </div>
      <div class="answer-indicator">Answer</div>
    </div>
    <div class="message-container">
      ${mediaElement}
      <p class="text">${text}</p>
      <div class="message-actions">
        <span class="icon material-symbols-rounded">content_copy</span>
        <span class="menu-icon icon material-symbols-rounded" style="display: none;">prompt_suggestion</span>
      </div>
    </div>
  </div>`;

  const messageElement = createMessageElement(messageContent, "incoming");
  
  const messageActions = messageElement.querySelector('.message-actions');
  if (messageActions) {
    const copyButton = messageActions.querySelector('.icon');
    const menuButton = messageActions.querySelector('.menu-icon');
    
    copyButton.addEventListener('click', () => copyMessage(copyButton));
    menuButton.addEventListener('click', () => toggleFollowUps(menuButton));
  }

  return messageElement;
}

const getCustomErrorMessage = (error) => {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        const offlineMessages = [
            "Hmm... looks like we lost connection. Please check your internet and try again! 🌐",
            "Oops! We can't seem to connect right now. Mind checking your internet connection? 📶",
            "Connection hiccup! Please make sure you're connected to the internet and try again. ⚡",
            "We're having trouble connecting to our servers. Could you check your internet connection? 🔄",
            "It seems the internet connection is taking a break. Please check your connection and try again! 🔌",
            "Unable to connect right now. Please check if you're online and try once more. 🌍",
            "Connection lost! A quick internet check might help us get back on track. 🔎",
            "We hit a small bump - please check your internet connection and give it another try! 🚀"
        ];
        return offlineMessages[Math.floor(Math.random() * offlineMessages.length)];
    }
    return error.message;
};

const isInappropriateContent = (message) => {
    const inappropriateKeywords = ["badword1", "badword2", "offensive phrase"]; 
    return inappropriateKeywords.some(keyword => message.toLowerCase().includes(keyword));
};

// Fetch response from the API based on user message
const generateAPIResponse = async (incomingMessageDiv) => {
    const textElement = incomingMessageDiv.querySelector(".text");
    
    if (!isDataLoaded) {
        textElement.textContent = "Still loading training data, please wait...";
        return;
    }
    
    // Check inappropriate content
    if (isInappropriateContent(userMessage)) {
        textElement.textContent = "I'm sorry, I can't answer that.";
        isResponseGenerating = false;
        incomingMessageDiv.classList.remove("loading");
        
        // Save to conversation history
        conversationHistory.push({
            role: "assistant",
            content: "I'm sorry, I can't answer that."
        });
        localStorage.setItem("conversation-history", JSON.stringify(conversationHistory));
        
        return;
    }
    
  // Location/service related keywords 
  const isLocationQuery = userMessage.toLowerCase().includes('location') || 
                         userMessage.toLowerCase().includes('locate') ||
                         userMessage.toLowerCase().includes('located');

  const isYouthQuery = userMessage.toLowerCase().includes('youth') || 
                      userMessage.toLowerCase().includes('fellowship') ||
                      userMessage.toLowerCase().includes('young people');

  const isCellGroupQuery = userMessage.toLowerCase().includes('cell') || 
                          userMessage.toLowerCase().includes('kamustahan') ||
                          userMessage.toLowerCase().includes('online cellgroup');

  const isSundayServiceQuery = userMessage.toLowerCase().includes('sunday') || 
                              userMessage.toLowerCase().includes('worship') ||
                              userMessage.toLowerCase().includes('service time');
                              
  const isDiscipleshipQuery = userMessage.toLowerCase().includes('discipleship') || 
                             userMessage.toLowerCase().includes('disciple') ||
                             userMessage.toLowerCase().includes('life class');    
    const isPrayerWarriorQuery = userMessage.toLowerCase().includes('prayer warrior') || 
                            userMessage.toLowerCase().includes('prayer warrior') ||
                            userMessage.toLowerCase().includes('friday');                         
  // Create the conversation payload
  const messages = conversationHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  // Add current context and rules
  const contextPrefix = `
  Current Date and Time in Philippines: ${getPhilippinesTime()}
  
### ALWAYS VERY SIMPLE LANGUAGE:
1. **English Responses:**
   - You must always respond using the lowest most basic language (But detailed enough).
   - Avoid complex vocabulary and sentence structures to ensure users can easily understand your responses.
2. **Non-English Responses:**
   - If responding in a language other than English, YOU MUST ALWAYS use a CASUAL and INFORMAL approach.
   - **Tagalog/Taglish Responses:**
     - If the user's query is in TAGALOG or TAGLISH (a mix of Filipino and English), you must use the most modern casual informal language in Filipino, which is often referred to as "Taglish."
     - Taglish is a hybrid language that incorporates slang, abbreviations, and influences from popular culture. It should be very clearly detailed yet concise. ; Use this vocabulary list for your exact word term for your taglish vocabulary response "${taglishRules}".
     - **Prohibited Greetings:** Avoid using "Uy" or "Uy, pare!" or any repetitive greetings in your responses.
     TAKE NOTE: ENGLISH AND TAGLISH IS BOTH DIFFERENT LANGUAGE SO MAKE SURE DO NOT MIX TAGALOG AND ENGLISH IF THE USER QUERY IS IN PURE ENGLISH.

3. **Language Consistency:**
   - Your response language must always match the language used by the user even IN ALL ANY LANGUAGES. Like If the user's query is in English, respond in basic English. If the user's query is in Tagalog or Taglish, respond in a clearly detailed modern casual Taglish as mentioned earlier, (ONCE AGAIN MAKE SURE TO APPLY IN ALL ANY LANGUAGES BASED ON THE USER QUERY) (AND ALSO APPLY THAT ON NON-CHURCH RELATED QUESTIONS)

4. **General Note:**
   - Always ensure clarity in your responses to facilitate user understanding.
  
### 1. **GREETING RESPONSE:**

**STRICT NOTE:** IN YOUR GREETING RESPONSE ALWAYS DOUBLE CHECK YOUR RESPONSE HISTORY AND FIRSTLY CHECK IF AN GREETING RESPONSE IS ALREADY SAID DONT USE IT TO AVAOID REPETITIVE GREETING RESPONSE. AND DO NOT EVER use the EXACT WORD "Hey there!" or "Aloha! or "stoked/Stoked" as your greeting response. INSTEAD OF THAT YOU SHOULD DO THIS:

- Always include a cheerful and friendly greeting in your responses.
- Make sure your greeting is positively exaggerated and ALWAYS ENSURING ITS DIRECTLY RELEVANT/CONNECTED to the user's question or message.
- Let the conversation flow naturally from the user's input.
- You may use emojis when appropriate, depending on the user's message.
- Show empathy when necessary.

#### **What NOT to do:**

- **Avoid formulaic greetings:** Do not use standard phrases like "Hey there!", "Hi friend!", etc.
- **Ensure relevance:** Do not add greetings that are unrelated to the user's message.:  Just take note: Do not copy this exact example for your greeting response, Always create a unique positively exaggerated and directly relevant depending on the user's question or message.

### VERY IMPORTANT NOTE AGAIN: ALWAYS TRACK / CHECK YOUR CONVERSATION HISTORY AND DO NOT REPEAT THE GREETING RESPONSE THAT ALREADY SAID IN YOUR CONVERSATION HISYORY like "Wow" or "Super" etc.


### **intensional Discipleship Details**: Intentional Discipleship: Intentional Discipleship is a school of leaders that covers deep topics to EQUIP our leaders and future leaders. This teaches discipline, deep Bible study, and  step-by-step instruction in personal evangelism. It also guide participants through deep teachings discussions and after they completed the 6 stages class, they are now be prepared for practical applications to WIN SOULS.
It is led by experienced church member (Pastor Edong and his wife Sis. Camil).

### — It's all about Jesus!: When user asked about Intentional Discipleship always mention the word "— It's all about Jesus!" at the end of your response. Make sure to add appropriate emoji like "— It's all about Jesus! [Your emoji]." Take note: (Only include — It's all about Jesus, only in this PERFECTLY EXACT QUESTION: "What is Intensional Discipleship") Use that phrase only if they asked ABOUT intentional Discipleship Related and if not dont use it. (also STRICTLY don't mention that "— It's all about Jesus!" ALWAYS in every FOLLOW UP QUESTIONS!)

### Winning Souls Rule

**When the user asks:** "What is Intentional Discipleship?"

1. **Always include the concept:** "winning souls" or "win souls" (or similar phrases) in the answer.
   - **Do not explicitly use the word "purpose."** and always make that word "win souls" / "winning souls" in ENGLISH even on all languages used.

### School of Leaders: When user asked about intensional Discipleship also mention that Intensional Discipleship is the school of leaders and future leaders.

### Cellgroup / Kamustahan sched: Sunday, 7 PM - 8 PM

CRITICAL LANGUAGE RULES:
  1. YOU MUST RESPOND IN THE EXACT SAME LANGUAGE AS THE USER'S QUESTION
  5. ALWAYS detect input language first before responding

  IMPORTANT DATE RULES:
  - Always calculate exact dates from current date: ${getPhilippinesTime()}
  - For Sunday services: Calculate next immediate Sunday
  - Never use placeholder text like [Next Sunday's Date] or [Number]
  - Always include specific dates and days remaining
  - Format all dates as: Day, Month Date, Year
  
  PRIORITY - DATE RULES:
- ALWAYS calculate the NEXT IMMEDIATE service from current date.
- like for example, If today is Sunday, mention TODAY, if its for tommorow mention tommorow and make sure apply that all in any other services.
 DATE VALIDATION:
- Before mentioning any future date, confirm it's the closest possible date
- For exeample for any of our services, always reference the very next service date unless explicitly asked about a specific date
- Never skip to a further dates of any services unless specifically asked.
  - For current date: Show as "Month Day, Year"
  - For next meeting date: Show only "Month Day" (no year)
  - Always include exact days remaining
  - If incase date is only 1 day away just mention "tomorrow" instead of "day", and if is the case is 1 day past it should be "yesterday" instead of day.
  
### Relating Non-Church Topics to God

**Rule:**
- If a user asks about non-church-related topics and it’s relevant to the conversation, relate the answer to God using phrases like "because of God" or similar expressions, depending on the context. 
- If the user asked about about non-church-related topics also follow the taglish rules earlier of incase user query is in tagalog / taglish language but also take note the **Language Consistency Rules mentioned earlier.

**Example Formats:**

**Do:**
1. **User:** How can I stay motivated at work?
   **AI:** Staying motivated at work can be challenging, but many find strength and inspiration through their faith. Believing that God has a purpose for your work can give you a sense of fulfillment and drive.

2. **User:** What's the best way to deal with stress?
   **AI:** Dealing with stress can be tough, but finding solace in prayer and trusting that God is in control can provide great comfort.
 
### Incase user askedbabout our difference between other church: Emphasize more on music and worship being at the heart of everything we do.. etc...

**Don't:**
1. **User:** What's the capital of Japan?
   **AI:** The capital of Japan is Tokyo. (No need to relate to God in this context.)

2. **User:** What are some good recipes for dinner?
   **AI:** There are many delicious recipes you can try for dinner, like spaghetti carbonara or grilled chicken. (No need to relate to God in this context unless there's a specific religious dietary consideration mentioned.)

  
  ### Forbidden words: 1. Dont ever mention the exact word "Community" instead of it just say "Family" or "church". 2. Dont say this exact word "wraps up" when referring to an end of any of our church services just say "ends" or "end" for simplicity.

  ### Responding to Inappropriate Questions

    **Rule:**
     If a user asks an inappropriate or filthy question, respond with "I'm sorry, I can't answer that."
     
### **Conversation Flow Update**

1. Direct Response Priority:
- If the user's intent is clear, provide complete information immediately
- Don't ask clarifying questions when context is already established
- Only ask follow-up questions when truly needed for clarification

2. Context Awareness:
- ALWAYS Remember previous messages in the conversation for reference.
- Don't repeat questions that were already answered in the previos conversation.
- ALWAYS Use conversation history to provide more relevant responses to the current user question.

### Peoples Links: When mentioning our peoples always include at the end their facebook link if its ONLY included in your database. USE THIS FORMAT : "You can find [him/her] on Facebook: <a href="[facebook-url]" target="_blank" rel="noopener noreferrer">[Person's Name]</a>". NOTE: If the Facebook link of the people that is not listed on Facebook links in your database Do not use this format: "You can find [him/her] on Facebook: <a href="[facebook-url]" target="_blank" rel="noopener noreferrer">[Person's Name]</a>. Only use that format if that specific people's Facbook link is listed on your database. If the user asked about a facebook link of an specific people that, that people facebook link is not listed in your database include to say you dont have an information of that facebook link in your database... something like that.

### What to wear during sunday service?: [Your Greeting response [emoji]] ... We No dress code, ... anything comftable, ... just try to avoid too revealing. (Make this friendly detailed).

  PRIORITY - CONVERSATION FLOW RULES:
  ${conversationFlowRules}
  
  SECONDARY RULES:
  ${aiRules}
  
  LINK FORMATTING RULES:
  ${linkFormatRules}
  
  CHURCH KNOWLEDGE BASE:
  ${churchKnowledge}
  
  TAGLISH LANGUAGE RULES:
  ${taglishRules}
  
  Previous conversation context and current query: `;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: [
          ...messages,
          { 
            role: "user", 
            parts: [{ text: contextPrefix + userMessage }] 
          }
        ]
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

  const apiResponse = data.candidates[0].content.parts[0].text;
  
  try {
  const userIP = await getUserIP();
  const timestamp = new Date().toISOString();
    
  await addDoc(chatHistoryCollection, {
    userIP,
    timestamp,
    message: userMessage,
    response: apiResponse,
    philippinesTime: getPhilippinesTime()
  });
} catch (error) {
  console.error('Error storing chat history:', error);
}
    
// Format Facebook links first
const formattedResponse = formatFacebookLinks(apiResponse)
  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .replace(/^\*(.*)/gm, '<strong>■  </strong>⁠$1') 
  .replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  
    conversationHistory.push({
      role: "assistant",
      content: apiResponse
    });
    
    localStorage.setItem("conversation-history", JSON.stringify(conversationHistory));

    if (isLocationQuery) {
  const messageElement = createMessageWithMedia(apiResponse, 'images/services/church-location.png');
  incomingMessageDiv.replaceWith(messageElement);
  const newTextElement = messageElement.querySelector(".text");
  newTextElement.textContent = ''; 
  showTypingEffect(apiResponse, newTextElement, messageElement);
} 
else if (isYouthQuery) {
  const messageElement = createMessageWithMedia(apiResponse, 'images/services/youth-fellowship.jpg');
  incomingMessageDiv.replaceWith(messageElement);
  const newTextElement = messageElement.querySelector(".text");
  newTextElement.textContent = ''; 
  showTypingEffect(apiResponse, newTextElement, messageElement);
}
else if (isCellGroupQuery) {
  const messageElement = createMessageWithMedia(apiResponse, 'images/services/cellgroup.jpg');
  incomingMessageDiv.replaceWith(messageElement);
  const newTextElement = messageElement.querySelector(".text");
  newTextElement.textContent = ''; 
  showTypingEffect(apiResponse, newTextElement, messageElement);
}
else if (isSundayServiceQuery) {
  const messageElement = createMessageWithMedia(apiResponse, 'images/services/sunday-service.gif');
  incomingMessageDiv.replaceWith(messageElement);
  const newTextElement = messageElement.querySelector(".text");
  newTextElement.textContent = ''; 
  showTypingEffect(apiResponse, newTextElement, messageElement);
}
else if (isDiscipleshipQuery) {
  const messageElement = createMessageWithMedia(apiResponse, 'images/services/discipleship.jpg');
  incomingMessageDiv.replaceWith(messageElement);
  const newTextElement = messageElement.querySelector(".text");
  newTextElement.textContent = ''; 
  showTypingEffect(apiResponse, newTextElement, messageElement);
}
else if (isPrayerWarriorQuery) {
  const messageElement = createMessageWithMedia(apiResponse, 'images/services/prayer-warrior.jpg');
  incomingMessageDiv.replaceWith(messageElement);
  const newTextElement = messageElement.querySelector(".text");
  newTextElement.textContent = ''; 
  showTypingEffect(apiResponse, newTextElement, messageElement);
}
else {
  textElement.textContent = '';
  showTypingEffect(apiResponse, textElement, incomingMessageDiv);
}
            

  } catch (error) {
    isResponseGenerating = false;
    const customErrorMessage = getCustomErrorMessage(error);
    textElement.innerText = customErrorMessage;
    textElement.parentElement.closest(".message").classList.add("error");
}
   finally {
    incomingMessageDiv.classList.remove("loading");
    
    const answerIndicator = incomingMessageDiv.querySelector('.answer-indicator');
    if (answerIndicator) {
      answerIndicator.textContent = "Answer";
    }
  }
}

// Show loading animation while waiting for API response
const showLoadingAnimation = () => {
  const html = `<div class="message-content">
                  <div class="header-row">
                    <div class="avatar-container">
                      <img class="avatar default-avatar" src="images/avatars/pcmi-bot.png" alt="Bot avatar">
                      <img class="avatar thinking-avatar" src="images/avatars/thinking.gif" alt="Thinking avatar">
                    </div>
                    <div class="answer-indicator">Thinking</div>
                  </div>
                  <div class="message-container">
                    <p class="text"></p>
                    <div class="loading-indicator">
                      <div class="loading-bar"></div>
                      <div class="loading-bar"></div>
                      <div class="loading-bar"></div>
                    </div>
                    <div class="message-actions">
    <span class="icon material-symbols-rounded">content_copy</span>
    <span class="menu-icon icon material-symbols-rounded" style="display: none;">prompt_suggestion</span>
  </div>
                  </div>
                </div>`;
const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  
  const messageActions = incomingMessageDiv.querySelector('.message-actions');
  if (messageActions) {
    const copyButton = messageActions.querySelector('.icon');
    const menuButton = messageActions.querySelector('.menu-icon');
    
    copyButton.addEventListener('click', () => copyMessage(copyButton));
    menuButton.addEventListener('click', () => toggleFollowUps(menuButton));
  }

  chatContainer.appendChild(incomingMessageDiv);
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  generateAPIResponse(incomingMessageDiv);
}

// Copy message text to clipboard
const copyMessage = (copyButton) => {
  const messageContainer = copyButton.closest('.message-container');
  const messageText = messageContainer.querySelector(".text").innerText;

  navigator.clipboard.writeText(messageText).then(() => {
    copyButton.innerText = "done"; 
    setTimeout(() => copyButton.innerText = "content_copy", 1000); // Revert icon after 1 second
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

const toggleFollowUps = async (menuButton) => {
    const messageDiv = menuButton.closest('.message');
    const textElement = messageDiv.querySelector('.text');
    
    if (isResponseGenerating) return;

    try {
        
        const existingSuggestions = messageDiv.querySelector('.suggestions-container');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }

        // Reset the hidden state when showing suggestions
        areFollowUpsHidden = false;
        localStorage.removeItem('hideFollowUps');
        
        menuButton.style.display = 'none';
        
        if (textElement && textElement.textContent) {
            await displaySuggestions(messageDiv, textElement.textContent);
        }

    } catch (error) {
        console.error('Error showing suggestions:', error);
        menuButton.style.display = 'inline-flex';
    }
};

window.copyMessage = copyMessage;
   window.toggleFollowUps = toggleFollowUps;

const hideFollowUps = (suggestionsContainer) => {
    const messageDiv = suggestionsContainer.closest('.message');
    const menuButton = messageDiv.querySelector('.menu-icon');
    
    suggestionsContainer.classList.add('hiding');
    
    // Set global state to hide suggestions
    areFollowUpsHidden = true;
    localStorage.setItem('hideFollowUps', 'true');
    
    setTimeout(() => {
        suggestionsContainer.remove();
        if (menuButton) {
            menuButton.style.display = 'inline-flex';
        }
        
        // Show menu icons for all messages
        document.querySelectorAll('.message .menu-icon').forEach(icon => {
            icon.style.display = 'inline-flex';
        });
    }, 400);
};

// Handle sending outgoing chat messages
const handleOutgoingChat = () => {
  document.querySelectorAll(".suggestions-container").forEach(container => {
    container.remove();
  });

  userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
  if(!userMessage || isResponseGenerating) return;

  isResponseGenerating = true;

  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userMessage
  });

  // Keep the user message structure simple and inline
  const html = `<div class="message-content">
                <img class="avatar" src="images/avatars/user.gif" alt="User avatar">
                <div class="message-container">
                  <p class="text"></p>
                </div>
              </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  outgoingMessageDiv.querySelector(".text").innerText = userMessage;
  chatContainer.appendChild(outgoingMessageDiv);
  
  typingForm.reset(); // Clear input field
  
  inputWrapper.classList.remove("expanded");
  actionButtons.classList.remove("hide");
  
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
  setTimeout(showLoadingAnimation, 500); // Show loading animation after a delay
}
const waveContainer = document.querySelector(".theme-wave-container");
const waveElement = document.querySelector(".theme-wave");

toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.contains("light_mode");
  document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "dark_mode" : "light_mode");
  toggleThemeButton.innerText = isLightMode ? "light_mode" : "dark_mode";
});

// Delete all chats from local storage when button is clicked
deleteChatButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all the chats?")) {
    localStorage.removeItem("saved-chats");
    localStorage.removeItem("conversation-history");
    localStorage.removeItem("hideFollowUps");
    conversationHistory = [];
    areFollowUpsHidden = false; 
    loadDataFromLocalstorage();
  }
});

// Set userMessage and handle outgoing chat when a suggestion is clicked
suggestions.forEach(suggestion => {
  suggestion.addEventListener("click", () => {
    userMessage = suggestion.querySelector(".text").innerText;
    handleOutgoingChat();
  });
});

// Prevent default form submission and handle outgoing chat
typingForm.addEventListener("submit", (e) => {
  e.preventDefault(); 
  handleOutgoingChat();
});

loadDataFromLocalstorage();

const inputWrapper = document.querySelector(".typing-form .input-wrapper");
const actionButtons = document.querySelector(".action-buttons");
const typingInput = document.querySelector(".typing-input");

typingInput.addEventListener("focus", () => {
  inputWrapper.classList.add("expanded");
  actionButtons.classList.add("hide");
});

typingInput.addEventListener("blur", () => {
  // Only collapse if there's no text
  if (typingInput.value.length === 0 && !isResponseGenerating) {
    inputWrapper.classList.remove("expanded");
    actionButtons.classList.remove("hide");
  }
});

typingInput.addEventListener("input", () => {
  // Keep expanded while typing
  if (typingInput.value.length > 0) {
    inputWrapper.classList.add("expanded");
    actionButtons.classList.add("hide");
  }
});

// Simplified event listeners
let windowHeight = window.innerHeight;
window.addEventListener('resize', () => {
  if (window.innerHeight > windowHeight) {
    if (typingInput.value.length === 0) {
      inputWrapper.classList.remove("expanded");
      actionButtons.classList.remove("hide");
    }
  }
  windowHeight = window.innerHeight;
}, { passive: true });

// Only handle back button
window.addEventListener('popstate', (e) => {
  e.preventDefault();
  history.pushState(null, null, window.location.href);
});

// For Android back button
if (window.navigator.userAgent.match(/Android/i)) {
  document.addEventListener('backbutton', (e) => {
    e.preventDefault();
  }, { passive: true });
}