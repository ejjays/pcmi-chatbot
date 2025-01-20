let conversationFlowRules = ''; 
let aiRules = '';
let churchKnowledge = '';
let conversationHistory = [];
let linkFormatRules = '';
let userIsScrolling = false;
let areFollowUpsHidden = false; 
let userMessage = null;
let isResponseGenerating = false; 

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

// Load Training-base
Promise.all([
  fetch('training-data/church-knowledge.txt').then(response => response.text()),
  fetch('training-data/ai-rules.txt').then(response => response.text()),
  fetch('training-data/link-format-rules.txt').then(response => response.text()),
  fetch('training-data/conversation-flow.txt').then(response => response.text())
])
.then(([knowledge, rules, linkRules, flowRules]) => {
  churchKnowledge = knowledge;
  aiRules = rules;
  linkFormatRules = linkRules;
  conversationFlowRules = flowRules;
})
.catch(error => console.error('Error loading files:', error));

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

  // Load conversation history if exists
  if (savedHistory) {
    conversationHistory = JSON.parse(savedHistory);
  }

  // Restore saved chats or clear the chat container
  chatContainer.innerHTML = savedChats || '';
  document.body.classList.toggle("hide-header", savedChats);

  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
}

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
}

const displaySuggestions = async (messageDiv, aiResponse) => {
    
    if (isResponseGenerating) return;

     const existingSuggestions = messageDiv.querySelector(".suggestions-container");
    if (existingSuggestions) {
        existingSuggestions.remove();
    }

    // Follow-ups Suggestions Rules
    const suggestionsPrompt = `Based on the specific topic and context of your previous response: "${aiResponse}",
        generate exactly 4 natural follow-up questions that:
        1. Directly relate to the main topic just discussed
        2. Follow a logical progression of the conversation
        3. Help users explore different aspects of the same topic
        4. Stay within the context of the current discussion
        5. Just keep it simple and straightforward.
        
    ### IMPORTANT: Always make the suggestions in basic english, simple and consice.

        Additional rules:
        - Questions must be directly related to the previous response
        - Focus on the specific subject matter being discussed
        - Maintain conversation continuity
        - Avoid generic or unrelated topics
        - Use the church knowledge base "${churchKnowledge}" only when contextually relevant, and if the user question is non-church related just focus on it don't force church related suggestions.
        - Don't provide follow up suggestions that not in the scope of our knowledge base.
        - Keep questions conversational and natural
        - Instead of saying saying the full name of our church "Pag-ibig Christian Ministries Infanta", you can use the word "your church" to make it simple and concise.
 
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

        const data = await response.json();
        const suggestions = data.candidates[0].content.parts[0].text.split("|");
        
        // Only create and append suggestions container after response is complete
        const suggestionsContainer = document.createElement("div");
suggestionsContainer.classList.add("suggestions-container");
suggestionsContainer.innerHTML = `
    <div class="suggestions-header">
        <h4 class="suggestions-title">Follow-ups:</h4>
        <div class="suggestions-options">
            <span class="three-dots material-symbols-rounded">more_horiz</span>
            <div class="options-dropdown">
                <div class="option-item">Hide Follow-ups</div>
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
        
// After creating the suggestions container
const threeDots = suggestionsContainer.querySelector('.three-dots');
const optionsDropdown = suggestionsContainer.querySelector('.options-dropdown');
const hideOption = suggestionsContainer.querySelector('.option-item');

threeDots.addEventListener('click', (e) => {
    e.stopPropagation();
    optionsDropdown.classList.toggle('show');
});

hideOption.addEventListener('click', () => {
    const suggestionsContainer = optionsDropdown.closest('.suggestions-container');
    const messageDiv = suggestionsContainer.closest('.message');
    
    // Hiding class for animation
    suggestionsContainer.classList.add('hiding');
    
    // Wait for animation to complete before setting display none
    setTimeout(() => {
        suggestionsContainer.style.display = 'none';
        localStorage.setItem('hideFollowUps', 'true');
        areFollowUpsHidden = true;
        
        // Show menu icon message
        const menuIcon = messageDiv.querySelector('.menu-icon');
        if (menuIcon) {
            menuIcon.style.display = 'inline-flex';
        }
        
        // Show menu icons for all messages
        document.querySelectorAll('.message .menu-icon').forEach(icon => {
            icon.style.display = 'inline-flex';
        });
    }, 400);
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    optionsDropdown.classList.remove('show');
});

        // Click handlers
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
    } catch (error) {
        console.error("Error generating suggestions:", error);
    }
}

// Show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
    const words = text.split(' ');
    let currentWordIndex = 0;

    const existingSuggestions = incomingMessageDiv.querySelector(".suggestions-container");
    if (existingSuggestions) {
        existingSuggestions.remove();
    }

    const typingInterval = setInterval(() => {
        textElement.innerHTML += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
        incomingMessageDiv.querySelector(".icon").classList.add("hide");

        if (currentWordIndex === words.length) {
            clearInterval(typingInterval);
            isResponseGenerating = false;
            incomingMessageDiv.querySelector(".icon").classList.remove("hide");
            localStorage.setItem("saved-chats", chatContainer.innerHTML);
            
            // Only show suggestions if it's NOT the inappropriate response
            if (text.trim() !== "I'm sorry, I can't answer that.") {
                setTimeout(() => {
                    displaySuggestions(incomingMessageDiv, text);
                }, 500);
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
});



const createMessageWithMedia = (text, mediaPath) => {
  const isVideo = mediaPath.endsWith('.mp4');
  const mediaElement = isVideo ? 
    `<video class="response-image" autoplay loop muted playsinline>
       <source src="${mediaPath}" type="video/mp4">
     </video>` : 
    `<img class="response-image" src="${mediaPath}" alt="Church media">`;

  return `<div class="message-content">
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
        <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>
        <span  " class="menu-icon icon material-symbols-rounded" style="display: none;">more_horiz</span>
      </div>
    </div>
  </div>`;
};

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
    
  // Check if message contains location-related keywords or other service keywords
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
  
### **intensional Discipleship Details**: Intentional Discipleship: Intentional Discipleship is a school of leaders that covers deep topics to EQUIP our future leaders. This teaches discipline, deep Bible study, and  step-by-step instruction in personal evangelism. It also guide participants through deep teachings discussions and after they completed the 6 stages class, they are now be prepared for practical applications to WIN SOULS.
It is led by experienced church member (Pastor Edong and his wife Sis. Camil).

### — It's all about Jesus!: When user asked about Intentional Discipleship always mention the word "— It's all about Jesus!" at the end of your response. Make sure to add appropriate emoji like "— It's all about Jesus! [Your emoji]." Take note: (Only include — It's all about Jesus, only in this PERFECTLY EXACT QUESTION: "What is Intensional Discipleship") Use that phrase only if they asked ABOUT intentional Discipleship Related and if not dont use it. (also STRICTLY don't mention that "— It's all about Jesus!" ALWAYS in every FOLLOW UP QUESTIONS!)

### Winning souls: When user asked "What is Intentional Discipleship?" always include the purpose of it "winning souls" or "win souls" "(and other similar)". Include it (without explicitly saying the word "purpose"). and also (Use this exact phrase in your answer "It's a process of mentoring and being mentored." Note: (Only include — It's a process of mentoring and being mentored, only in this PERFECTLY EXACT QUESTION: "What is Intensional Discipleship" (NOTE ONLY THIS SPQCIFIC QUESTION "What is Intensional Discipleship" like its very case sensitive) and do not mention it in the beggining of your answer so its like in the body of ur explanation) and dont se this phrase in other services like cellgroup, kamustahan, sunday service, prayer warrior, and others.

### School of Leaders: When user asked about intensional Discipleship also mention that Intensional Discipleship is the school of leaders.
  
### Guidelines for Capitalizing "Jesus," "God," and "Lord"

1. **Capitalization**: Always capitalize "Jesus," "God," and "Lord" when these names are the subject.
   - **Correct**: "Jesus, God, Lord"
   - **Incorrect**: "jesus, god, lord"
   - **Note**: When referring to other gods or lords, always use lowercase letters.

2. **Correction**: If a user refers to "Jesus," "God," or "Lord" with lowercase letters, correct them respectfully. Explain that these names should start with a capital letter.
   
   - **Example Response**: "Jesus is "The King of kings and the Lord of lords"...(Continue your explanation)... and also I noticed that you referred to 'jesus' with a lowercase 'j'. It would be more respectful to capitalize it as 'Jesus'."

Here's an additional example for variety:

- "Jesus is "The King of kings and the Lord of lords"...(Continue your explanation)... and also just a gentle reminder, 'god' should be written as 'God' when referring to our Lord."

**Instruction for AI**: When providing corrections, vary the wording and style to ensure it doesn't always use the same response. For example:
- "Jesus is "The King of kings and the Lord of lords"...(Continue your explanation) ... and also take note to Remember to capitalize 'Jesus' for proper respect."
- "Jesus is "The King of kings and the Lord of lords"...(Continue your explanation) and also take note: Please use a capital 'G' when writing 'God'."
- "Jesus is "The King of kings and the Lord of lords"...(Continue your explanation) ... and also take note "The word 'Lord' should start with a capital 'L'."
- "And etc etc.
- Just make sure your correction varies dont always exactly copy the provided example response.

### Cellgroup / Kamustahan sched: Sunday, 7 PM - 8 PM

CRITICAL LANGUAGE RULES:
  1. YOU MUST RESPOND IN THE EXACT SAME LANGUAGE AS THE USER'S QUESTION
  2. If user asks in English -> respond in Basic English
  3. If user asks in Tagalog -> respond in Basic Tagalog
  - If a user asks a question using mixed languages -> respond primarily in the language they used more.
  4. NEVER mix languages unless specifically requested
  5. ALWAYS detect input language first before responding
  6. Keep responses in the same language throughout
  7. You should always both on casual and informal tone. (not formal).

  IMPORTANT DATE RULES:
  - Always calculate exact dates from current date: ${getPhilippinesTime()}
  - For Sunday services: Calculate next immediate Sunday
  - Never use placeholder text like [Next Sunday's Date] or [Number]
  - Always include specific dates and days remaining
  - Format all dates as: Day, Month Date, Year
  
  PRIORITY - DATE FORMAT RULES:
  - For current date: Show as "Month Day, Year"
  - For next meeting date: Show only "Month Day" (no year)
  - Always include exact days remaining
  - If incase date is only 1 day away just mention "tomorrow" instead of "day", and if is the case is 1 day past it should be "yesterday" instead of day.
  
### Relating Non-Church Topics to God

**Rule:**
If a user asks about non-church-related topics and it’s relevant to the conversation, relate the answer to God using phrases like "because of God" or similar expressions, depending on the context.

**Example Formats:**

**Do:**
1. **User:** How can I stay motivated at work?
   **AI:** Staying motivated at work can be challenging, but many find strength and inspiration through their faith. Believing that God has a purpose for your work can give you a sense of fulfillment and drive.

2. **User:** What's the best way to deal with stress?
   **AI:** Dealing with stress can be tough, but finding solace in prayer and trusting that God is in control can provide great comfort.

**Don't:**
1. **User:** What's the capital of Japan?
   **AI:** The capital of Japan is Tokyo. (No need to relate to God in this context.)

2. **User:** What are some good recipes for dinner?
   **AI:** There are many delicious recipes you can try for dinner, like spaghetti carbonara or grilled chicken. (No need to relate to God in this context unless there's a specific religious dietary consideration mentioned.)

  
  ### Forbidden words: 1. Dont ever mention the exact word "Community" instead of it just say "Family" or "church". 

  ### Responding to Inappropriate Questions

    **Rule:**
     If a user asks an inappropriate or filthy question, respond with "I'm sorry, I can't answer that."

  PRIORITY - CONVERSATION FLOW RULES:
  ${conversationFlowRules}
  
  SECONDARY RULES:
  ${aiRules}
  
  LINK FORMATTING RULES:
  ${linkFormatRules}
  
  CHURCH KNOWLEDGE BASE:
  ${churchKnowledge}
  
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

    const apiResponse = data.candidates[0].content.parts[0].text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    conversationHistory.push({
      role: "assistant",
      content: apiResponse
    });
    
    localStorage.setItem("conversation-history", JSON.stringify(conversationHistory));

    if (isLocationQuery) {
      incomingMessageDiv.innerHTML = createMessageWithMedia(apiResponse, '/images/services/church-location.png');
      const newTextElement = incomingMessageDiv.querySelector(".text");
      newTextElement.textContent = ''; 
      showTypingEffect(apiResponse, newTextElement, incomingMessageDiv);
    } 
    else if (isYouthQuery) {
      incomingMessageDiv.innerHTML = createMessageWithMedia(apiResponse, '/images/services/youth-fellowship.jpg');
      const newTextElement = incomingMessageDiv.querySelector(".text");
      newTextElement.textContent = ''; 
      showTypingEffect(apiResponse, newTextElement, incomingMessageDiv);
    }
    else if (isCellGroupQuery) {
      incomingMessageDiv.innerHTML = createMessageWithMedia(apiResponse, '/images/services/cellgroup.jpg');
      const newTextElement = incomingMessageDiv.querySelector(".text");
      newTextElement.textContent = ''; 
      showTypingEffect(apiResponse, newTextElement, incomingMessageDiv);
    }
    else if (isSundayServiceQuery) {
  incomingMessageDiv.innerHTML = createMessageWithMedia(apiResponse, '/images/services/sunday-service.gif');
  const newTextElement = incomingMessageDiv.querySelector(".text");
  newTextElement.textContent = ''; 
  showTypingEffect(apiResponse, newTextElement, incomingMessageDiv);
}
    else if (isDiscipleshipQuery) {
      incomingMessageDiv.innerHTML = createMessageWithMedia(apiResponse, '/images/services/discipleship.jpg');
      const newTextElement = incomingMessageDiv.querySelector(".text");
      newTextElement.textContent = ''; 
      showTypingEffect(apiResponse, newTextElement, incomingMessageDiv);
    }
    else if (isPrayerWarriorQuery) {
  incomingMessageDiv.innerHTML = createMessageWithMedia(apiResponse, '/images/services/prayer-warrior.jpg');
  const newTextElement = incomingMessageDiv.querySelector(".text");
  newTextElement.textContent = ''; 
  showTypingEffect(apiResponse, newTextElement, incomingMessageDiv);
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
                      <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>
                      <span onClick="toggleFollowUps(this)" class="menu-icon icon material-symbols-rounded" style="display: none;">more_horiz</span>
                    </div>
                  </div>
                </div>`;
  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
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

const toggleFollowUps = (menuButton) => {
    const messageDiv = menuButton.closest('.message');
    
    if (areFollowUpsHidden) {
        // If suggestions are hidden, show them
        areFollowUpsHidden = false;
        localStorage.setItem('hideFollowUps', 'false');
        displaySuggestions(messageDiv, messageDiv.querySelector('.text').textContent);
        menuButton.style.display = 'none'; 
    }
};

const hideFollowUps = (suggestionsContainer) => {
    const messageDiv = suggestionsContainer.closest('.message');
    const menuButton = messageDiv.querySelector('.menu-icon');
    
    suggestionsContainer.classList.add('hiding');
    
    // Wait for animation to complete before setting display none
    setTimeout(() => {
        suggestionsContainer.style.display = 'none';
        localStorage.setItem('hideFollowUps', 'true');
        areFollowUpsHidden = true;
        
        // Show the menu icon ONLY after hiding follow-ups
        if (menuButton) {
            menuButton.style.display = 'inline-flex';
        }
    }, 400);
};

// Handle sending outgoing chat messages
const handleOutgoingChat = () => {
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
    localStorage.removeItem("hideFollowUps"); // Reset the hidden state
    conversationHistory = [];
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
  // Only collapse if the keyboard is actually hiding (height increasing)
  if (window.innerHeight > windowHeight) {
    if (typingInput.value.length === 0) {
      inputWrapper.classList.remove("expanded");
      actionButtons.classList.remove("hide");
    }
  }
  windowHeight = window.innerHeight;
});

// Only handle back button
window.addEventListener('popstate', (e) => {
  e.preventDefault();
  history.pushState(null, null, window.location.href);
});

// For Android back button
if (window.navigator.userAgent.match(/Android/i)) {
  document.addEventListener('backbutton', (e) => {
    e.preventDefault();
  }, false);
}

