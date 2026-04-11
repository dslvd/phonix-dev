export interface VocabularyItem {
  id: string;
  nativeWord: string; // e.g., "Kuring"
  englishWord: string; // e.g., "Cat"
  category: string;
  emoji: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  audioUrl?: string;
}

export interface SentenceItem {
  id: string;
  nativeSentence: string; // e.g., "Nagakatulog ang kuring"
  englishSentence: string; // e.g., "The cat is sleeping"
  illustration: string; // emoji or image
  audioUrl?: string;
}

// Example vocabulary data (Filipino/Hiligaynon to English)
export const vocabularyData: VocabularyItem[] = [
  {
    id: 'cook',
    nativeWord: 'Luto',
    englishWord: 'Cook',
    category: 'actions',
    emoji: '🍳',
    difficulty: 'intermediate',
  },
  {
    id: 'work',
    nativeWord: 'Obra',
    englishWord: 'Work',
    category: 'actions',
    emoji: '💼',
    difficulty: 'intermediate',
  },
  {
    id: 'hot',
    nativeWord: 'Init',
    englishWord: 'Hot',
    category: 'descriptions',
    emoji: '☀️',
    difficulty: 'intermediate',
  },

  // Animals
  // BEGINNER ANIMALS (9 words)
  {
    id: 'cat',
    nativeWord: 'Kuring',
    englishWord: 'Cat',
    category: 'animals',
    emoji: '🐱',
    difficulty: 'beginner',
  },
  {
    id: 'dog',
    nativeWord: 'Ido',
    englishWord: 'Dog',
    category: 'animals',
    emoji: '🐶',
    difficulty: 'beginner',
  },
  {
    id: 'sheep',
    nativeWord: 'Karniro',
    englishWord: 'Sheep',
    category: 'animals',
    emoji: '🐑',
    difficulty: 'beginner',
  },
  {
    id: 'duck',
    nativeWord: 'Pato',
    englishWord: 'Duck',
    category: 'animals',
    emoji: '🦆',
    difficulty: 'beginner',
  },
  {
    id: 'chicken',
    nativeWord: 'Manok',
    englishWord: 'Chicken',
    category: 'animals',
    emoji: '🐔',
    difficulty: 'beginner',
  },
  {
    id: 'pig',
    nativeWord: 'Baboy',
    englishWord: 'Pig',
    category: 'animals',
    emoji: '🐷',
    difficulty: 'beginner',
  },
  {
    id: 'cow',
    nativeWord: 'Baka',
    englishWord: 'Cow',
    category: 'animals',
    emoji: '🐄',
    difficulty: 'beginner',
  },
  {
    id: 'bird',
    nativeWord: 'Pispis',
    englishWord: 'Bird',
    category: 'animals',
    emoji: '🐦',
    difficulty: 'beginner',
  },
  {
    id: 'fish',
    nativeWord: 'Isda',
    englishWord: 'Fish',
    category: 'animals',
    emoji: '🐟',
    difficulty: 'beginner',
  },

  // INTERMEDIATE ANIMALS (9 words)
  {
    id: 'elephant',
    nativeWord: 'Elepante',
    englishWord: 'Elephant',
    category: 'animals',
    emoji: '🐘',
    difficulty: 'intermediate',
  },
  {
    id: 'horse',
    nativeWord: 'Kabayo',
    englishWord: 'Horse',
    category: 'animals',
    emoji: '🐴',
    difficulty: 'intermediate',
  },
  {
    id: 'carabao',
    nativeWord: 'Karabaw',
    englishWord: 'Carabao',
    category: 'animals',
    emoji: '🐃',
    difficulty: 'intermediate',
  },
  {
    id: 'monkey',
    nativeWord: 'Amo',
    englishWord: 'Monkey',
    category: 'animals',
    emoji: '🐵',
    difficulty: 'intermediate',
  },
  {
    id: 'butterfly',
    nativeWord: 'Alibangbang',
    englishWord: 'Butterfly',
    category: 'animals',
    emoji: '🦋',
    difficulty: 'intermediate',
  },
  {
    id: 'rabbit',
    nativeWord: 'Kuneho',
    englishWord: 'Rabbit',
    category: 'animals',
    emoji: '🐰',
    difficulty: 'intermediate',
  },
  {
    id: 'turtle',
    nativeWord: 'Pawikan',
    englishWord: 'Turtle',
    category: 'animals',
    emoji: '🐢',
    difficulty: 'intermediate',
  },
  {
    id: 'frog',
    nativeWord: 'Tukak',
    englishWord: 'Frog',
    category: 'animals',
    emoji: '🐸',
    difficulty: 'intermediate',
  },
  {
    id: 'snake',
    nativeWord: 'Halas',
    englishWord: 'Snake',
    category: 'animals',
    emoji: '🐍',
    difficulty: 'intermediate',
  },

  // ADVANCED ANIMALS (2 words)
  {
    id: 'crab',
    nativeWord: 'Kasag',
    englishWord: 'Crab',
    category: 'animals',
    emoji: '🦀',
    difficulty: 'advanced',
  },
  {
    id: 'shrimp',
    nativeWord: 'Pasayan',
    englishWord: 'Shrimp',
    category: 'animals',
    emoji: '🦐',
    difficulty: 'advanced',
  },

  // Food
  // BEGINNER FOOD (5 words)
  {
    id: 'rice',
    nativeWord: 'Kan-on',
    englishWord: 'Rice',
    category: 'food',
    emoji: '🍚',
    difficulty: 'beginner',
  },
  {
    id: 'bread',
    nativeWord: 'Tinapay',
    englishWord: 'Bread',
    category: 'food',
    emoji: '🍞',
    difficulty: 'beginner',
  },
  {
    id: 'egg',
    nativeWord: 'Itlog',
    englishWord: 'Egg',
    category: 'food',
    emoji: '🥚',
    difficulty: 'beginner',
  },
  {
    id: 'water',
    nativeWord: 'Tubig',
    englishWord: 'Water',
    category: 'food',
    emoji: '💧',
    difficulty: 'beginner',
  },
  {
    id: 'milk',
    nativeWord: 'Gatas',
    englishWord: 'Milk',
    category: 'food',
    emoji: '🥛',
    difficulty: 'beginner',
  },

  // INTERMEDIATE FOOD (5 words)
  {
    id: 'banana',
    nativeWord: 'Saging',
    englishWord: 'Banana',
    category: 'food',
    emoji: '🍌',
    difficulty: 'intermediate',
  },
  {
    id: 'mango',
    nativeWord: 'Mangga',
    englishWord: 'Mango',
    category: 'food',
    emoji: '🥭',
    difficulty: 'intermediate',
  },
  {
    id: 'coconut',
    nativeWord: 'Lubi',
    englishWord: 'Coconut',
    category: 'food',
    emoji: '🥥',
    difficulty: 'intermediate',
  },
  {
    id: 'apple',
    nativeWord: 'Mansanas',
    englishWord: 'Apple',
    category: 'food',
    emoji: '🍎',
    difficulty: 'intermediate',
  },
  {
    id: 'orange',
    nativeWord: 'Dalandan',
    englishWord: 'Orange',
    category: 'food',
    emoji: '🍊',
    difficulty: 'intermediate',
  },

  // Colors
  // BEGINNER COLORS (6 words)
  {
    id: 'red',
    nativeWord: 'Pula',
    englishWord: 'Red',
    category: 'colors',
    emoji: '🔴',
    difficulty: 'beginner',
  },
  {
    id: 'blue',
    nativeWord: 'Asul',
    englishWord: 'Blue',
    category: 'colors',
    emoji: '🔵',
    difficulty: 'beginner',
  },
  {
    id: 'yellow',
    nativeWord: 'Dalag',
    englishWord: 'Yellow',
    category: 'colors',
    emoji: '🟡',
    difficulty: 'beginner',
  },
  {
    id: 'green',
    nativeWord: 'Lunhaw',
    englishWord: 'Green',
    category: 'colors',
    emoji: '🟢',
    difficulty: 'beginner',
  },
  {
    id: 'white',
    nativeWord: 'Puti',
    englishWord: 'White',
    category: 'colors',
    emoji: '⚪',
    difficulty: 'beginner',
  },
  {
    id: 'black',
    nativeWord: 'Itom',
    englishWord: 'Black',
    category: 'colors',
    emoji: '⚫',
    difficulty: 'beginner',
  },

  // Body Parts
  // INTERMEDIATE BODY PARTS (6 words)
  {
    id: 'head',
    nativeWord: 'Ulo',
    englishWord: 'Head',
    category: 'body',
    emoji: '👤',
    difficulty: 'intermediate',
  },
  {
    id: 'eye',
    nativeWord: 'Mata',
    englishWord: 'Eye',
    category: 'body',
    emoji: '👁️',
    difficulty: 'intermediate',
  },
  {
    id: 'nose',
    nativeWord: 'Ilong',
    englishWord: 'Nose',
    category: 'body',
    emoji: '👃',
    difficulty: 'intermediate',
  },
  {
    id: 'mouth',
    nativeWord: 'Baba',
    englishWord: 'Mouth',
    category: 'body',
    emoji: '👄',
    difficulty: 'intermediate',
  },
  {
    id: 'hand',
    nativeWord: 'Kamot',
    englishWord: 'Hand',
    category: 'body',
    emoji: '✋',
    difficulty: 'intermediate',
  },
  {
    id: 'foot',
    nativeWord: 'Tiil',
    englishWord: 'Foot',
    category: 'body',
    emoji: '🦶',
    difficulty: 'intermediate',
  },

  // Family
  // ADVANCED FAMILY (5 words)
  {
    id: 'mother',
    nativeWord: 'Iloy',
    englishWord: 'Mother',
    category: 'family',
    emoji: '👩',
    difficulty: 'advanced',
  },
  {
    id: 'father',
    nativeWord: 'Tatay',
    englishWord: 'Father',
    category: 'family',
    emoji: '👨',
    difficulty: 'advanced',
  },
  {
    id: 'sister',
    nativeWord: 'Manghod',
    englishWord: 'Sister',
    category: 'family',
    emoji: '👧',
    difficulty: 'advanced',
  },
  {
    id: 'brother',
    nativeWord: 'Manghod',
    englishWord: 'Brother',
    category: 'family',
    emoji: '👦',
    difficulty: 'advanced',
  },
  {
    id: 'baby',
    nativeWord: 'Bata',
    englishWord: 'Baby',
    category: 'family',
    emoji: '👶',
    difficulty: 'advanced',
  },
];

// Helper functions to filter vocabulary by difficulty
export const getBeginnerWords = () => vocabularyData.filter(item => item.difficulty === 'beginner');
export const getIntermediateWords = () => vocabularyData.filter(item => item.difficulty === 'intermediate');
export const getAdvancedWords = () => vocabularyData.filter(item => item.difficulty === 'advanced');

const PHASE_ONE_SUPPORT_IDS = ['cook', 'work', 'hot'] as const;

export const buildPhaseOneSupportWords = (levelCycle: number): VocabularyItem[] =>
  PHASE_ONE_SUPPORT_IDS.map((supportId, index) => {
    const item = vocabularyData.find((word) => word.id === supportId);

    if (!item) {
      throw new Error(`Missing phase one support word: ${supportId}`);
    }

    return {
      ...item,
      id: `lvl-${levelCycle + 1}-phase-one-support-${index + 1}-${item.id}`,
      difficulty: 'beginner',
    };
  });

// Example sentence data
export const sentenceData: SentenceItem[] = [
  {
    id: 'cat-sleeping',
    nativeSentence: 'Nagakatulog ang kuring',
    englishSentence: 'The cat is sleeping',
    illustration: '😴🐱',
  },
  {
    id: 'dog-running',
    nativeSentence: 'Nagadalagan ang ido',
    englishSentence: 'The dog is running',
    illustration: '🏃🐶',
  },
  {
    id: 'bird-flying',
    nativeSentence: 'Nagalupad ang pispis',
    englishSentence: 'The bird is flying',
    illustration: '🦅✈️',
  },
  {
    id: 'fish-swimming',
    nativeSentence: 'Nagalangoy ang isda',
    englishSentence: 'The fish is swimming',
    illustration: '🐟💦',
  },
  {
    id: 'chicken-eating',
    nativeSentence: 'Nagakaon ang manok',
    englishSentence: 'The chicken is eating',
    illustration: '🐔🌾',
  },
  {
    id: 'elephant-big',
    nativeSentence: 'Dako ang elepante',
    englishSentence: 'The elephant is big',
    illustration: '🐘💪',
  },
  {
    id: 'monkey-jumping',
    nativeSentence: 'Nagalukso ang amo',
    englishSentence: 'The monkey is jumping',
    illustration: '🐵🤸',
  },
  {
    id: 'rabbit-eating',
    nativeSentence: 'Nagakaon ang kuneho',
    englishSentence: 'The rabbit is eating',
    illustration: '🐰🥕',
  },
  {
    id: 'happy-child',
    nativeSentence: 'Malipayon ang bata',
    englishSentence: 'The child is happy',
    illustration: '😊👶',
  },
  {
    id: 'mother-cooking',
    nativeSentence: 'Nagaluto ang iloy',
    englishSentence: 'Mother is cooking',
    illustration: '👩‍🍳🍳',
  },
  {
    id: 'father-working',
    nativeSentence: 'Nagaobra ang tatay',
    englishSentence: 'Father is working',
    illustration: '👨‍💼💼',
  },
  {
    id: 'eating-rice',
    nativeSentence: 'Nagakaon ako sang kan-on',
    englishSentence: 'I am eating rice',
    illustration: '🍚😋',
  },
  {
    id: 'drinking-water',
    nativeSentence: 'Nagainom ako sang tubig',
    englishSentence: 'I am drinking water',
    illustration: '💧🥤',
  },
  {
    id: 'red-apple',
    nativeSentence: 'Pula ang mansanas',
    englishSentence: 'The apple is red',
    illustration: '🍎🔴',
  },
  {
    id: 'sun-shining',
    nativeSentence: 'Naga-init ang adlaw',
    englishSentence: 'The sun is hot',
    illustration: '☀️🔥',
  },
];
