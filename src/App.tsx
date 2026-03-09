import { useState } from 'react';
import Landing from './pages/Landing';
import LanguageSetup from './pages/LanguageSetup';
import ModeSelection from './pages/ModeSelection';
import Dashboard from './pages/Dashboard';
import ScanMode from './pages/ScanMode';
import VocabularyLearning from './pages/VocabularyLearning';
import SentenceLearning from './pages/SentenceLearning';
import VocabularyCollection from './pages/VocabularyCollection';
import Profile from './pages/Profile';
import Premium from './pages/Premium';

export type Page = 
  | 'landing'
  | 'setup'
  | 'mode'
  | 'dashboard'
  | 'scan'
  | 'vocabulary'
  | 'sentence'
  | 'collection'
  | 'profile'
  | 'premium';

export interface AppState {
  nativeLanguage: string;
  targetLanguage: string;
  mode: 'learn' | 'scan' | null;
  currentVocabIndex: number;
  learnedWords: string[];
  stars: number;
  isPremium: boolean;
  scansRemaining: number;
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [appState, setAppState] = useState<AppState>({
    nativeLanguage: '',
    targetLanguage: '',
    mode: null,
    currentVocabIndex: 0,
    learnedWords: [],
    stars: 0,
    isPremium: false,
    scansRemaining: 20,
  });

  const navigate = (page: Page) => {
    setCurrentPage(page);
  };

  const updateState = (updates: Partial<AppState>) => {
    setAppState((prev) => ({ ...prev, ...updates }));
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <Landing navigate={navigate} />;
      case 'setup':
        return <LanguageSetup navigate={navigate} updateState={updateState} />;
      case 'mode':
        return <ModeSelection navigate={navigate} updateState={updateState} />;
      case 'dashboard':
        return <Dashboard navigate={navigate} appState={appState} />;
      case 'scan':
        return <ScanMode navigate={navigate} appState={appState} updateState={updateState} />;
      case 'vocabulary':
        return <VocabularyLearning navigate={navigate} appState={appState} updateState={updateState} />;
      case 'sentence':
        return <SentenceLearning navigate={navigate} appState={appState} updateState={updateState} />;
      case 'collection':
        return <VocabularyCollection navigate={navigate} appState={appState} />;
      case 'profile':
        return <Profile navigate={navigate} appState={appState} />;
      case 'premium':
        return <Premium navigate={navigate} appState={appState} updateState={updateState} />;
      default:
        return <Landing navigate={navigate} />;
    }
  };

  return <div className="min-h-screen">{renderPage()}</div>;
}

export default App;
