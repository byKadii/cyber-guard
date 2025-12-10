# 🏗️ Complete System Architecture

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              YOUR COMPLETE SYSTEM                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Chrome)                                        │
├──────────────────────────────────┬───────────────────────────────────────────────┤
│                                  │                                               │
│  WEBSITE (Localhost:5000)         │  EXTENSION                                   │
│  ├─ index.html                    │  ├─ popup.js (NEW: Check URLs)              │
│  ├─ login.html                    │  ├─ background.js (NEW: Block URLs)         │
│  ├─ signup.html                   │  ├─ popup.html                              │
│  ├─ history.html                  │  └─ warning.html                            │
│  ├─ script.js (UPDATED)           │                                              │
│  │  ├─ saveUserAuth()             │  Extension reads JWT from:                  │
│  │  │  ├─ → localStorage          │  chrome.storage.local                       │
│  │  │  └─ → chrome.storage ◄─────┼─────────────────────────────────────────►   │
│  │  │                             │                                              │
│  │  └─ clearUserAuth()            │  Extension checks URLs against:             │
│  │     ├─ → removeItem localStorage   POST /predict with Bearer token          │
│  │     └─ → removeItem chrome.storage                                           │
│  │                                │  If malicious:                              │
│  ├─ Login button: handleLoginSubmit()  ├─ Show warning                         │
│  └─ Logout button: handleLogout()      ├─ Close tab                            │
│                                  │     └─ Show notification                     │
│  JWT Token Flow:                 │                                              │
│  1. Login → JWT created          │  If safe:                                    │
│  2. Saved to localStorage        │  ├─ Show notification                        │
│  3. Also saved to chrome.storage │  └─ Let page load                           │
│  4. Extension can now access it  │                                              │
│                                  │                                              │
└──────────────────────────────────┼───────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴───────────────────┐
                    │  HTTP/HTTPS (JSON)              │
                    │  Authorization: Bearer <JWT>    │
                    │                                 │
                    ▼                                 ▼
        ┌───────────────────────────────────────────────────────┐
        │         BACKEND (Flask Server on :5000)              │
        ├───────────────────────────────────────────────────────┤
        │                                                       │
        │  app.py:                                            │
        │  ├─ /api/auth/register (POST)                      │
        │  │   └─ Hashes password, creates user              │
        │  │                                                 │
        │  ├─ /api/auth/login (POST)                         │
        │  │   ├─ Verifies credentials                       │
        │  │   └─ Generates JWT (24-hour)                    │
        │  │                                                 │
        │  ├─ /api/auth/logout (POST, @token_required)       │
        │  │   └─ Invalidates token                          │
        │  │                                                 │
        │  ├─ /api/auth/verify (GET, @token_required)        │
        │  │   └─ Checks if token still valid                │
        │  │                                                 │
        │  ├─ /api/history (GET, @token_required)            │
        │  │   └─ Returns user's scans                       │
        │  │                                                 │
        │  ├─ /api/history (POST, @token_required)           │
        │  │   └─ Saves new scan to history                  │
        │  │                                                 │
        │  ├─ /api/history/<id> (DELETE, @token_required)    │
        │  │   └─ Removes scan from history                  │
        │  │                                                 │
        │  └─ /predict (POST, @token_required) ◄──────┐     │
        │     ├─ Validates JWT token                  │     │
        │     ├─ Analyzes URL                         │     │
        │     ├─ Returns threat prediction            │     │
        │     └─ Saves to user's history             │     │
        │                                            │     │
        │  @token_required decorator:                 │     │
        │  1. Checks Authorization header             │     │
        │  2. Extracts Bearer token                   │     │
        │  3. Validates token signature               │     │
        │  4. Checks token expiration                 │     │
        │  5. Returns user_id from token              │     │
        │                                            │     │
        └────────────────────────────────────────────┼─────┘
                          │                         │
                          │   SQL Queries           │
                          │   (user_id-based)       │
                          │                         │
                          ▼                         │
        ┌───────────────────────────────────────────┴─────┐
        │      SQLite Database (cyber_guard.db)          │
        ├───────────────────────────────────────────────────┤
        │                                                  │
        │  USERS TABLE:                                   │
        │  ├─ id (primary key)                            │
        │  ├─ username (unique)                           │
        │  ├─ email (unique)                              │
        │  ├─ password_hash (PBKDF2)                      │
        │  └─ created_at (timestamp)                      │
        │                                                  │
        │  SCAN_HISTORY TABLE:                            │
        │  ├─ id (primary key)                            │
        │  ├─ user_id (foreign key → users.id)            │
        │  ├─ url (checked URL)                           │
        │  ├─ status (safe/phishing/malicious)            │
        │  ├─ threat_level (low/medium/high)              │
        │  └─ timestamp (when checked)                    │
        │                                                  │
        │  User Isolation:                                │
        │  • Each scan linked to user_id                  │
        │  • Only user can see their scans                │
        │  • API filters by user_id automatically         │
        │                                                  │
        └───────────────────────────────────────────────────┘
```

---

## Authentication Flow Diagram

```
                    LOGIN PROCESS
                    ═════════════

User submits: username + password
        │
        ▼
┌──────────────────────────────┐
│ POST /api/auth/login         │
│ Body: {username, password}   │
└──────────────────────────────┘
        │
        ▼
Backend:
├─ Find user by username
├─ Verify password with PBKDF2
├─ If valid:
│  └─ Generate JWT token
│     ├─ Contains: user_id, username
│     ├─ Signed with SECRET_KEY
│     └─ Expires in 24 hours
├─ If invalid:
│  └─ Return 401 error
        │
        ▼
Frontend receives JWT:
├─ Save to localStorage
│  └─ Key: "auth_token"
├─ Save to chrome.storage
│  └─ Key: "jwtToken"
├─ Show username on page
└─ Display logged-in UI
        │
        ▼
Browser Storage:
├─ localStorage (Website only)
│  └─ auth_token: "eyJhbGc..."
│
└─ chrome.storage.local (Extension access)
   └─ jwtToken: "eyJhbGc..."


                  URL CHECKING PROCESS
                  ════════════════════

User visits URL in Chrome
        │
        ▼
Extension detects page load
├─ chrome.tabs.onUpdated event
└─ tab.url is captured
        │
        ▼
Extension checks prerequisites:
├─ Is autoCheck enabled? → Yes
├─ Does user have JWT? → Read from chrome.storage
└─ If both true → Proceed
        │
        ▼
┌──────────────────────────────────────────┐
│ POST /predict                            │
│ Headers:                                 │
│   Authorization: Bearer <JWT>            │
│ Body:                                    │
│   {url: "https://example.com"}          │
└──────────────────────────────────────────┘
        │
        ▼
Backend:
├─ Read Authorization header
├─ Extract JWT token
├─ Validate JWT:
│  ├─ Check signature (with SECRET_KEY)
│  ├─ Check expiration
│  └─ If invalid → Return 401
├─ Extract user_id from JWT
├─ Analyze URL (demo or real ML)
├─ Get prediction (safe/phishing/malicious)
├─ Save to scan_history:
│  ├─ user_id (from JWT)
│  ├─ url (from request)
│  ├─ status (prediction)
│  └─ timestamp (now)
└─ Return: {prediction: "...", threat_level: "..."}
        │
        ▼
Extension receives prediction:
├─ If prediction = "malicious":
│  ├─ Create warning popup window
│  ├─ Show threat notification
│  └─ Close current tab (after 1s)
│
└─ If prediction = "safe":
   ├─ Show safe notification
   └─ Let page load normally


                  LOGOUT PROCESS
                  ══════════════

User clicks logout
        │
        ▼
┌──────────────────────────────────┐
│ POST /api/auth/logout            │
│ Headers:                         │
│   Authorization: Bearer <JWT>    │
└──────────────────────────────────┘
        │
        ▼
Frontend:
├─ Remove from localStorage
│  └─ removeItem("auth_token")
├─ Remove from chrome.storage
│  └─ removeItem("jwtToken")
├─ Clear username display
├─ Show logout UI
└─ Redirect to login page
        │
        ▼
Extension:
├─ No longer has JWT token
├─ Next URL check:
│  ├─ Read chrome.storage
│  └─ Find no jwtToken
├─ Skip checking
└─ Show: "Login required"
```

---

## Request/Response Examples

### Login Request/Response

**REQUEST:**
```json
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

**RESPONSE (Success - 200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

**RESPONSE (Failure - 401):**
```json
{
  "error": "Invalid credentials"
}
```

---

### Predict Request/Response

**REQUEST:**
```json
POST http://localhost:5000/predict
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "url": "https://example.com/verify/account"
}
```

**RESPONSE (Safe):**
```json
{
  "prediction": "safe",
  "threat_level": "low",
  "confidence": 0.95,
  "message": "This site appears to be safe"
}
```

**RESPONSE (Malicious):**
```json
{
  "prediction": "malicious",
  "threat_level": "high",
  "confidence": 0.87,
  "message": "This site has been flagged as malicious"
}
```

**RESPONSE (Unauthorized - 401):**
```json
{
  "error": "Invalid or expired token"
}
```

---

## Data Model

```
┌─────────────────────────────────┐
│        USERS TABLE              │
├─────────────────────────────────┤
│ id (INTEGER PRIMARY KEY)        │
│ username (TEXT UNIQUE)          │
│ email (TEXT UNIQUE)             │
│ password_hash (TEXT)            │
│ created_at (TIMESTAMP)          │
└─────────────────────────────────┘
           │
           │ Has many
           │ (1:N relationship)
           │
           ▼
┌─────────────────────────────────┐
│     SCAN_HISTORY TABLE          │
├─────────────────────────────────┤
│ id (INTEGER PRIMARY KEY)        │
│ user_id (INTEGER FOREIGN KEY)   │◄─ Links to Users
│ url (TEXT)                      │
│ status (TEXT)                   │
│ threat_level (TEXT)             │
│ timestamp (TIMESTAMP)           │
└─────────────────────────────────┘
```

---

## Security Implementation

```
PASSWORD SECURITY:
├─ User enters password
├─ Password hashed with PBKDF2
│  ├─ 100,000 iterations
│  ├─ SHA-256 algorithm
│  └─ Unique salt per password
├─ Hash stored in database
├─ Plain password NEVER stored
└─ On login: hash input → compare with stored

TOKEN SECURITY:
├─ JWT token generated on successful login
├─ Contains: user_id, username
├─ Signed with SECRET_KEY
├─ Expires in 24 hours
├─ Verified on each API call
├─ Invalid token → 401 error
└─ Token cleared on logout

API SECURITY:
├─ @token_required decorator on protected endpoints
├─ Checks Authorization header: "Bearer <token>"
├─ Validates token signature
├─ Checks token expiration
├─ Returns user_id from token
├─ All queries filtered by user_id
└─ User can only access own data

DATA ISOLATION:
├─ Each user has unique ID
├─ Scan history linked to user_id via foreign key
├─ API always filters: WHERE user_id = ?
├─ Cannot access other users' scans
└─ Database enforces relationship integrity
```

---

## Browser Storage Comparison

```
localStorage (Website Only)
├─ Origin: http://localhost:5000
├─ Accessible by: Website code only
├─ Accessible by: Extension? NO (different origin)
├─ Storage key: "auth_token"
├─ Cleared on: Browser clear cache / Manual logout
└─ Use case: Website persistence

chrome.storage.local (Extension Only)
├─ Origin: Extension ID
├─ Accessible by: Extension code only
├─ Accessible by: Website? NO (isolated)
├─ Storage key: "jwtToken"
├─ Cleared on: Extension uninstall / Manual logout
└─ Use case: Extension persistence

Syncing Strategy:
├─ When user logs in:
│  ├─ Save to localStorage (website)
│  └─ Save to chrome.storage (extension)
├─ When user logs out:
│  ├─ Clear from localStorage (website)
│  └─ Clear from chrome.storage (extension)
└─ Result: Both use same JWT token, but isolated storage
```

---

## Threat Level Classification

```
SAFE (Green)
├─ Prediction: "safe"
├─ Threat Level: "low"
├─ Action: Allow page load
└─ Notification: "✅ Site looks safe"

PHISHING (Orange)
├─ Prediction: "phishing"
├─ Threat Level: "medium"
├─ Action: Show warning
└─ Notification: "⚠️ Phishing risk detected"

MALICIOUS (Red)
├─ Prediction: "malicious"
├─ Threat Level: "high"
├─ Action: Block (close tab)
└─ Notification: "🚨 Malicious site blocked"
```

---

## Demo Mode vs Production Mode

```
DEMO MODE (Current)
├─ ML Model Files: NOT PRESENT
├─ Predictions: RANDOM (safe/phishing/malicious)
├─ Accuracy: ~33% (random chance)
├─ Use: Testing + Development
├─ Status: FULLY FUNCTIONAL
└─ How to identify:
   ├─ See console: "⚠️ Model files not available"
   └─ Predictions vary randomly

PRODUCTION MODE (When Ready)
├─ ML Model Files: model.pkl, scaler.pkl, label_encoder.pkl
├─ Predictions: REAL ML MODEL
├─ Accuracy: ~85-90% (depending on model)
├─ Use: Live deployment
├─ Status: REQUIRES MODEL FILES
└─ How to enable:
   ├─ Add model files to backend/
   └─ Restart Flask server
```

---

**System Architecture Complete! Ready for testing and deployment. 🚀**
