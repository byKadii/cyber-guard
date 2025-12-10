/**
 * URL Detection Module
 * Handles URL analysis and threat detection functionality
 */

// DOM element selectors for better maintainability
const DOM_SELECTORS = {
  urlInput: 'urlInput',
  resultBox: 'result',
  resultIcon: 'resultIcon',
  resultText: 'resultText',
  progressContainer: 'progressContainer',
  progressFill: 'progressFill',
  progressText: 'progressText',
  resultDetails: 'resultDetails',
  resultActions: 'resultActions',
  analysisTime: 'analysisTime',
  threatType: 'threatType',
  threatLevel: 'threatLevel'
};

// Analysis configuration constants
const ANALYSIS_CONFIG = {
  progressInterval: 150,
  progressIncrement: { min: 5, max: 20 },
  resultDelay: 500,
  maxProgress: 100
};

/**
 * Main URL detection function
 * Validates input, shows progress, and displays analysis results
 */
function detectUrl() {
  const urlToAnalyze = getUrlInputValue();
  
  if (!isValidUrlInput(urlToAnalyze)) {
    return;
  }
  
  initializeAnalysisProgress();
  performUrlAnalysis(urlToAnalyze);
}

/**
 * Gets and trims the URL input value
 * @returns {string} The trimmed URL input value
 */
function getUrlInputValue() {
  const urlInputElement = document.getElementById(DOM_SELECTORS.urlInput);
  return urlInputElement ? urlInputElement.value.trim() : '';
}

/**
 * Validates URL input and shows appropriate notifications
 * @param {string} url - The URL to validate
 * @returns {boolean} True if URL is valid, false otherwise
 */
function isValidUrlInput(url) {
  if (!url) {
    showNotification('Please enter a URL to check', 'warning');
    return false;
  }
  
  if (!isValidUrlFormat(url)) {
    showNotification('Please enter a valid URL', 'error');
    return false;
  }
  
  return true;
}

/**
 * Checks if the URL has a valid format
 * @param {string} url - The URL to validate
 * @returns {boolean} True if URL format is valid
 */
function isValidUrlFormat(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Initializes the analysis progress UI
 */
function initializeAnalysisProgress() {
  const elements = getAnalysisElements();
  
  // Show progress indicators
  elements.progressContainer.style.display = 'block';
  elements.resultBox.style.display = 'block';
  elements.resultBox.className = 'result-box loading';
  
  // Set loading state
  elements.resultIcon.innerHTML = '🛡️';
  elements.resultText.textContent = 'Analyzing URL...';
  elements.resultDetails.style.display = 'none';
  elements.resultActions.style.display = 'none';
}

/**
 * Gets all DOM elements needed for analysis
 * @returns {Object} Object containing all analysis DOM elements
 */
function getAnalysisElements() {
  return {
    progressContainer: document.getElementById(DOM_SELECTORS.progressContainer),
    resultBox: document.getElementById(DOM_SELECTORS.resultBox),
    resultIcon: document.getElementById(DOM_SELECTORS.resultIcon),
    resultText: document.getElementById(DOM_SELECTORS.resultText),
    progressFill: document.getElementById(DOM_SELECTORS.progressFill),
    progressText: document.getElementById(DOM_SELECTORS.progressText),
    resultDetails: document.getElementById(DOM_SELECTORS.resultDetails),
    resultActions: document.getElementById(DOM_SELECTORS.resultActions)
  };
}

/**
 * Performs the actual URL analysis with backend API call
 * @param {string} url - The URL to analyze
 */
function performUrlAnalysis(url) {
  const analysisStartTime = Date.now();
  let currentProgress = 0;
  
  const progressInterval = setInterval(() => {
    currentProgress = updateProgressBar(currentProgress);
    
    if (currentProgress >= ANALYSIS_CONFIG.maxProgress) {
      clearInterval(progressInterval);
      callBackendAPI(url, analysisStartTime);
    }
  }, ANALYSIS_CONFIG.progressInterval);
}

/**
 * Calls the backend API for URL threat prediction
 * @param {string} url - The URL to analyze
 * @param {number} analysisStartTime - Start time of analysis
 */
function callBackendAPI(url, analysisStartTime) {
  const backendURL = 'http://localhost:5000/predict';
  
  fetch(backendURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: url })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Backend API error');
    }
    return response.json();
  })
  .then(data => {
    const analysisResult = {
      isSafe: data.prediction.toLowerCase() === 'benign',
      threatType: data.prediction
    };
    completeAnalysis(url, analysisStartTime, analysisResult);
  })
  .catch(error => {
    console.error('Error calling backend API:', error);
    showNotification('Error connecting to backend. Using local analysis.', 'warning');
    // Fallback to local analysis if backend is unavailable
    const analysisResult = analyzeUrlThreats(url);
    completeAnalysis(url, analysisStartTime, analysisResult);
  });
}

/**
 * Updates the progress bar with random increments
 * @param {number} currentProgress - Current progress value
 * @returns {number} Updated progress value
 */
function updateProgressBar(currentProgress) {
  const increment = Math.random() * 
    (ANALYSIS_CONFIG.progressIncrement.max - ANALYSIS_CONFIG.progressIncrement.min) + 
    ANALYSIS_CONFIG.progressIncrement.min;
  
  const newProgress = Math.min(currentProgress + increment, ANALYSIS_CONFIG.maxProgress);
  
  const elements = getAnalysisElements();
  elements.progressFill.style.width = newProgress + '%';
  elements.progressText.textContent = `Analyzing URL... ${Math.round(newProgress)}%`;
  
  return newProgress;
}

/**
 * Completes the analysis and displays results
 * @param {string} url - The analyzed URL
 * @param {number} startTime - Analysis start timestamp
 * @param {Object} analysisResult - The analysis result from backend
 */
function completeAnalysis(url, startTime, analysisResult = null) {
  setTimeout(() => {
    const analysisDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // If no result provided, use local analysis (fallback)
    if (!analysisResult) {
      analysisResult = analyzeUrlThreats(url);
    }
    
    displayAnalysisResults(analysisResult, analysisDuration);
    saveAnalysisToHistory(url, analysisResult);
    incrementUrlAnalysisCounter();
  }, ANALYSIS_CONFIG.resultDelay);
}

/**
 * Displays the analysis results in the UI
 * @param {Object} analysisResult - The analysis result object
 * @param {string} analysisDuration - Duration of analysis in seconds
 */
function displayAnalysisResults(analysisResult, analysisDuration) {
  const elements = getAnalysisElements();
  
  // Hide progress and show results
  elements.progressContainer.style.display = 'none';
  elements.resultDetails.style.display = 'grid';
  elements.resultActions.style.display = 'flex';
  
  // Update result details
  document.getElementById(DOM_SELECTORS.analysisTime).textContent = analysisDuration + 's';
  document.getElementById(DOM_SELECTORS.threatType).textContent = analysisResult.threatType;
  
  // Set result styling and content based on safety
  if (analysisResult.isSafe) {
    displaySafeResult(elements);
  } else {
    displayDangerousResult(elements, analysisResult.threatType);
  }
}

/**
 * Displays safe URL result
 * @param {Object} elements - DOM elements for result display
 */
function displaySafeResult(elements) {
  elements.resultBox.className = 'result-box safe';
  elements.resultIcon.innerHTML = '✅';
  elements.resultText.textContent = 'This URL appears to be safe!';
  document.getElementById(DOM_SELECTORS.threatLevel).innerHTML = '<span class="level-low">Low</span>';
  showNotification('URL analysis complete - Safe!', 'success');
}

/**
 * Displays dangerous URL result
 * @param {Object} elements - DOM elements for result display
 * @param {string} threatType - Type of threat detected
 */
function displayDangerousResult(elements, threatType) {
  elements.resultBox.className = 'result-box dangerous';
  elements.resultIcon.innerHTML = '⚠️';
  elements.resultText.textContent = `This URL may be malicious. Threat type: ${threatType}`;
  document.getElementById(DOM_SELECTORS.threatLevel).innerHTML = '<span class="level-high">High</span>';
  showNotification(`URL analysis complete - ${threatType} detected!`, 'error');
}

/**
 * Saves analysis result to browser history
 * @param {string} url - The analyzed URL
 * @param {Object} analysisResult - The analysis result
 */
function saveAnalysisToHistory(url, analysisResult) {
  const resultStatus = analysisResult.isSafe ? 'safe' : 'dangerous';
  saveUrlHistory(url, resultStatus);
}

/**
 * Increments the global URL analysis counter
 */
function incrementUrlAnalysisCounter() {
  if (window.incrementUrlCounter) {
    window.incrementUrlCounter();
  }
}

/**
 * URL Threat Analysis Module
 * Simulates URL analysis using pattern matching (replace with actual ML model)
 */

// Threat pattern definitions for URL analysis
const THREAT_PATTERNS = {
  phishing: [
    'phishing', 'login', 'password', 'account', 'verify', 'secure', 
    'bank', 'paypal', 'amazon', 'microsoft', 'google'
  ],
  malware: [
    'malware', 'virus', 'trojan', 'worm', 'backdoor', 'rootkit', 'spyware'
  ],
  ransomware: [
    'ransomware', 'encrypt', 'decrypt', 'bitcoin', 'payment', 'unlock'
  ],
  scam: [
    'scam', 'fake', 'fraud', 'steal', 'hack', 'breach', 'leak'
  ],
  suspicious: [
    'bit.ly', 'tinyurl', 'shortened', 'suspicious', 'unknown', 'weird'
  ]
};

/**
 * Analyzes URL for potential threats using pattern matching
 * @param {string} url - The URL to analyze
 * @returns {Object} Analysis result with safety status and threat type
 */
function analyzeUrlThreats(url) {
  const normalizedUrl = url.toLowerCase();
  const detectedThreat = detectThreatPattern(normalizedUrl);
  
  return {
    isSafe: !detectedThreat,
    threatType: detectedThreat || 'None'
  };
}

/**
 * Detects threat patterns in the normalized URL
 * @param {string} normalizedUrl - URL converted to lowercase
 * @returns {string|null} Threat type if detected, null if safe
 */
function detectThreatPattern(normalizedUrl) {
  for (const [threatType, patterns] of Object.entries(THREAT_PATTERNS)) {
    if (containsThreatPattern(normalizedUrl, patterns)) {
      return threatType;
    }
  }
  return null;
}

/**
 * Checks if URL contains any of the specified threat patterns
 * @param {string} url - The URL to check
 * @param {string[]} patterns - Array of threat patterns to match
 * @returns {boolean} True if any pattern is found
 */
function containsThreatPattern(url, patterns) {
  return patterns.some(pattern => url.includes(pattern));
}

/**
 * URL History Management Module
 * Handles storage and display of URL analysis history
 */

// History configuration constants
const HISTORY_CONFIG = {
  storageKey: 'urlHistory',
  maxItems: 20,
  modalId: 'historyModal',
  listId: 'historyList'
};

/**
 * Saves URL analysis result to browser history
 * @param {string} url - The analyzed URL
 * @param {string} result - Analysis result ('safe' or 'dangerous')
 */
function saveUrlHistory(url, result) {
  const existingHistory = getStoredHistory();
  const newHistoryItem = createHistoryItem(url, result);
  const updatedHistory = addToHistory(existingHistory, newHistoryItem);
  
  storeHistory(updatedHistory);
}

/**
 * Gets stored history from localStorage
 * @returns {Array} Array of history items
 */
function getStoredHistory() {
  const storedData = localStorage.getItem(HISTORY_CONFIG.storageKey);
  return storedData ? JSON.parse(storedData) : [];
}

/**
 * Creates a new history item object
 * @param {string} url - The analyzed URL
 * @param {string} result - Analysis result
 * @returns {Object} History item object
 */
function createHistoryItem(url, result) {
  return {
    url: url,
    result: result,
    timestamp: Date.now(),
    date: new Date().toLocaleDateString()
  };
}

/**
 * Adds new item to history and maintains size limit
 * @param {Array} history - Current history array
 * @param {Object} newItem - New history item to add
 * @returns {Array} Updated history array
 */
function addToHistory(history, newItem) {
  const updatedHistory = [newItem, ...history];
  return updatedHistory.slice(0, HISTORY_CONFIG.maxItems);
}

/**
 * Stores history array in localStorage
 * @param {Array} history - History array to store
 */
function storeHistory(history) {
  localStorage.setItem(HISTORY_CONFIG.storageKey, JSON.stringify(history));
}

/**
 * Displays URL analysis history in modal
 */
function showHistory() {
  const historyModal = document.getElementById(HISTORY_CONFIG.modalId);
  const historyList = document.getElementById(HISTORY_CONFIG.listId);
  const history = getStoredHistory();
  
  updateHistoryDisplay(historyList, history);
  showModal(historyModal);
}

/**
 * Updates the history list display
 * @param {HTMLElement} historyList - History list container element
 * @param {Array} history - History array to display
 */
function updateHistoryDisplay(historyList, history) {
  if (history.length === 0) {
    historyList.innerHTML = createEmptyHistoryMessage();
  } else {
    historyList.innerHTML = createHistoryItemsHTML(history);
  }
}

/**
 * Creates HTML for empty history message
 * @returns {string} HTML string for empty state
 */
function createEmptyHistoryMessage() {
  return '<p style="text-align: center; color: rgba(255,255,255,0.7);">No analysis history yet.</p>';
}

/**
 * Creates HTML for history items
 * @param {Array} history - History array
 * @returns {string} HTML string for history items
 */
function createHistoryItemsHTML(history) {
  return history.map(item => createHistoryItemHTML(item)).join('');
}

/**
 * Creates HTML for a single history item
 * @param {Object} item - History item object
 * @returns {string} HTML string for history item
 */
function createHistoryItemHTML(item) {
  return `
    <div class="history-item">
      <div class="history-url"><a class="history-url-link" href="${item.url}" target="_blank" rel="noopener noreferrer">${item.url}</a></div>
      <div class="history-status ${item.result}">${item.result}</div>
    </div>
  `;
}

/**
 * Shows the history modal
 * @param {HTMLElement} modal - Modal element to show
 */
function showModal(modal) {
  modal.style.display = 'flex';
}

/**
 * Closes the history modal
 */
function closeHistory() {
  const historyModal = document.getElementById(HISTORY_CONFIG.modalId);
  historyModal.style.display = 'none';
}

/**
 * Utility Functions Module
 * Handles copy, share, and other utility operations
 */

/**
 * Copies the current URL input to clipboard
 */
function copyUrl() {
  const urlToCopy = getUrlInputValue();
  
  if (!urlToCopy) {
    showNotification('No URL to copy', 'warning');
    return;
  }
  
  copyToClipboard(urlToCopy, 'URL copied to clipboard!');
}

/**
 * Shares the analysis result using native share API or clipboard fallback
 */
function shareResult() {
  const urlToShare = getUrlInputValue();
  
  if (!urlToShare) {
    showNotification('No result to share', 'warning');
    return;
  }
  
  const shareContent = createShareContent(urlToShare);
  
  if (supportsNativeShare()) {
    shareWithNativeAPI(shareContent);
  } else {
    shareWithClipboard(shareContent.text);
  }
}

/**
 * Copies text to clipboard with success/error handling
 * @param {string} text - Text to copy
 * @param {string} successMessage - Success notification message
 */
function copyToClipboard(text, successMessage) {
  navigator.clipboard.writeText(text)
    .then(() => showNotification(successMessage, 'success'))
    .catch(() => showNotification('Failed to copy to clipboard', 'error'));
}

/**
 * Creates share content object
 * @param {string} url - URL to share
 * @returns {Object} Share content object
 */
function createShareContent(url) {
  const analysisResult = getCurrentAnalysisResult();
  const resultStatus = analysisResult.isSafe ? 'safe' : 'potentially dangerous';
  
  return {
    title: 'Cyber Guard Analysis Result',
    text: `I just analyzed "${url}" with Cyber Guard and it appears to be ${resultStatus}! Check it out at ${window.location.origin}`,
    url: window.location.origin
  };
}

/**
 * Gets the current analysis result from the UI
 * @returns {Object} Analysis result object
 */
function getCurrentAnalysisResult() {
  const resultBox = document.getElementById(DOM_SELECTORS.resultBox);
  return {
    isSafe: resultBox ? resultBox.classList.contains('safe') : false
  };
}

/**
 * Checks if native share API is supported
 * @returns {boolean} True if native share is supported
 */
function supportsNativeShare() {
  return navigator.share && typeof navigator.share === 'function';
}

/**
 * Shares content using native share API
 * @param {Object} shareContent - Content to share
 */
function shareWithNativeAPI(shareContent) {
  navigator.share(shareContent)
    .catch(() => shareWithClipboard(shareContent.text));
}

/**
 * Shares content using clipboard fallback
 * @param {string} shareText - Text to share
 */
function shareWithClipboard(shareText) {
  copyToClipboard(shareText, 'Share text copied to clipboard!');
}

/**
 * Form Handling Module
 * Handles user authentication forms (login/signup)
 */

// Form configuration constants
const FORM_CONFIG = {
  redirectDelay: 1500,
  homePage: 'index.html',
  loginPage: 'login.html'
};

/**
 * Form Validation Module
 * Provides real-time validation feedback
 */

// Validation patterns
const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
};

// Validation messages
const VALIDATION_MESSAGES = {
  username: {
    required: 'Username is required',
    minLength: 'Username must be at least 3 characters',
    maxLength: 'Username must be less than 20 characters',
    pattern: 'Username can only contain letters, numbers, and underscores',
    success: 'Username looks good!'
  },
  email: {
    required: 'Email is required',
    invalid: 'Please enter a valid email address',
    success: 'Email looks good!'
  },
  password: {
    required: 'Password is required',
    weak: 'Password must be at least 8 characters with uppercase, lowercase, and a number',
    success: 'Password looks good!'
  }
};

/**
 * Initializes form validation for all forms on the page
 */
function initializeFormValidation() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
    
    inputs.forEach(input => {
      // Add real-time validation on input
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('error')) {
          validateField(input);
        }
      });
    });
  });
}

/**
 * Validates a single form field
 * @param {HTMLInputElement} input - Input element to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateField(input) {
  const fieldName = input.name || input.id || input.type;
  const value = input.value.trim();
  let isValid = true;
  let message = '';
  
  // Remove existing validation message
  removeValidationMessage(input);
  
  // Check required fields
  if (input.hasAttribute('required') && !value) {
    isValid = false;
    message = getValidationMessage(fieldName, 'required');
  }
  // Validate email
  else if (input.type === 'email' && value) {
    if (!VALIDATION_PATTERNS.email.test(value)) {
      isValid = false;
      message = VALIDATION_MESSAGES.email.invalid;
    } else {
      message = VALIDATION_MESSAGES.email.success;
    }
  }
  // Validate username
  else if (fieldName.includes('username') && value) {
    if (value.length < 3) {
      isValid = false;
      message = VALIDATION_MESSAGES.username.minLength;
    } else if (value.length > 20) {
      isValid = false;
      message = VALIDATION_MESSAGES.username.maxLength;
    } else if (!VALIDATION_PATTERNS.username.test(value)) {
      isValid = false;
      message = VALIDATION_MESSAGES.username.pattern;
    } else {
      message = VALIDATION_MESSAGES.username.success;
    }
  }
  // Validate password
  else if (input.type === 'password' && value) {
    if (!VALIDATION_PATTERNS.password.test(value)) {
      isValid = false;
      message = VALIDATION_MESSAGES.password.weak;
    } else {
      message = VALIDATION_MESSAGES.password.success;
    }
  }
  
  // Apply validation styling
  if (value) {
    if (isValid) {
      input.classList.remove('error');
      input.classList.add('success');
    } else {
      input.classList.remove('success');
      input.classList.add('error');
    }
  } else {
    input.classList.remove('error', 'success');
  }
  
  // Show validation message
  if (message) {
    showValidationMessage(input, message, isValid ? 'success' : 'error');
  }
  
  return isValid;
}

/**
 * Gets validation message for a field
 * @param {string} fieldName - Name of the field
 * @param {string} type - Type of validation message
 * @returns {string} Validation message
 */
function getValidationMessage(fieldName, type) {
  if (fieldName.includes('username')) {
    return VALIDATION_MESSAGES.username[type] || VALIDATION_MESSAGES.username.required;
  } else if (fieldName.includes('email')) {
    return VALIDATION_MESSAGES.email[type] || VALIDATION_MESSAGES.email.required;
  } else if (fieldName.includes('password')) {
    return VALIDATION_MESSAGES.password[type] || VALIDATION_MESSAGES.password.required;
  }
  return 'This field is required';
}

/**
 * Shows validation message for an input field
 * @param {HTMLInputElement} input - Input element
 * @param {string} message - Validation message
 * @param {string} type - Message type (error, success, info)
 */
function showValidationMessage(input, message, type = 'error') {
  // Create or get form group
  let formGroup = input.closest('.form-group');
  if (!formGroup) {
    formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    input.parentNode.insertBefore(formGroup, input);
    formGroup.appendChild(input);
  }
  
  // Remove existing message
  const existingMessage = formGroup.querySelector('.validation-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create new message
  const messageElement = document.createElement('span');
  messageElement.className = `validation-message ${type}`;
  messageElement.textContent = message;
  formGroup.appendChild(messageElement);
}

/**
 * Removes validation message for an input field
 * @param {HTMLInputElement} input - Input element
 */
function removeValidationMessage(input) {
  const formGroup = input.closest('.form-group');
  if (formGroup) {
    const message = formGroup.querySelector('.validation-message');
    if (message) {
      message.remove();
    }
  }
}

/**
 * Handles login form submission
 * @param {Event} event - Form submission event
 */
function handleLogin(event) {
  event.preventDefault();
  handleLoginSubmit(event);
}

/**
 * Handles signup form submission
 * @param {Event} event - Form submission event
 */
function handleSignup(event) {
  event.preventDefault();
  handleSignup(event);
}

/**
 * Extracts form data from form element
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Form data object
 */
function extractFormData(form) {
  const formData = new FormData(form);
  
  return {
    username: formData.get('username') || form[0]?.value || '',
    email: formData.get('email') || form[1]?.value || '',
    password: formData.get('password') || form[2]?.value || ''
  };
}

/**
 * Validates login form data
 * @param {Object} formData - Form data object
 * @returns {boolean} True if login data is valid
 */
function isValidLoginData(formData) {
  return Boolean(formData.username && formData.password);
}

/**
 * Validates signup form data
 * @param {Object} formData - Form data object
 * @returns {boolean} True if signup data is valid
 */
function isValidSignupData(formData) {
  return Boolean(formData.username && formData.email && formData.password);
}

/**
 * Authentication configuration constants
 */
const AUTH_CONFIG = {
  storageKey: 'userAuth',
  tokenKey: 'authToken',
  apiBaseUrl: 'http://localhost:5000/api',
  redirectDelay: 1500,
  homePage: 'index.html',
  loginPage: 'login.html'
};

/**
 * Saves JWT token and user data to localStorage
 * @param {string} token - JWT token
 * @param {Object} userData - User data object
 */
function saveUserAuth(token, userData) {
  try {
    localStorage.setItem(AUTH_CONFIG.tokenKey, token);
    localStorage.setItem(AUTH_CONFIG.storageKey, JSON.stringify(userData));
    
    // Also save JWT token to Chrome extension storage so extension can use it
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ jwtToken: token }, () => {
        console.log('JWT token saved to extension storage');
      });
    }
  } catch (e) {
    console.error('Failed to save auth data:', e);
  }
}

/**
 * Gets stored JWT token from localStorage
 * @returns {string|null} JWT token or null
 */
function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_CONFIG.tokenKey);
  } catch (e) {
    console.error('Failed to get token:', e);
    return null;
  }
}

/**
 * Gets stored user data from localStorage
 * @returns {Object|null} User data or null
 */
function getStoredUserAuth() {
  try {
    const storedAuth = localStorage.getItem(AUTH_CONFIG.storageKey);
    return storedAuth ? JSON.parse(storedAuth) : null;
  } catch (e) {
    console.error('Failed to get user auth:', e);
    return null;
  }
}

/**
 * Clears all authentication data from localStorage
 */
function clearUserAuth() {
  try {
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem(AUTH_CONFIG.storageKey);
    
    // Also clear JWT token from extension storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove('jwtToken', () => {
        console.log('JWT token cleared from extension storage');
      });
    }
  } catch (e) {
    console.error('Failed to clear auth data:', e);
  }
}

/**
 * Makes authenticated API call with JWT token
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise} API response
 */
async function authenticatedFetch(endpoint, options = {}) {
  const token = getStoredToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  const response = await fetch(`${AUTH_CONFIG.apiBaseUrl}${endpoint}`, {
    ...options,
    headers
  });
  
  // If token is invalid/expired, logout user
  if (response.status === 401) {
    clearUserAuth();
    updateUIForLoggedOut();
    window.location.href = AUTH_CONFIG.loginPage;
    return null;
  }
  
  return response;
}

/**
 * Register new user with secure backend
 */
async function handleSignup(event) {
  event.preventDefault();
  
  const form = event.target;
  const usernameInput = form.querySelector('input[type="text"]');
  const emailInput = form.querySelector('input[type="email"]');
  const passwordInput = form.querySelector('input[type="password"]');
  
  const username = usernameInput ? usernameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  
  if (!username || !email || !password) {
    showNotification('Please fill all fields', 'error');
    return;
  }
  
  if (username.length < 3) {
    showNotification('Username must be at least 3 characters', 'error');
    return;
  }
  
  if (password.length < 8) {
    showNotification('Password must be at least 8 characters', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${AUTH_CONFIG.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showNotification(data.error || 'Registration failed', 'error');
      return;
    }
    
    saveUserAuth(data.token, data.user);
    updateUIForLoggedIn(data.user);
    showNotification('Account created successfully!', 'success');
    
    setTimeout(() => {
      window.location.href = AUTH_CONFIG.homePage;
    }, AUTH_CONFIG.redirectDelay);
    
  } catch (error) {
    console.error('Signup error:', error);
    showNotification('An error occurred during signup', 'error');
  }
}

/**
 * Login user with secure backend
 */
async function handleLoginSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const usernameInput = form.querySelector('input[type="text"]');
  const passwordInput = form.querySelector('input[type="password"]');
  
  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  
  if (!username || !password) {
    showNotification('Please enter username and password', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${AUTH_CONFIG.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showNotification(data.error || 'Login failed', 'error');
      return;
    }
    
    saveUserAuth(data.token, data.user);
    updateUIForLoggedIn(data.user);
    showNotification('Login successful!', 'success');
    
    setTimeout(() => {
      window.location.href = AUTH_CONFIG.homePage;
    }, AUTH_CONFIG.redirectDelay);
    
  } catch (error) {
    console.error('Login error:', error);
    showNotification('An error occurred during login', 'error');
  }
}

/**
 * Logout user
 */
async function handleLogout(event) {
  if (event) {
    event.preventDefault();
  }
  
  try {
    await authenticatedFetch('/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  clearUserAuth();
  updateUIForLoggedOut();
  showNotification('Logged out successfully', 'success');
  
  setTimeout(() => {
    window.location.href = AUTH_CONFIG.loginPage;
  }, AUTH_CONFIG.redirectDelay);
}

/**
 * Updates UI to show logged-in state
 */
function updateUIForLoggedIn(userData) {
  const loginBtn = document.getElementById('loginBtn');
  
  if (loginBtn) {
    loginBtn.textContent = userData.username;
    loginBtn.href = '#';
    loginBtn.onclick = handleLogout;
    loginBtn.classList.add('btn--logout');
    loginBtn.title = 'Click to logout';
  }
}

/**
 * Updates UI to show logged-out state
 */
function updateUIForLoggedOut() {
  const loginBtn = document.getElementById('loginBtn');
  
  if (loginBtn) {
    loginBtn.textContent = 'Log in';
    loginBtn.href = 'login.html';
    loginBtn.onclick = null;
    loginBtn.classList.remove('btn--logout');
    loginBtn.title = 'Log in';
  }
}

/**
 * Restores user session from stored token
 */
async function restoreUserSession() {
  const token = getStoredToken();
  const userData = getStoredUserAuth();
  
  if (!token || !userData) {
    return;
  }
  
  try {
    const response = await authenticatedFetch('/auth/verify');
    
    if (response && response.ok) {
      const data = await response.json();
      updateUIForLoggedIn(data.user);
    } else {
      clearUserAuth();
    }
  } catch (error) {
    console.error('Session restore error:', error);
    clearUserAuth();
  }
}

/**
 * Fetch user's scan history from secure backend
 */
async function fetchUserHistory() {
  const token = getStoredToken();
  
  if (!token) {
    console.warn('User not authenticated');
    return [];
  }
  
  try {
    const response = await authenticatedFetch('/history');
    
    if (!response) return [];
    
    if (!response.ok) {
      console.error('Failed to fetch history');
      return [];
    }
    
    const data = await response.json();
    return data.history || [];
    
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return [];
  }
}

/**
 * Add URL scan to user history on backend
 */
async function addToUserHistory(url, status, threatLevel) {
  const token = getStoredToken();
  
  if (!token) {
    console.warn('User not authenticated, history not saved');
    return;
  }
  
  try {
    await authenticatedFetch('/history', {
      method: 'POST',
      body: JSON.stringify({
        url,
        status,
        threat_level: threatLevel
      })
    });
  } catch (error) {
    console.error('Failed to add to history:', error);
  }
}

/**
 * Delete history item from backend
 */
async function deleteHistoryItem(historyId) {
  try {
    const response = await authenticatedFetch(`/history/${historyId}`, {
      method: 'DELETE'
    });
    
    if (response && response.ok) {
      showNotification('History item deleted', 'success');
      return true;
    }
  } catch (error) {
    console.error('Failed to delete history:', error);
  }
  
  return false;
}

/**
 * Redirects to specified page after delay
 * @param {string} pageUrl - URL to redirect to
 */
function redirectToPage(pageUrl) {
  setTimeout(() => {
    window.location.href = pageUrl;
  }, FORM_CONFIG.redirectDelay);
}

/**
 * Dark Mode Management Module
 * Handles dark mode toggle and persistence
 */

// Dark mode configuration constants
const DARK_MODE_CONFIG = {
  storageKey: 'darkMode',
  enabledValue: 'enabled',
  disabledValue: 'disabled',
  bodyClass: 'dark-mode'
};

/**
 * Toggles dark mode on/off
 */
function toggleDarkMode() {
  const bodyElement = document.body;
  const isCurrentlyDark = bodyElement.classList.contains(DARK_MODE_CONFIG.bodyClass);
  
  if (isCurrentlyDark) {
    disableDarkMode(bodyElement);
  } else {
    enableDarkMode(bodyElement);
  }
}

/**
 * Enables dark mode
 * @param {HTMLElement} bodyElement - Body element to modify
 */
function enableDarkMode(bodyElement) {
  bodyElement.classList.add(DARK_MODE_CONFIG.bodyClass);
  saveDarkModePreference(DARK_MODE_CONFIG.enabledValue);
}

/**
 * Disables dark mode
 * @param {HTMLElement} bodyElement - Body element to modify
 */
function disableDarkMode(bodyElement) {
  bodyElement.classList.remove(DARK_MODE_CONFIG.bodyClass);
  saveDarkModePreference(DARK_MODE_CONFIG.disabledValue);
}

/**
 * Saves dark mode preference to localStorage
 * @param {string} preference - Dark mode preference value
 */
function saveDarkModePreference(preference) {
  localStorage.setItem(DARK_MODE_CONFIG.storageKey, preference);
}

/**
 * Initializes dark mode based on saved preference
 * DISABLED: Always uses bright purple theme, never dark mode
 */
function initializeDarkMode() {
  // Apply saved preference if present, otherwise respect system preference
  try {
    const stored = localStorage.getItem(DARK_MODE_CONFIG.storageKey);
    if (stored === DARK_MODE_CONFIG.enabledValue) {
      document.body.classList.add(DARK_MODE_CONFIG.bodyClass);
    } else if (stored === DARK_MODE_CONFIG.disabledValue) {
      document.body.classList.remove(DARK_MODE_CONFIG.bodyClass);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // No explicit preference saved — use system preference (do not overwrite storage)
      document.body.classList.add(DARK_MODE_CONFIG.bodyClass);
    } else {
      document.body.classList.remove(DARK_MODE_CONFIG.bodyClass);
    }
  } catch (e) {
    // If localStorage is unavailable for any reason, fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add(DARK_MODE_CONFIG.bodyClass);
    } else {
      document.body.classList.remove(DARK_MODE_CONFIG.bodyClass);
    }
  }
}

/**
 * Notification System Module
 * Handles user notifications with different types and animations
 */

// Notification configuration constants
const NOTIFICATION_CONFIG = {
  defaultType: 'info',
  displayDuration: 4000,
  animationDelay: 100,
  hideAnimationDuration: 300,
  zIndex: 1000,
  position: {
    top: '20px',
    right: '20px'
  }
};

// Notification type styling
const NOTIFICATION_STYLES = {
  success: 'linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(139, 195, 74, 0.9))',
  error: 'linear-gradient(135deg, rgba(244, 67, 54, 0.9), rgba(255, 87, 34, 0.9))',
  warning: 'linear-gradient(135deg, rgba(255, 193, 7, 0.9), rgba(255, 152, 0, 0.9))',
  info: 'linear-gradient(135deg, rgba(33, 150, 243, 0.9), rgba(63, 81, 181, 0.9))'
};

/**
 * Shows a notification to the user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = NOTIFICATION_CONFIG.defaultType) {
  const notificationElement = createNotificationElement(message, type);
  
  displayNotification(notificationElement);
  scheduleNotificationRemoval(notificationElement);
}

/**
 * Creates notification DOM element
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @returns {HTMLElement} Notification element
 */
function createNotificationElement(message, type) {
  const notification = document.createElement('div');
  
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  applyNotificationStyles(notification, type);
  
  return notification;
}

/**
 * Applies styling to notification element
 * @param {HTMLElement} notification - Notification element
 * @param {string} type - Notification type
 */
function applyNotificationStyles(notification, type) {
  const baseStyles = {
    position: 'fixed',
    top: NOTIFICATION_CONFIG.position.top,
    right: NOTIFICATION_CONFIG.position.right,
    padding: '16px 24px',
    borderRadius: '12px',
    color: 'white',
    fontWeight: '600',
    zIndex: NOTIFICATION_CONFIG.zIndex.toString(),
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    background: NOTIFICATION_STYLES[type] || NOTIFICATION_STYLES.info
  };
  
  Object.assign(notification.style, baseStyles);
}

/**
 * Displays notification with slide-in animation
 * @param {HTMLElement} notification - Notification element
 */
function displayNotification(notification) {
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, NOTIFICATION_CONFIG.animationDelay);
}

/**
 * Schedules notification removal with slide-out animation
 * @param {HTMLElement} notification - Notification element
 */
function scheduleNotificationRemoval(notification) {
  setTimeout(() => {
    hideNotification(notification);
  }, NOTIFICATION_CONFIG.displayDuration);
}

/**
 * Hides notification with slide-out animation
 * @param {HTMLElement} notification - Notification element
 */
function hideNotification(notification) {
  notification.style.transform = 'translateX(100%)';
  
  setTimeout(() => {
    removeNotificationFromDOM(notification);
  }, NOTIFICATION_CONFIG.hideAnimationDuration);
}

/**
 * Removes notification from DOM
 * @param {HTMLElement} notification - Notification element
 */
function removeNotificationFromDOM(notification) {
  if (notification.parentNode) {
    notification.parentNode.removeChild(notification);
  }
}

/**
 * Keyboard Shortcuts Module
 * Handles keyboard navigation and shortcuts
 */

// Keyboard shortcut configuration
const KEYBOARD_SHORTCUTS = {
  focusUrlInput: 'd',
  submitForm: 'Enter',
  closeModal: 'Escape',
  urlInputId: 'urlInput',
  historyModalId: 'historyModal'
};

/**
 * Initializes keyboard event listeners
 */
function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeyboardInput);
}

/**
 * Handles keyboard input events
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyboardInput(event) {
  if (isFocusUrlInputShortcut(event)) {
    handleFocusUrlInputShortcut(event);
  } else if (isSubmitFormShortcut(event)) {
    handleSubmitFormShortcut(event);
  } else if (isCloseModalShortcut(event)) {
    handleCloseModalShortcut();
  }
}

/**
 * Checks if the event is the focus URL input shortcut
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean} True if it's the focus shortcut
 */
function isFocusUrlInputShortcut(event) {
  return event.key === KEYBOARD_SHORTCUTS.focusUrlInput && 
         !event.ctrlKey && 
         !event.altKey && 
         window.location.pathname.includes('detect');
}

/**
 * Handles focus URL input shortcut
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleFocusUrlInputShortcut(event) {
  const urlInputElement = document.getElementById(KEYBOARD_SHORTCUTS.urlInputId);
  
  if (urlInputElement) {
    urlInputElement.focus();
    event.preventDefault();
  }
}

/**
 * Checks if the event is the submit form shortcut
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean} True if it's the submit shortcut
 */
function isSubmitFormShortcut(event) {
  return event.key === KEYBOARD_SHORTCUTS.submitForm && 
         event.target.id === KEYBOARD_SHORTCUTS.urlInputId;
}

/**
 * Handles submit form shortcut
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleSubmitFormShortcut(event) {
  detectUrl();
  event.preventDefault();
}

/**
 * Checks if the event is the close modal shortcut
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean} True if it's the close modal shortcut
 */
function isCloseModalShortcut(event) {
  return event.key === KEYBOARD_SHORTCUTS.closeModal;
}

/**
 * Handles close modal shortcut
 */
function handleCloseModalShortcut() {
  const historyModal = document.getElementById(KEYBOARD_SHORTCUTS.historyModalId);
  
  if (historyModal && historyModal.style.display === 'flex') {
    closeHistory();
  }
}

/**
 * URL Counter Module
 * Tracks and displays URL analysis statistics
 */

// URL counter configuration
const URL_COUNTER_CONFIG = {
  storageKey: 'urlsAnalyzed',
  counterElementId: 'urlsAnalyzed',
  millionThreshold: 1000000,
  thousandThreshold: 1000
};

/**
 * Initializes URL analysis counter
 */
function initializeUrlCounter() {
  const counterElement = document.getElementById(URL_COUNTER_CONFIG.counterElementId);
  let currentCount = getStoredUrlCount();
  
  /**
   * Updates the counter display with formatted number
   */
  function updateCounterDisplay() {
    if (counterElement) {
      counterElement.textContent = formatUrlCount(currentCount);
    }
  }
  
  /**
   * Increments the URL counter and updates display
   */
  window.incrementUrlCounter = function() {
    currentCount += 1;
    saveUrlCount(currentCount);
    updateCounterDisplay();
  };
  
  // Initial display
  updateCounterDisplay();
}

/**
 * Gets stored URL count from localStorage
 * @returns {number} Stored URL count or 0
 */
function getStoredUrlCount() {
  const storedCount = localStorage.getItem(URL_COUNTER_CONFIG.storageKey);
  return storedCount ? parseInt(storedCount, 10) : 0;
}

/**
 * Saves URL count to localStorage
 * @param {number} count - URL count to save
 */
function saveUrlCount(count) {
  localStorage.setItem(URL_COUNTER_CONFIG.storageKey, count.toString());
}

/**
 * Formats URL count for display (e.g., 1.2M+, 5.5K+)
 * @param {number} count - URL count to format
 * @returns {string} Formatted count string
 */
function formatUrlCount(count) {
  if (count >= URL_COUNTER_CONFIG.millionThreshold) {
    return (count / URL_COUNTER_CONFIG.millionThreshold).toFixed(1) + 'M+';
  } else if (count >= URL_COUNTER_CONFIG.thousandThreshold) {
    return (count / URL_COUNTER_CONFIG.thousandThreshold).toFixed(1) + 'K+';
  } else {
    return count.toString();
  }
}

/**
 * Mobile Menu Management Module
 * Handles mobile navigation menu toggle
 */

/**
 * Toggles mobile menu visibility
 */
function toggleMobileMenu() {
  const navMenu = document.getElementById('navMenu');
  const toggleButton = document.querySelector('.mobile-menu-toggle');
  
  if (navMenu && toggleButton) {
    navMenu.classList.toggle('active');
    toggleButton.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    if (navMenu.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}

/**
 * Closes mobile menu when clicking outside or on a link
 */
function closeMobileMenu() {
  const navMenu = document.getElementById('navMenu');
  const toggleButton = document.querySelector('.mobile-menu-toggle');
  
  if (navMenu && toggleButton) {
    navMenu.classList.remove('active');
    toggleButton.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Application Initialization Module
 * Handles page setup and event listener initialization
 */

/**
 * Initializes the application when DOM is loaded
 */
function initializeApplication() {
  restoreUserSession();
  initializeDarkMode();
  initializeUrlCounter();
  initializeKeyboardShortcuts();
  initializeModalHandlers();
  initializeFormValidation();
  initializeLoadingAnimations();
  initializeMobileMenu();
}

/**
 * Initializes mobile menu event listeners
 */
function initializeMobileMenu() {
  // Close menu when clicking on a nav link
  const navLinks = document.querySelectorAll('.nav-menu__link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMobileMenu();
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (event) => {
    const navMenu = document.getElementById('navMenu');
    const toggleButton = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu && toggleButton && 
        !navMenu.contains(event.target) && 
        !toggleButton.contains(event.target) &&
        navMenu.classList.contains('active')) {
      closeMobileMenu();
    }
  });
  
  // Close menu on escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMobileMenu();
    }
  });
}

/**
 * Initializes modal event handlers
 */
function initializeModalHandlers() {
  document.addEventListener('click', handleModalClick);
}

/**
 * Handles clicks outside modal to close it
 * @param {Event} event - Click event
 */
function handleModalClick(event) {
  const historyModal = document.getElementById(HISTORY_CONFIG.modalId);
  
  if (event.target === historyModal) {
    closeHistory();
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApplication);

/**
 * Loading Animations Module
 * Adds fade-in animations to content as it loads
 */

/**
 * Initializes loading animations for page content
 */
function initializeLoadingAnimations() {
  // Add fade-in classes to cards and content sections
  const cards = document.querySelectorAll('.feature-card, .team-card, .step-card, .mission-card, .mission-item, .tech-feature');
  
  // Use Intersection Observer for lazy animations
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.animation = `fade-in-up 0.6s ease-out ${index * 0.1}s both`;
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });
    
    cards.forEach(card => {
      card.style.opacity = '0';
      observer.observe(card);
    });
  } else {
    // Fallback for browsers without IntersectionObserver
    cards.forEach((card, index) => {
      card.style.opacity = '1';
      card.style.animation = `fade-in-up 0.6s ease-out ${index * 0.1}s both`;
    });
  }
  
  // Add fade-in to main content sections
  const sections = document.querySelectorAll('main > section, .hero, .detect-content');
  sections.forEach((section, index) => {
    section.classList.add('fade-in');
    if (index > 0) {
      section.classList.add(`fade-in-delay-${Math.min(index, 3)}`);
    }
  });
}