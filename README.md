# Linggo — Learn Filipino Languages

An AI-powered language learning application for Filipino languages (Hiligaynon, Tagalog, and English) with a modern GPT-style interface.

## 🎯 Features

- **AI-Powered Lesson Generation**: Type any topic and get instant AI-generated lessons
- **Multiple Languages**: Learn Hiligaynon, Tagalog, or English
- **Interactive Quizzes**: Multiple choice and fill-in-the-blank questions
- **Camera Scan Translation**: Point your camera at text and get instant translations
- **Voice Translation**: Speak in any language and get translations
- **Progress Tracking**: XP system, streaks, and leaderboards
- **Google Sign-In**: Optional authentication with profile support
- **GPT-Style Interface**: Clean, conversational AI interaction

## 🚀 Quick Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/linggo)

### Manual Deploy

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Click "Deploy"

3. **Environment Variables:**
   
   Add these in your Vercel project settings:
   
   - `VITE_GEMINI_API_KEY`: Your FREE Google Gemini API key from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID from [console.cloud.google.com](https://console.cloud.google.com/)

4. **Configure Google OAuth:**
   - In Google Cloud Console, add your Vercel domain to authorized JavaScript origins:
     - `https://your-project.vercel.app`
   - Add to authorized redirect URIs if needed

📚 **For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**

---

## 📁 Project Structure

```
Phonix/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # All application styles
├── src/                    # TypeScript source files
│   ├── types.ts            # TypeScript interfaces and types
│   ├── state.ts            # App state management with localStorage
│   ├── dom.ts              # DOM utility functions
│   ├── api.ts              # Google Gemini API wrapper for AI features
│   ├── auth.ts             # Google Sign-In and guest authentication
│   ├── lesson.ts           # Quiz engine for lessons
│   ├── search.ts           # AI lesson search and generation
│   ├── home.ts             # Home screen, leaderboard, profile
│   ├── scan.ts             # Camera scan-to-translate feature
│   ├── voice.ts            # Voice-to-translate feature
│   └── main.ts             # Entry point, wires everything together
├── dist/                   # Compiled JavaScript output
│   └── bundle.js           # Bundled application (generated)
├── package.json            # Node.js dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite bundler configuration
└── README.md               # This file
```

## �️ Local Development

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google Gemini API key - FREE (get one at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey))
- Google OAuth Client ID (optional, for Google Sign-In)

### Installation

1. **Clone and install:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your API keys:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3000 with hot reload

4. **Build for production:**
   ```bash
   npm run build
   ```
   Creates optimized `dist/bundle.js`

5. **Preview production build:**
   ```bash
   npm run preview
   ```

### Type Checking

To check for TypeScript errors without building:
```bash
npm run type-check
```

## 🔧 Configuration

### Google Sign-In Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Navigate to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID → Web application
5. Add your site URL as authorized JavaScript origin
6. Copy the Client ID
7. In the app, click "Set up Google Sign-In" and paste your Client ID

### Google Gemini API (for AI Features)

The application uses the FREE Google Gemini API for:
- AI-generated lessons
- Intelligent hints
- Camera scan translation
- Voice translation

**Get your FREE API key**: Visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) to get started with Gemini 1.5 Flash (free tier with generous limits).

## 🎨 Technology Stack

- **TypeScript 5.9+**: Strict mode with full type safety
- **Vite**: Fast bundler and development server
- **Vanilla JavaScript/TypeScript**: No framework dependencies
- **CSS3**: Modern responsive design with CSS Grid and Flexbox
- **Web APIs**:
  - `localStorage` for state persistence
  - `MediaDevices` for camera access
  - `SpeechRecognition` for voice input
  - `fetch` for API calls

## 📦 Module Organization

### types.ts
Defines all TypeScript interfaces and types used across the application.

### state.ts
Manages application state with localStorage persistence:
- User data
- Language preference
- Progress tracking (XP, streak, completed lessons)

### dom.ts
Utility functions for DOM manipulation:
- Element selection
- Screen management
- Toast notifications
- Confetti animations

### api.ts
Google Gemini API wrapper:
- Lesson generation
- AI hints
- Image OCR and translation
- Voice translation

### auth.ts
Authentication logic:
- Google Sign-In integration
- Guest login
- Session management

### lesson.ts
Quiz engine:
- Multiple choice questions
- Fill-in-the-blank questions
- Progress tracking
- Feedback and hints

### search.ts
AI lesson search interface:
- Topic-based search
- Lesson caching
- Dynamic UI rendering

### home.ts
Main navigation screens:
- Home dashboard
- Leaderboard
- Profile management

### scan.ts
Camera-based translation:
- Camera access
- Image capture
- OCR and translation

### voice.ts
Voice-based translation:
- Speech recognition
- Real-time translation
- Multi-language support

### main.ts
Application entry point:
- Module initialization
- Window function exposure (for HTML onclick handlers)
- App lifecycle management

## 🌐 Deployment

For production deployment:

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy these files to your web server:
   - `index.html`
   - `css/` folder
   - `dist/` folder (containing `bundle.js`)

3. Ensure proper MIME types are set on your server:
   - `.js` files should be served as `application/javascript` or `text/javascript`
   - `.css` files should be served as `text/css`

## 📝 Development Notes

- The codebase is fully typed with TypeScript strict mode
- All modules use ES6 imports/exports
- State is persisted to localStorage automatically
- The bundler creates a single `bundle.js` file for production
- HTML uses inline onclick handlers that reference functions exposed to `window` in `main.ts`

## 🤝 Contributing

When adding new features:

1. Create appropriate TypeScript types in `types.ts`
2. Add new modules in the `src/` folder following the existing pattern
3. Export functions that need to be called from HTML in `main.ts`
4. Update styles in `css/styles.css`
5. Test with `npm run dev` before building

## 📄 License

MIT License - feel free to use this project for learning or as a template for your own applications.

---

Built with ❤️ for language learners everywhere 🌍
