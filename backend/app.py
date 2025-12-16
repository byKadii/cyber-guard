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
from datetime import datetime, timedelta, timezone
import traceback
import time
import threading
import queue
import json

# Paths
BASE_DIR = os.path.dirname(__file__)
CLASSIFIED_HISTORY_CSV = os.path.join(BASE_DIR, 'classified_history.csv')
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

# Shared database connection - created once and reused
_shared_db_conn = None
_shared_db_lock = threading.Lock()

def get_db():
    """Get shared database connection (thread-safe with lock)"""
    global _shared_db_conn
    with _shared_db_lock:
        if _shared_db_conn is None:
            _shared_db_conn = sqlite3.connect(DATABASE, timeout=60, check_same_thread=False)
            _shared_db_conn.row_factory = sqlite3.Row
            try:
                # Use WAL mode for better concurrency
                _shared_db_conn.execute('PRAGMA journal_mode=WAL;')
                _shared_db_conn.execute('PRAGMA busy_timeout=30000;')
                _shared_db_conn.execute('PRAGMA synchronous=NORMAL;')
            except Exception:
                pass
        return _shared_db_conn

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

# Global lock to serialize DB writes and avoid SQLITE_LOCKED when multiple threads/processes
DB_WRITE_LOCK = threading.Lock()

# Queue and background writer to serialize DB writes from all request handlers
HISTORY_WRITE_QUEUE = queue.Queue()
QUEUE_FILE = os.path.join(BASE_DIR, 'history_queue.jsonl')


def history_writer():
    """Background worker that consumes history write tasks and writes to SQLite sequentially."""
    print('[history_writer] starting background history writer thread')
    while True:
        try:
            task = HISTORY_WRITE_QUEUE.get()
            if task is None:
                # sentinel to stop the worker (not used in normal operation)
                break
            # task is a dict: {url, status, threat_level, user_id}
            url = task.get('url')
            status = task.get('status', 'safe')
            threat_level = task.get('threat_level', 'low')
            user_id = task.get('user_id', 0)

            # attempt write with lock and retries
            attempts = 10
            for attempt in range(attempts):
                try:
                    with DB_WRITE_LOCK:
                        conn = get_db()
                        cursor = conn.cursor()
                        # Store timestamp in ISO format with timezone
                        timestamp = datetime.now(timezone.utc).isoformat()
                        cursor.execute('INSERT INTO scan_history (user_id, url, status, threat_level, timestamp) VALUES (?, ?, ?, ?, ?)',
                                      (user_id, url, status, threat_level, timestamp))
                        conn.commit()
                        print(f"[history_writer] wrote history url={url} user_id={user_id}")
                    break
                except sqlite3.OperationalError as db_err:
                    print(f"[history_writer] DB write attempt {attempt+1} failed: {db_err}")
                    # exponential backoff with jitter
                    time.sleep(min(0.1 * (2 ** attempt) + 0.05 * attempt, 2.0))
                    continue
                except Exception as e:
                    print(f"[history_writer] unexpected error: {e}")
                    time.sleep(0.5)
                    continue
            else:
                # All attempts failed — persist the task to disk for later flushing
                try:
                    with open(QUEUE_FILE, 'a', encoding='utf-8') as qf:
                        qf.write(json.dumps(task, ensure_ascii=False) + "\n")
                    print(f"[history_writer] persisted task to {QUEUE_FILE} for url={url}")
                except Exception as e:
                    print(f"[history_writer] failed to persist task to disk: {e}")
        except Exception as outer:
            print(f"[history_writer] worker loop error: {outer}")
            time.sleep(0.5)


def flush_disk_queue_once():
    """Attempt to flush persisted queue file entries into the DB."""
    if not os.path.exists(QUEUE_FILE):
        return
    try:
        with open(QUEUE_FILE, 'r', encoding='utf-8') as fh:
            lines = [l.strip() for l in fh.readlines() if l.strip()]
    except Exception as e:
        print(f"[queue_flusher] failed to read {QUEUE_FILE}: {e}")
        return

    if not lines:
        try:
            os.remove(QUEUE_FILE)
        except Exception:
            pass
        return

    remaining = []
    for ln in lines:
        try:
            task = json.loads(ln)
            # try to write with retries
            written = False
            for attempt in range(5):
                try:
                    with DB_WRITE_LOCK:
                        conn = get_db()
                        cursor = conn.cursor()
                        cursor.execute('INSERT INTO scan_history (user_id, url, status, threat_level) VALUES (?, ?, ?, ?)',
                                      (task.get('user_id', 0), task.get('url'), task.get('status', 'safe'), task.get('threat_level', 'low')))
                        conn.commit()
                        print(f"[queue_flusher] flushed queued url={task.get('url')}")
                    written = True
                    break
                except sqlite3.OperationalError as db_err:
                    print(f"[queue_flusher] DB write attempt {attempt+1} failed: {db_err}")
                    time.sleep(0.1 * (attempt + 1))
                    continue
            if not written:
                remaining.append(ln)
        except Exception as e:
            print(f"[queue_flusher] skipped corrupted queue line: {e}")

    # rewrite remaining
    try:
        if remaining:
            with open(QUEUE_FILE, 'w', encoding='utf-8') as fh:
                fh.write('\n'.join(remaining) + '\n')
        else:
            os.remove(QUEUE_FILE)
    except Exception as e:
        print(f"[queue_flusher] failed to update queue file: {e}")


def queue_flusher_loop(interval_seconds=5):
    print('[queue_flusher] starting queue flusher thread')
    while True:
        try:
            flush_disk_queue_once()
        except Exception as e:
            print(f"[queue_flusher] error: {e}")
        time.sleep(interval_seconds)


def load_model_files():
    """Attempt to load pretrained model, scaler and label encoder from disk."""
    global MODEL_AVAILABLE, model, scaler, label_encoder
    model = None
    scaler = None
    label_encoder = None

    try:
        import joblib
    except Exception:
        print('[startup] joblib not available; running in demo mode')
        MODEL_AVAILABLE = False
        return

    # possible model filenames saved by training scripts
    model_candidates = [
        os.path.join(BASE_DIR, 'model.pkl'),
        os.path.join(BASE_DIR, 'best_model.pkl'),
    ]

    for p in model_candidates:
        if os.path.exists(p):
            try:
                model = joblib.load(p)
                print(f'[startup] Loaded model from {p}')
                break
            except Exception as e:
                print(f'[startup] Failed loading model {p}: {e}')

    scaler_path = os.path.join(BASE_DIR, 'scaler.pkl')
    le_path = os.path.join(BASE_DIR, 'label_encoder.pkl')

    if model is None:
        MODEL_AVAILABLE = False
        print('[startup] No model file found; running in demo mode')
        return

    try:
        scaler = joblib.load(scaler_path)
        print(f'[startup] Loaded scaler from {scaler_path}')
    except Exception as e:
        print(f'[startup] Failed loading scaler: {e}')
        MODEL_AVAILABLE = False
        return

    try:
        label_encoder = joblib.load(le_path)
        print(f'[startup] Loaded label encoder from {le_path}')
    except Exception as e:
        print(f'[startup] Failed loading label encoder: {e}')
        MODEL_AVAILABLE = False
        return

    MODEL_AVAILABLE = True


def extract_features_from_url(url: str):
    """Extract numeric features from a single URL in the same order used for training.

    Order: url_length, num_dots, num_special_chars, has_ip, has_https, num_parts,
    has_encoding, num_digits, num_uppercase, domain_length, num_subdomains,
    has_port, query_length, suspicious_words
    """
    try:
        u = str(url)
    except Exception:
        u = ''

    url_length = len(u)
    num_dots = u.count('.')
    num_special_chars = sum(u.count(c) for c in ['@', '?', '=', '&', '-', '_'])
    has_ip = 1 if re.search(r'\b\d{1,3}(?:\.\d{1,3}){3}\b', u) else 0
    has_https = 1 if 'https' in u.lower() else 0
    num_parts = len(u.split('/'))
    has_encoding = 1 if any(tag in u.lower() for tag in ['base64', 'javascript:', 'data:']) else 0
    num_digits = sum(c.isdigit() for c in u)
    num_uppercase = sum(c.isupper() for c in u)
    domain_length = 0
    parts = u.split('/')
    if len(parts) > 2:
        domain = parts[2]
        domain_length = len(domain)
    num_subdomains = len(u.split('.')) - 2 if len(u.split('.')) > 2 else 0
    has_port = 1 if re.search(r':\d+', u) else 0
    query_length = len(u.split('?')[1]) if '?' in u else 0
    suspicious_words = ["login", "verify", "secure", "account", "update", "confirm", "bank", "reset", "free", "click", "offer", "win", "paypal", "ebay"]
    suspicious_words_flag = 1 if any(word in u.lower() for word in suspicious_words) else 0

    return [
        url_length,
        num_dots,
        num_special_chars,
        int(bool(has_ip)),
        int(bool(has_https)),
        num_parts,
        int(bool(has_encoding)),
        num_digits,
        num_uppercase,
        domain_length,
        num_subdomains,
        int(bool(has_port)),
        query_length,
        suspicious_words_flag,
    ]


def append_to_classified_history(timestamp: str, url: str, label: str):
    """Append a detection to the CSV `classified_history.csv`.

    CSV format: timestamp,url,label
    """
    try:
        header_needed = not os.path.exists(CLASSIFIED_HISTORY_CSV)
        with open(CLASSIFIED_HISTORY_CSV, 'a', newline='', encoding='utf-8') as fh:
            writer = csv.writer(fh)
            if header_needed:
                # keep existing file format (no header) so write only rows
                pass
            writer.writerow([timestamp, url, label])
    except Exception as e:
        print(f'[classified_history] Failed to append: {e}')
# Authentication API removed (logout/verify endpoints removed)

# 📋 Public History Endpoints
@app.route('/api/history', methods=['GET'])
def get_history():
    """Get scan history (public)"""
    try:
        attempts = 5
        rows = []
        for attempt in range(attempts):
            try:
                with DB_WRITE_LOCK:
                    conn = get_db()
                    cursor = conn.cursor()
                    cursor.execute('SELECT id, user_id, url, status, threat_level, timestamp FROM scan_history ORDER BY timestamp DESC')
                    rows = cursor.fetchall()
                print(f"[api/history GET] fetched {len(rows)} rows")
                break
            except sqlite3.OperationalError as db_err:
                print(f"[api/history GET] attempt {attempt+1} failed: {db_err}")
                if attempt < attempts - 1 and 'locked' in str(db_err).lower():
                    time.sleep(0.1 * (attempt + 1))
                    continue
                else:
                    raise

        history = [dict(row) for row in rows]
        print(f"[api/history GET] returning {len(history)} items")

        return jsonify({ 'history': history, 'count': len(history) }), 200

    except Exception as e:
        print(f"[api/history GET] EXCEPTION: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['POST'])
def add_to_history():
    """Add URL scan to history (public)"""
    data = request.get_json()
    print(f"[api/history POST] received data: {data}")

    if not data or not data.get('url'):
        print("[api/history POST] ERROR: No URL provided")
        return jsonify({'error': 'URL is required'}), 400

    url = data.get('url')
    status = data.get('status', 'safe')
    threat_level = data.get('threat_level', 'low')
    # Some older DB schemas require user_id NOT NULL; use 0 as fallback when not provided
    user_id = data.get('user_id', 0)
    
    print(f"[api/history POST] saving: url={url}, status={status}, threat_level={threat_level}, user_id={user_id}")

    try:
        # Enqueue the write for background processing to avoid DB locks
        HISTORY_WRITE_QUEUE.put({
            'url': url,
            'status': status,
            'threat_level': threat_level,
            'user_id': user_id
        })
        print(f"[api/history POST] enqueued history for url={url}")
        return jsonify({
            'message': 'Enqueued to history writer',
            'history_item': {
                'id': None,
                'user_id': user_id,
                'url': url,
                'status': status,
                'threat_level': threat_level,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        }), 201
    except Exception as e:
        print(f"[api/history POST] EXCEPTION: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/clear', methods=['DELETE'])
def clear_all_history():
    """Clear all history items (public)"""
    try:
        with DB_WRITE_LOCK:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('DELETE FROM scan_history')
            conn.commit()
            return jsonify({'message': 'All history cleared'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/<int:history_id>', methods=['DELETE'])
def delete_history_item(history_id):
    """Delete a history item by id (public)"""
    try:
        attempts = 10
        for attempt in range(attempts):
            try:
                # serialize delete to avoid concurrent write locks
                with DB_WRITE_LOCK:
                    conn = get_db()
                    cursor = conn.cursor()

                    cursor.execute('SELECT id FROM scan_history WHERE id = ?', (history_id,))
                    item = cursor.fetchone()

                    if not item:
                        return jsonify({'error': 'History item not found'}), 404

                    cursor.execute('DELETE FROM scan_history WHERE id = ?', (history_id,))
                    conn.commit()
                    return jsonify({'message': 'History item deleted'}), 200
            except sqlite3.OperationalError as db_err:
                if attempt < attempts - 1 and 'locked' in str(db_err).lower():
                    sleep_time = 0.05 * (2 ** attempt)
                    sleep_time = min(sleep_time, 1.0)
                    time.sleep(sleep_time)
                    continue
                else:
                    raise
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 🔮 URL Prediction Endpoint (public)
@app.route('/predict', methods=['POST'])
def predict():
    """Predict URL safety and save to history"""
    data = request.get_json() or {}
    # debug helpers — will print headers and body to server logs if an error occurs
    try:
        print(f"[predict] headers={dict(request.headers)}")
        print(f"[predict] body={data}")
    except Exception:
        pass
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
            prediction_encoded = int(model.predict(scaled)[0])
            prediction_label = label_encoder.inverse_transform([prediction_encoded])[0]
            
            if any(tag in url.lower() for tag in ["vulnweb", "acunetix", "testphp", "demo"]):
                prediction_label = "phishing"
        
        # Save to history in database (no user context) — enqueue to background writer
        threat_level = 'high' if prediction_label.lower() in ['phishing', 'malicious'] else 'low'
        try:
            HISTORY_WRITE_QUEUE.put({
                'url': url,
                'status': prediction_label,
                'threat_level': threat_level,
                'user_id': None
            })
            print(f"[predict] enqueued history write for url={url} prediction={prediction_label}")
        except Exception as write_err:
            print(f'[predict] Warning: failed to enqueue history write: {write_err}')
        # If malicious or phishing, also append to classified_history.csv
        if prediction_label and prediction_label.lower() in ['phishing', 'malicious']:
            append_to_classified_history(datetime.now(timezone.utc).isoformat(), url, prediction_label)
        
        return jsonify({
            'prediction': prediction_label,
            'threat_level': threat_level
        }), 200
        
    except Exception as e:
        traceback.print_exc()
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

        # Prefer the trained model for public predictions when available.
        # If the model is not available or prediction fails, fall back to deterministic heuristics.
        lower_url = url.lower()

        # File download / executable patterns
        import re
        exe_pattern = re.search(r"\.(exe|msi|scr|bat|cmd|zip)(?:$|[\/\?])", lower_url)

        # IP-in-URL pattern
        ip_pattern = re.search(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", lower_url)

        prediction_label = None

        if MODEL_AVAILABLE:
            try:
                features = extract_features_from_url(url)
                scaled = scaler.transform([features])
                prediction_encoded = int(model.predict(scaled)[0])
                prediction_label = label_encoder.inverse_transform([prediction_encoded])[0]
                print(f"[predict_public] MODEL used: url={url} -> prediction={prediction_label}")
                if any(tag in lower_url for tag in ["vulnweb", "acunetix", "testphp", "demo"]):
                    prediction_label = "phishing"
            except Exception as e:
                print(f"[predict_public] model predict failed, falling back to heuristic: {e}")
                prediction_label = None

        # Heuristic fallback when model is unavailable or failed
        if not prediction_label:
            # Check for known test/phishing sites first
            if any(tag in lower_url for tag in ["vulnweb", "acunetix", "testphp", "testasp", "testhtml5"]):
                prediction_label = 'phishing'
            else:
                suspicious_keywords = [
                    'login', 'signin', 'bank', 'secure', 'account', 'verify', 'confirm',
                    'update', 'reset', 'paypal', 'ebay', 'phish', 'pay', 'signin-'
                ]

                if any(k in lower_url for k in suspicious_keywords) or exe_pattern or ip_pattern:
                    prediction_label = 'malicious'
                else:
                    # Conservative default when no clear signal: mark safe
                    prediction_label = 'benign'

        threat_level = 'high' if prediction_label.lower() in ['phishing', 'malicious'] else 'low'

        # Logging for debugging/testing
        print(f"[predict_public] url={url} -> prediction={prediction_label} (threat={threat_level})")

        # If malicious or phishing, append to classified_history.csv (public predictions are still recorded)
        if prediction_label and prediction_label.lower() in ['phishing', 'malicious']:
            append_to_classified_history(datetime.now(timezone.utc).isoformat(), url, prediction_label)

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

    # Attempt to load the pretrained model and preprocessing objects
    try:
        load_model_files()
    except Exception as e:
        print(f'[startup] Model loading raised: {e}')

    # Start background history writer thread
    try:
        writer_thread = threading.Thread(target=history_writer, daemon=True)
        writer_thread.start()
    except Exception as e:
        print(f'[startup] Failed to start history writer: {e}')
    # Start queue flusher thread to retry disk-persisted tasks
    try:
        flusher_thread = threading.Thread(target=queue_flusher_loop, daemon=True)
        flusher_thread.start()
    except Exception as e:
        print(f'[startup] Failed to start queue flusher: {e}')

    # Bind to localhost and run on port 8000 to match frontend domain
    # Disable the auto-reloader to avoid multiple processes accessing SQLite
    app.run(debug=True, use_reloader=False, host='localhost', port=8000)