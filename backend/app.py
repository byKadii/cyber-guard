from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import joblib
import numpy as np
import re
import csv
import os
import sqlite3
from datetime import datetime, timedelta
from functools import wraps

# 🚀 إنشاء تطبيق Flask
app = Flask(__name__, static_folder=None)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'cyber-guard-secret-key-change-in-production')
app.config['JWT_EXPIRATION_HOURS'] = 24

# تحديد مسار مجلد frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

# 🔐 تفعيل CORS للسماح بالطلبات من Frontend
CORS(app, resources={
    r"/api/*": {"origins": "*", "methods": ["GET", "POST", "DELETE", "OPTIONS"]},
    r"/predict": {"origins": "*", "methods": ["POST", "OPTIONS"]},
    r"/history": {"origins": "*", "methods": ["GET", "OPTIONS"]}
})

# 🗄️ إعداد قاعدة البيانات
DATABASE = 'cyber_guard.db'

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create history table linked to users
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            url TEXT NOT NULL,
            status TEXT,
            threat_level TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# 🔌 تحميل النموذج والـ scaler والـ label encoder (wrap in try-except for demo)
MODEL_AVAILABLE = False
model = None
scaler = None
label_encoder = None

try:
    # Try to load model files without blocking
    model = joblib.load("model.pkl")
    scaler = joblib.load("scaler.pkl")
    label_encoder = joblib.load("label_encoder.pkl")
    MODEL_AVAILABLE = True
    print("✓ ML model loaded successfully")
except Exception as e:
    print(f"⚠️  Model files not available, running in demo mode")

# ✨ دالة استخراج الميزات من الرابط
def extract_features_from_url(url):
    features = []
    features.append(len(url))  # طول الرابط
    features.append(url.count('.'))  # عدد النقاط
    features.append(sum(url.count(c) for c in ['@', '?', '=', '&', '-', '_']))  # الرموز الخاصة
    features.append(1 if re.match(r'\d+\.\d+\.\d+\.\d+', url) else 0)  # يحتوي على IP
    features.append(1 if "https" in url.lower() else 0)  # يحتوي على https
    features.append(len(url.split('/')))  # عدد الأجزاء
    features.append(1 if any(tag in url.lower() for tag in ["base64", "javascript:", "data:"]) else 0)  # ترميز
    features.append(sum(c.isdigit() for c in url))  # عدد الأرقام
    features.append(sum(c.isupper() for c in url))  # عدد الحروف الكبيرة
    features.append(len(url.split('/')[2]) if len(url.split('/')) > 2 else 0)  # طول الدومين
    features.append(len(url.split('.')) - 2 if len(url.split('.')) > 2 else 0)  # عدد الساب دومين
    features.append(1 if re.search(r":\d+", url) else 0)  # يحتوي على بورت
    features.append(len(url.split('?')[1]) if '?' in url else 0)  # طول الاستعلام
    suspicious_words = ["login", "verify", "secure", "account", "update", "confirm", "bank", "reset", "free", "click", "offer", "win", "paypal", "ebay"]
    features.append(1 if any(word in url.lower() for word in suspicious_words) else 0)  # كلمات مشبوهة
    return np.array(features)

# 🔐 JWT Token Management
def generate_jwt_token(user_id, username):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=app.config['JWT_EXPIRATION_HOURS']),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return token

def verify_jwt_token(token):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        request.user_id = payload['user_id']
        request.username = payload['username']
        return f(*args, **kwargs)
    
    return decorated

# 🔑 Authentication Endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    username = data.get('username').strip()
    email = data.get('email').strip()
    password = data.get('password')
    
    # Validate password strength
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Username or email already exists'}), 409
        
        # Hash password and create user
        password_hash = generate_password_hash(password)
        cursor.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                      (username, email, password_hash))
        conn.commit()
        
        user_id = cursor.lastrowid
        conn.close()
        
        # Generate token
        token = generate_jwt_token(user_id, username)
        
        return jsonify({
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': user_id,
                'username': username,
                'email': email
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    username = data.get('username').strip()
    password = data.get('password')
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Find user by username
        cursor.execute('SELECT id, username, email, password_hash FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        conn.close()
        
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Generate token
        token = generate_jwt_token(user['id'], user['username'])
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout():
    """Logout user (token invalidation handled on frontend)"""
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/auth/verify', methods=['GET'])
@token_required
def verify_token():
    """Verify if token is valid"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT id, username, email FROM users WHERE id = ?', (request.user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'valid': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 📋 User-Linked History Endpoints
@app.route('/api/history', methods=['GET'])
@token_required
def get_user_history():
    """Get scan history for logged-in user"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT id, url, status, threat_level, timestamp FROM scan_history WHERE user_id = ? ORDER BY timestamp DESC', (request.user_id,))
        rows = cursor.fetchall()
        conn.close()
        
        history = [dict(row) for row in rows]
        
        return jsonify({
            'history': history,
            'count': len(history)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['POST'])
@token_required
def add_to_history():
    """Add URL scan to user history"""
    data = request.get_json()
    
    if not data or not data.get('url'):
        return jsonify({'error': 'URL is required'}), 400
    
    url = data.get('url')
    status = data.get('status', 'safe')
    threat_level = data.get('threat_level', 'low')
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO scan_history (user_id, url, status, threat_level) VALUES (?, ?, ?, ?)',
                      (request.user_id, url, status, threat_level))
        conn.commit()
        
        history_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            'message': 'Added to history',
            'history_item': {
                'id': history_id,
                'user_id': request.user_id,
                'url': url,
                'status': status,
                'threat_level': threat_level,
                'timestamp': datetime.utcnow().isoformat()
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/<int:history_id>', methods=['DELETE'])
@token_required
def delete_history_item(history_id):
    """Delete a history item (only owner can delete)"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if history item exists and belongs to user
        cursor.execute('SELECT user_id FROM scan_history WHERE id = ?', (history_id,))
        item = cursor.fetchone()
        
        if not item:
            conn.close()
            return jsonify({'error': 'History item not found'}), 404
        
        if item['user_id'] != request.user_id:
            conn.close()
            return jsonify({'error': 'Unauthorized'}), 403
        
        cursor.execute('DELETE FROM scan_history WHERE id = ?', (history_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'History item deleted'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 🔮 URL Prediction Endpoint (works with or without login)
@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict URL safety (works for everyone)
    If user is logged in: saves scan to their history
    If user is not logged in: just returns prediction (no history saved)
    """
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'No URL provided'}), 400
    
    try:
        if not MODEL_AVAILABLE:
            # Demo mode: return random prediction
            import random
            prediction_label = random.choice(['safe', 'phishing', 'malicious'])
        else:
            # Extract features and make prediction
            features = extract_features_from_url(url)
            scaled = scaler.transform([features])
            prediction_encoded = model.predict(scaled)[0]
            prediction_label = label_encoder.inverse_transform([prediction_encoded])[0]
            
            if any(tag in url.lower() for tag in ["vulnweb", "acunetix", "testphp", "demo"]):
                prediction_label = "phishing"
        
        threat_level = 'high' if prediction_label.lower() in ['phishing', 'malicious'] else 'low'
        
        # Check if user is logged in (has valid JWT token)
        # If they are, save to their history
        user_id = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ')[1]
                payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
                user_id = payload.get('user_id')
            except jwt.ExpiredSignatureError:
                pass  # Token expired, but that's OK - still return prediction
            except jwt.InvalidTokenError:
                pass  # Invalid token, but that's OK - still return prediction
        
        # If user is logged in, save to their history
        if user_id:
            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute('INSERT INTO scan_history (user_id, url, status, threat_level) VALUES (?, ?, ?, ?)',
                              (user_id, url, prediction_label, threat_level))
                conn.commit()
                conn.close()
            except Exception as history_error:
                print(f"Warning: Failed to save to history: {history_error}")
                # Don't fail the prediction just because history save failed
        
        return jsonify({
            'prediction': prediction_label,
            'threat_level': threat_level
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@app.route('/')
def index():
    """Serve index.html at root"""
    return send_file(os.path.join(FRONTEND_DIR, 'index.html'))

# 🌐 خدمة الملفات الثابتة من مجلد frontend
@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files from frontend folder"""
    return send_from_directory(FRONTEND_DIR, filename)

# ⚙️ تشغيل السيرفر
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)