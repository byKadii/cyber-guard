# Cyber Guard 🛡️

**Machine Learning Based Detection of Malicious URLs**

Cyber Guard is a comprehensive cybersecurity solution that uses machine learning to detect and warn users about malicious, phishing, and suspicious URLs in real-time.

![Cyber Guard](frontend/icon.png)

## Features

- **Real-time URL Scanning** - Instantly analyze any URL for potential threats
- **Machine Learning Detection** - Trained ML model for accurate threat classification
- **Browser Extension** - Chrome extension for automatic protection while browsing
- **Scan History** - Track and review all scanned URLs
- **Dark Mode Support** - Modern UI with light/dark theme toggle
- **Responsive Design** - Works on desktop and mobile devices

## Project Structure

```
cyber-guard/
├── backend/                 # Flask API server
│   ├── app.py              # Main Flask application
│   ├── train_model.py      # ML model training script
│   ├── compare_models.py   # Model comparison utilities
│   └── malicious_url.csv   # Training dataset
├── frontend/               # Web interface
│   ├── index.html          # Home page
│   ├── history.html        # Scan history page
│   ├── download.html       # Extension download page
│   ├── about.html          # About page
│   ├── login.html          # Login page
│   ├── signup.html         # Signup page
│   ├── script.js           # Frontend JavaScript
│   └── style.css           # Styles
├── Extension/              # Chrome browser extension
│   ├── manifest.json       # Extension manifest (v3)
│   ├── background.js       # Service worker
│   ├── popup.html          # Extension popup
│   ├── popup.js            # Popup logic
│   └── warning.html        # Threat warning page
└── README.md
```

## Tech Stack

- **Backend**: Python, Flask, SQLite
- **Frontend**: HTML5, CSS3, JavaScript
- **ML**: scikit-learn, joblib
- **Extension**: Chrome Extension Manifest V3

## Installation

### Prerequisites

- Python 3.8+
- pip
- Google Chrome (for extension)

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/byKadii/cyber-guard.git
   cd cyber-guard
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install flask flask-cors numpy scikit-learn joblib
   ```

4. Run the server:
   ```bash
   cd backend
   python app.py
   ```

   The server will start at `http://localhost:8000`

### Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `Extension` folder from this project
5. The Cyber Guard extension icon will appear in your toolbar

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/predict` | POST | Predict URL safety (saves to history) |
| `/predict_public` | POST | Public prediction (no history) |
| `/api/history` | GET | Get scan history |
| `/api/history` | POST | Add to scan history |
| `/api/history/<id>` | DELETE | Delete history item |
| `/api/history/clear` | DELETE | Clear all history |

### Example Request

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Response

```json
{
  "prediction": "benign",
  "threat_level": "low"
}
```

## URL Classification

The ML model classifies URLs into three categories:

| Classification | Threat Level | Description |
|----------------|--------------|-------------|
| **Benign** | Low | Safe URL |
| **Phishing** | High | Suspected phishing attempt |
| **Malicious** | High | Known malicious URL |

## Features Extracted for ML

The model analyzes 14 features from each URL:
- URL length
- Number of dots
- Special characters count
- IP address presence
- HTTPS usage
- Path segments count
- Encoding patterns
- Digit count
- Uppercase characters
- Domain length
- Subdomain count
- Port presence
- Query string length
- Suspicious keywords

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

- **GitHub**: [@byKadii](https://github.com/byKadii)
- **Project Link**: [https://github.com/byKadii/cyber-guard](https://github.com/byKadii/cyber-guard)

---

© 2025 Cyber Guard. All rights reserved.
