# 🛡️ Cyber Guard - URL Threat Detection System

A machine learning-based URL threat detection application with secure user authentication, real-time scanning, and user-linked history management.

## 🌟 Features

- **Machine Learning Detection**: ML-powered URL threat classification (safe/phishing/malicious)
- **Secure Authentication**: 
  - User registration and login with password hashing (PBKDF2)
  - JWT token-based authentication (24-hour expiration)
  - Session persistence across pages
- **User-Linked History**: Each user's scan history is stored separately and encrypted
- **Real-time Analysis**: Instant threat detection with detailed classification
- **Responsive UI**: Works seamlessly on desktop and mobile devices
- **Dark Mode**: Toggle between light and dark themes
- **Browser Extension**: Additional protection with browser extension integration

## 🏗️ Project Structure

```
Cyber Guard/
├── backend/
│   ├── app.py              # Flask backend with authentication & ML prediction
│   ├── requirements.txt    # Python dependencies
│   ├── model.pkl          # ML model (not included in repo)
│   ├── scaler.pkl         # Feature scaler (not included in repo)
│   └── label_encoder.pkl  # Label encoder (not included in repo)
├── frontend/
│   ├── index.html         # Landing page
│   ├── login.html         # Login page
│   ├── signup.html        # Registration page
│   ├── history.html       # User scan history
│   ├── about.html         # About page
│   ├── download.html      # Extension download page
│   ├── script.js          # Frontend logic with JWT auth
│   └── style.css          # Global styles
├── Extension/
│   ├── manifest.json      # Chrome extension config
│   ├── background.js      # Extension background script
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Extension popup logic
│   └── warning.html       # Threat warning page
├── cyber_guard.db         # SQLite database (auto-created)
└── README.md             # This file
```

## 🔐 Security Features

- **Password Security**: Passwords hashed with PBKDF2, never stored in plain text
- **JWT Authentication**: Secure token-based API authentication
- **Database**: SQLite with encrypted user data and scan history
- **CORS**: Cross-origin requests properly configured
- **Token Expiration**: 24-hour token expiration for security
- **User Isolation**: Users only see their own scan history

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js (for extension development, optional)
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/cyber-guard.git
cd cyber-guard
```

2. **Create virtual environment**
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

3. **Install backend dependencies**
```bash
cd backend
pip install -r requirements.txt
cd ..
```

4. **Start the backend server**
```bash
python backend/app.py
```
Server runs on `http://localhost:5000`

5. **Open in browser**
- Frontend: `http://localhost:5000`
- Signup: `http://localhost:5000/signup.html`
- Login: `http://localhost:5000/login.html`

## 📝 Usage

### Create Account
1. Go to `/signup.html`
2. Enter username (min 3 chars), email, and password (min 8 chars)
3. Click "Sign up"

### Login
1. Go to `/login.html`
2. Enter your username and password
3. Click "Log in"

### Scan URLs
1. Enter a URL in the input field
2. Click "Check URL"
3. View detailed threat analysis
4. Scan is automatically saved to your history

### View History
1. Click "View History" button
2. See all your previous scans
3. Delete scan records as needed

### Logout
1. Click your username button in the top right
2. Click "Log out"

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/verify` - Verify token validity

### URL Analysis
- `POST /predict` - Analyze URL threat level (requires JWT)

### History
- `GET /api/history` - Get user's scan history (requires JWT)
- `POST /api/history` - Add scan to history (requires JWT)
- `DELETE /api/history/<id>` - Delete history item (requires JWT)

## 🛠️ Tech Stack

### Backend
- **Flask**: Web framework
- **SQLite**: Database
- **scikit-learn**: ML model
- **joblib**: Model persistence
- **PyJWT**: Token authentication
- **werkzeug**: Password hashing

### Frontend
- **HTML5**: Markup
- **CSS3**: Styling with CSS variables
- **Vanilla JavaScript**: No frameworks
- **LocalStorage**: Client-side authentication token storage

### Extension
- **Chrome Extension API**: Browser integration
- **Manifest V3**: Latest extension standard

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Scan History Table
```sql
CREATE TABLE scan_history (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    status TEXT,
    threat_level TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🔄 Authentication Flow

1. **Registration**: User submits credentials → Password hashed with PBKDF2 → User stored in database → JWT token generated
2. **Login**: User submits credentials → Password verified against hash → JWT token generated → Token stored in localStorage
3. **API Calls**: Each request includes `Authorization: Bearer <token>` header
4. **Token Verification**: Server validates token signature and expiration
5. **Logout**: Token removed from localStorage → User redirected to login

## 🎨 Theme System

The application supports light and dark themes with CSS variables:
- **Light Theme**: Bright purple gradient background, dark text
- **Dark Theme**: Dark background, light text
- **Persistent**: Theme preference stored in localStorage
- **Toggle**: Dark mode button in navigation bar

## 🐛 Demo Mode

If ML model files (model.pkl, scaler.pkl, label_encoder.pkl) are not found:
- System runs in demo mode
- URL predictions are randomly generated
- All authentication features work normally
- Suitable for testing without ML dependencies

## 📦 Requirements

See `backend/requirements.txt`:
```
Flask==2.3.0
Flask-CORS==4.0.0
scikit-learn==1.3.0
numpy==1.24.0
joblib==1.3.0
PyJWT==2.8.0
```

## 🚢 Production Deployment

For production deployment:

1. **Use HTTPS**: Required for secure token transmission
2. **Update SECRET_KEY**: Change in `app.py`
3. **Use production WSGI**: gunicorn or uWSGI instead of Flask dev server
4. **Database**: Consider PostgreSQL instead of SQLite
5. **Environment variables**: Use .env file for secrets
6. **Rate limiting**: Add rate limiting on auth endpoints
7. **CORS**: Restrict CORS to your domain

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for cybersecurity**
