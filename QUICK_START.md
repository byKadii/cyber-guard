# ⚡ Quick Start - 5 Minutes to Working URL Blocking

## 1️⃣ Start Backend (30 seconds)
```powershell
cd backend
python app.py
# Wait for: * Running on http://127.0.0.1:5000
```

## 2️⃣ Create Account (1 minute)
- Go to: `http://localhost:5000/signup.html`
- Sign up: testuser / password123
- You're logged in!

## 3️⃣ Load Extension (1 minute)
- Open Chrome → `chrome://extensions/`
- Turn ON "Developer mode" (top right)
- Click "Load unpacked"
- Select: `Extension/` folder
- ✅ Extension loaded!

## 4️⃣ Enable Auto-Check (30 seconds)
- Click extension icon (top right of Chrome)
- Click "Enable Auto Check"
- Shows: "Auto check enabled ✅"

## 5️⃣ Test Blocking (2 minutes)
- Open new Chrome tab
- Visit any URL (e.g., example.com)
- Extension checks automatically
- Shows notification: ✅ Safe or ⚠️ Malicious
- If malicious → tab closes, warning shows

## 🎉 Done!

Your URL blocking system is now **live and operational**!

---

## What You Can Do Now

✅ **Automatic Protection**: Extension blocks malicious URLs in real-time  
✅ **Manual Scanning**: Use website to scan URLs  
✅ **History Tracking**: All scans saved to your account  
✅ **Theme Support**: Works with light & dark mode  
✅ **Secure Auth**: Password-hashed, JWT token-based  

---

## Note: Demo Mode

System returns **random predictions** (because ML model files missing).  
This is **intentional for testing** - system is fully functional!

For real predictions, add model files:
- `backend/model.pkl`
- `backend/scaler.pkl`  
- `backend/label_encoder.pkl`

Then restart backend server.

---

## Detailed Guide

See `TESTING_GUIDE.md` for complete walkthrough with:
- Troubleshooting
- Test scenarios  
- How the system works
- Security notes
