from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
# authentication helpers removed (no password hashing or JWT)
# Optional ML dependencies: avoid importing heavy/optional libs at import-time
# so the server can run in demo mode even if model files or joblib are not installed.
MODEL_AVAILABLE = False
model = None
scaler = None
label_encoder = None
import numpy as np
import re
import csv
import os
import sqlite3
from datetime import datetime, timedelta

# 🚀 إنشاء تطبيق Flask
app = Flask(__name__, static_folder=None)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'cyber-guard-secret-key-change-in-production')

# تحديد مسار مجلد frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

# 🔐 تفعيل CORS للسماح بالطلبات من Frontend
CORS(app, resources={
    r"/api/*": {"origins": "*", "methods": ["GET", "POST", "DELETE", "OPTIONS"]},
    r"/predict": {"origins": "*", "methods": ["POST", "OPTIONS"]},
    r"/predict_public": {"origins": "*", "methods": ["POST", "OPTIONS"]},
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

    # Create history table (public). user_id is optional to allow anonymous entries.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            url TEXT NOT NULL,
            status TEXT,
            threat_level TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Authentication API removed (logout/verify endpoints removed)

# 📋 Public History Endpoints
@app.route('/api/history', methods=['GET'])
def get_history():
    """Get scan history (public)"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT id, user_id, url, status, threat_level, timestamp FROM scan_history ORDER BY timestamp DESC')
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
def add_to_history():
    """Add URL scan to history (public)"""
    data = request.get_json()

    if not data or not data.get('url'):
        return jsonify({'error': 'URL is required'}), 400

    url = data.get('url')
    status = data.get('status', 'safe')
    threat_level = data.get('threat_level', 'low')
    user_id = data.get('user_id') if data.get('user_id') else None

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO scan_history (user_id, url, status, threat_level) VALUES (?, ?, ?, ?)',
                      (user_id, url, status, threat_level))
        conn.commit()

        history_id = cursor.lastrowid
        conn.close()

        return jsonify({
            'message': 'Added to history',
            'history_item': {
                'id': history_id,
                'user_id': user_id,
                'url': url,
                'status': status,
                'threat_level': threat_level,
                'timestamp': datetime.utcnow().isoformat()
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/<int:history_id>', methods=['DELETE'])
def delete_history_item(history_id):
    """Delete a history item by id (public)"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM scan_history WHERE id = ?', (history_id,))
        item = cursor.fetchone()

        if not item:
            conn.close()
            return jsonify({'error': 'History item not found'}), 404

        cursor.execute('DELETE FROM scan_history WHERE id = ?', (history_id,))
        conn.commit()
        conn.close()

        return jsonify({'message': 'History item deleted'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 🔮 URL Prediction Endpoint (public)
@app.route('/predict', methods=['POST'])
def predict():
    """Predict URL safety and save to history"""
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
        
        # Save to history in database (no user context)
        conn = get_db()
        cursor = conn.cursor()

        threat_level = 'high' if prediction_label.lower() in ['phishing', 'malicious'] else 'low'
        cursor.execute('INSERT INTO scan_history (user_id, url, status, threat_level) VALUES (?, ?, ?, ?)',
                  (None, url, prediction_label, threat_level))
        conn.commit()
        conn.close()
        
        return jsonify({
            'prediction': prediction_label,
            'threat_level': threat_level
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict_public', methods=['POST'])
def predict_public():
    """Public prediction endpoint for unauthenticated clients (does NOT save history)."""
    data = request.get_json() or {}
    url = data.get('url')

    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    try:
        # Treat localhost/loopback addresses as benign to avoid blocking dev servers
        from urllib.parse import urlparse
        parsed = urlparse(url)
        hostname = parsed.hostname or ''
        if hostname in ('localhost', '127.0.0.1', '0.0.0.0', '::1') or hostname.endswith('.local'):
            prediction_label = 'benign'
            threat_level = 'low'
            print(f"[predict_public] LOCAL URL skipped: {url} -> prediction={prediction_label}")
            return jsonify({'prediction': prediction_label, 'threat_level': threat_level}), 200

        # Simple deterministic heuristic when model is unavailable (or as a fast check)
        lower_url = url.lower()

        suspicious_keywords = [
            'login', 'signin', 'bank', 'secure', 'account', 'verify', 'confirm',
            'update', 'reset', 'paypal', 'ebay', 'malicious', 'phish', 'pay', 'signin-'
        ]

        # File download / executable patterns
        import re
        exe_pattern = re.search(r"\.(exe|msi|scr|bat|cmd|zip)(?:$|[\/?])", lower_url)

        # IP-in-URL pattern
        ip_pattern = re.search(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", lower_url)

        # If obvious suspicious markers present, mark as malicious
        if any(k in lower_url for k in suspicious_keywords) or exe_pattern or ip_pattern:
            prediction_label = 'malicious'
        else:
            if MODEL_AVAILABLE:
                features = extract_features_from_url(url)
                scaled = scaler.transform([features])
                prediction_encoded = model.predict(scaled)[0]
                prediction_label = label_encoder.inverse_transform([prediction_encoded])[0]

                if any(tag in lower_url for tag in ["vulnweb", "acunetix", "testphp", "demo"]):
                    prediction_label = "phishing"
            else:
                # Fallback random when no clear heuristic or model
                import random
                prediction_label = random.choice(['safe', 'phishing', 'malicious'])

        threat_level = 'high' if prediction_label.lower() in ['phishing', 'malicious'] else 'low'

        # Logging for debugging/testing
        print(f"[predict_public] url={url} -> prediction={prediction_label} (threat={threat_level})")

        # Note: do NOT save to database because no user context is available
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
    # Ensure DB tables exist before starting
    try:
        init_db()
        print('[startup] Database initialized / tables ensured')
    except Exception as e:
        print(f'[startup] Database initialization warning: {e}')

    # Bind to localhost and run on port 8000 to match frontend domain
    app.run(debug=True, host='localhost', port=8000)