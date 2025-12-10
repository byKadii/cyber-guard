# Cyber Guard - Machine Learning Based URL Threat Detection

A modern, responsive web application for detecting malicious URLs and protecting users from cybersecurity threats. This is a graduation project built by cybersecurity major students using machine learning algorithms. Built with clean code principles, semantic HTML, and accessible design.

## ⚡ Quick Start

1. Clone or download this repository
2. Open `index.html` in your web browser
3. Start analyzing URLs for threats!

No installation, build process, or server setup required - it just works!

## 🚀 Features

- **Real-time URL Analysis**: Instant URL threat detection using machine learning algorithms
- **Random Forest Algorithm**: Core detection engine trained on Kaggle datasets for high accuracy
- **Blocked URLs History**: View complete log of analyzed URLs with timestamps and classifications
- **Multi-Feature Analysis**: Evaluates URL patterns, domain characteristics, SSL certificates, and behavioral indicators
- **Browser Extension**: Lightweight extension for seamless real-time protection
- **Accessible Interface**: WCAG 2.1 compliant with screen reader support and keyboard navigation
- **Dark Mode Support**: Toggle between light and dark themes with persistent preferences
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **User Authentication**: Login and signup pages with form validation
- **CSV Data Management**: Efficient history storage and data handling

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Python (for machine learning model processing)
- **Machine Learning**: Random Forest Classifier trained on Kaggle datasets
- **Data Storage**: CSV files for history, JSON for configuration, localStorage for user preferences
- **Styling**: CSS Custom Properties (Variables), Flexbox, Grid Layout
- **Icons**: SVG icons with accessibility support
- **Fonts**: Google Fonts (Inter, JetBrains Mono)
- **Browser Support**: Modern browsers with ES6+ support (Chrome, Firefox, Edge, Safari)

## 📁 Project Structure

```
cyberguard-project/
├── index.html              # Homepage with features and statistics
├── history.html            # Blocked URLs history log
├── download.html           # Browser extension download page
├── about.html              # About us page with team information
├── login.html              # User authentication
├── signup.html             # User registration
├── style.css               # Main stylesheet with CSS variables
├── script.js               # Application logic and functionality
├── icon.png                # Application favicon and logo
├── classified_history.csv  # CSV file storing URL analysis history
└── README.md               # Project documentation
```

## 🎨 Design Principles

### Clean Code Architecture
- **Modular JavaScript**: Functions organized by feature with clear separation of concerns
- **Semantic HTML**: Proper use of HTML5 semantic elements and ARIA attributes
- **CSS Organization**: Logical structure with custom properties and utility classes
- **Consistent Naming**: BEM methodology for CSS classes and descriptive function names

### Accessibility Features
- **ARIA Labels**: Comprehensive labeling for screen readers
- **Keyboard Navigation**: Full keyboard support with logical tab order
- **Focus Management**: Clear focus indicators and proper focus handling
- **Semantic Structure**: Proper heading hierarchy and landmark roles
- **Color Contrast**: WCAG AA compliant color combinations

### Performance Optimizations
- **CSS Variables**: Efficient styling with custom properties
- **Minimal Dependencies**: No external frameworks or libraries
- **Optimized Images**: SVG icons for crisp display at any size
- **Efficient JavaScript**: Event delegation and optimized DOM manipulation

## 🔧 Installation & Setup

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, or Safari)
- Python 3.x (optional, for local development server)
- Node.js (optional, for local development server)

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd cyberguard-project
   ```

2. **Open in browser**:
   - Simply open `index.html` in any modern web browser
   - No build process or server required
   - All functionality works directly from the file system

3. **Local development** (recommended):
   - Use a local server for best development experience and to avoid CORS issues:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
   - Then navigate to `http://localhost:8000` in your browser

## 📖 Usage

### URL Threat Detection
1. Navigate to the homepage (`index.html`)
2. Enter a URL in the detection input field (e.g., `https://example.com`)
3. Click "Detect" or press Enter to analyze the URL
4. View real-time analysis results with threat classification
5. Results show:
   - Threat type (Safe, Unsafe, Malicious, Phishing)
   - Threat level (Low, Medium, High, Critical)
   - Analysis duration
   - Detailed threat information

### Viewing Analysis History
1. Navigate to the **History** page
2. View the complete log of analyzed URLs with timestamps and classifications
3. URLs are color-coded: red for malicious/phishing, orange for unsafe, green for safe
4. History is loaded from `classified_history.csv` file
5. Click on any URL to open it in a new tab (use caution with malicious URLs)

### Browser Extension
1. Navigate to the **Download** page
2. Follow the installation steps for your browser
3. The extension provides real-time protection and automatic blocking

### User Authentication
1. Click "Log in" in the navigation bar
2. Use the login page for existing users or signup page for new accounts
3. Form validation provides real-time feedback

### Dark Mode
- Click the moon/sun icon in the navigation bar
- Preference is automatically saved in browser localStorage
- Works across all pages with consistent theming

## 🏗️ Code Architecture

### JavaScript Modules

The application is organized into modular JavaScript components:

#### URL Detection Module
- **Main Function**: `detectUrl()` - Validates input and initiates analysis
- **Threat Analysis**: `analyzeUrlThreats(url)` - Pattern matching and threat detection
- **Progress Management**: `updateProgressBar()` - Real-time progress visualization
- **Result Display**: `displayAnalysisResults()` - Shows analysis results with styling

#### History Management Module
- **Storage**: `saveUrlHistory()` - Saves to localStorage
- **CSV Loading**: Loads from `classified_history.csv` on history page
- **Display**: `showHistory()` - Modal display for browser history
- **Data Format**: JSON structure with URL, result, timestamp, and date

#### Form Validation Module
- **Real-time Validation**: `validateField()` - Input validation with feedback
- **Pattern Matching**: Email, username, and password validation
- **Form Handlers**: `handleLogin()`, `handleSignup()` - Form submission processing

#### Notification System Module
- **Notifications**: `showNotification()` - Toast notifications with animations
- **Types**: Success, error, warning, and info notifications
- **Auto-dismiss**: Configurable display duration with slide animations

#### Dark Mode Module
- **Toggle**: `toggleDarkMode()` - Switches between themes
- **Persistence**: `initializeDarkMode()` - Loads saved preference on page load
- **Storage**: Uses localStorage for cross-page consistency

#### Utility Modules
- **Keyboard Shortcuts**: Focus URL input, submit forms, close modals
- **URL Counter**: Tracks and displays analysis statistics
- **Loading Animations**: Intersection Observer for fade-in effects

### CSS Architecture

#### Custom Properties (Variables)
```css
:root {
  --color-primary: #8a64d6;
  --spacing-md: 1rem;
  --transition-duration: 0.3s;
  /* ... more variables */
}
```

#### Component-Based Structure
- **Navigation**: `.navbar`, `.nav-menu`, `.nav-actions`
- **Buttons**: `.btn--primary`, `.btn--secondary`, `.btn--action`
- **Forms**: `.form-input`, `.form-group`, `.input-box`
- **Cards**: `.feature-card`, `.stat-item`, `.result-box`

#### Responsive Design
- **Mobile-first approach** with progressive enhancement
- **Flexible layouts** using CSS Grid and Flexbox
- **Consistent spacing** with CSS custom properties

## 🧪 Testing

### Manual Testing Checklist
- [ ] History page loads CSV data correctly
- [ ] Dark mode toggle works on all pages
- [ ] Navigation links work correctly
- [ ] Responsive design on different screen sizes
- [ ] Browser compatibility (Chrome, Firefox, Edge)
- [ ] Form validation on login/signup pages

### Accessibility Testing
- [ ] Screen reader navigation
- [ ] Keyboard-only navigation
- [ ] Color contrast validation
- [ ] Focus management
- [ ] ARIA attribute validation

## 🚀 Deployment

### Static Hosting
The application is a static website that can be deployed to any static hosting service:

- **GitHub Pages**: Push to repository and enable Pages
- **Netlify**: Drag and drop the folder or connect repository
- **Vercel**: Import repository and deploy
- **AWS S3**: Upload files to S3 bucket with static hosting
- **Firebase Hosting**: Use Firebase CLI to deploy

### CDN Optimization
For production deployment, consider:
- Minifying CSS and JavaScript
- Compressing images
- Enabling gzip compression
- Setting appropriate cache headers

## 🤝 Contributing

### Code Style Guidelines
- **JavaScript**: Use meaningful function and variable names
- **CSS**: Follow BEM methodology for class naming
- **HTML**: Use semantic elements and proper ARIA attributes
- **Comments**: Document complex logic and functionality

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make changes following the style guidelines
4. Test thoroughly across different browsers
5. Submit a pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support & Contact

For support, questions, or feature requests:
- Create an issue in the repository
- Contact the development team (see Team section below)
- Check the documentation for common solutions
- Review the About page (`about.html`) for more information about the project

## 👥 Team

This project is developed by cybersecurity major students as their graduation project:

- **Kadi Almohanna** - Practical threat detection and secure web development
- **Taif Alrashedi** - Research and analysis of malicious URLs
- **Wajd Alessa** - Detection logic and accessibility features
- **Shaden Alharbi** - Testing and quality assurance

## 🔮 Future Enhancements

- **Search/Filter Functionality**: Add search and filter options to the history table
- **Date Formatting**: Improve timestamp display format with better localization
- **Export Functionality**: Allow users to export history as CSV or JSON
- **Real-time Updates**: Automatically refresh history when new URLs are analyzed
- **Advanced Analytics**: Add detailed threat analysis dashboard and reporting
- **Multi-language Support**: Internationalization (i18n) for global users
- **API Integration**: Connect to real-time threat intelligence APIs
- **Enhanced ML Model**: Improve detection accuracy with additional training data
- **User Profiles**: Personalized settings and analysis history per user

## 📝 Notes

- This is a graduation project demonstrating practical cybersecurity application development
- The machine learning model uses Random Forest algorithm trained on Kaggle datasets
- URL analysis includes pattern matching, domain analysis, SSL certificate checking, and behavioral indicators
- All user data is stored locally in the browser (localStorage) and CSV files (`classified_history.csv`)
- The application follows accessibility best practices (WCAG 2.1) and semantic HTML5
- No external dependencies or build tools required - pure vanilla JavaScript, HTML, and CSS
- Fully responsive design with mobile-first approach
- Dark mode preference is persisted across sessions using localStorage

---

**Built with ❤️ by the Cyber Guard Team**

*Protecting You, One Link at a Time*
