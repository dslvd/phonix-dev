// ─── Domain Model Classes ────────────────────────────────────────────────────

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export class VocabularyItem {
  constructor(
    public readonly id: string,
    public readonly nativeWord: string,
    public readonly englishWord: string,
    public readonly category: string,
    public readonly emoji: string,
    public readonly difficulty: Difficulty,
    public readonly audioUrl?: string,
  ) {}

  matchesQuery(query: string): boolean {
    const q = query.toLowerCase().trim();
    return (
      this.englishWord.toLowerCase() === q ||
      this.nativeWord.toLowerCase() === q ||
      this.englishWord.toLowerCase().includes(q) ||
      q.includes(this.englishWord.toLowerCase()) ||
      this.nativeWord.toLowerCase().includes(q) ||
      q.includes(this.nativeWord.toLowerCase()) ||
      this.category.toLowerCase() === q
    );
  }

  toDisplayString(): string {
    return `${this.emoji} ${this.englishWord} → ${this.nativeWord}`;
  }
}

export class SentenceItem {
  constructor(
    public readonly id: string,
    public readonly nativeSentence: string,
    public readonly englishSentence: string,
    public readonly illustration: string,
    public readonly audioUrl?: string,
  ) {}
}

// ─── Vocabulary Repository ────────────────────────────────────────────────────

export class VocabularyRepository {
  private static instance: VocabularyRepository;
  private readonly items: VocabularyItem[];
  private readonly sentences: SentenceItem[];

  private constructor() {
    this.items = VocabularyRepository.buildItems();
    this.sentences = VocabularyRepository.buildSentences();
  }

  static getInstance(): VocabularyRepository {
    if (!VocabularyRepository.instance) {
      VocabularyRepository.instance = new VocabularyRepository();
    }
    return VocabularyRepository.instance;
  }

  getAll(): VocabularyItem[] {
    return [...this.items];
  }

  getByDifficulty(difficulty: Difficulty): VocabularyItem[] {
    return this.items.filter((item) => item.difficulty === difficulty);
  }

  getByCategory(category: string): VocabularyItem[] {
    return this.items.filter((item) => item.category === category);
  }

  findById(id: string): VocabularyItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  findByQuery(query: string): VocabularyItem | undefined {
    return this.items.find((item) => item.matchesQuery(query));
  }

  getAllSentences(): SentenceItem[] {
    return [...this.sentences];
  }

  get totalCount(): number {
    return this.items.length;
  }

  private static buildItems(): VocabularyItem[] {
    return [
      // BEGINNER ANIMALS
      new VocabularyItem('cat', 'Kuring', 'Cat', 'animals', '🐱', 'beginner'),
      new VocabularyItem('dog', 'Ido', 'Dog', 'animals', '🐶', 'beginner'),
      new VocabularyItem('sheep', 'Karniro', 'Sheep', 'animals', '🐑', 'beginner'),
      new VocabularyItem('duck', 'Pato', 'Duck', 'animals', '🦆', 'beginner'),
      new VocabularyItem('chicken', 'Manok', 'Chicken', 'animals', '🐔', 'beginner'),
      new VocabularyItem('pig', 'Baboy', 'Pig', 'animals', '🐷', 'beginner'),
      new VocabularyItem('cow', 'Baka', 'Cow', 'animals', '🐄', 'beginner'),
      new VocabularyItem('bird', 'Pispis', 'Bird', 'animals', '🐦', 'beginner'),
      new VocabularyItem('fish', 'Isda', 'Fish', 'animals', '🐟', 'beginner'),
      // INTERMEDIATE ANIMALS
      new VocabularyItem('elephant', 'Elepante', 'Elephant', 'animals', '🐘', 'intermediate'),
      new VocabularyItem('horse', 'Kabayo', 'Horse', 'animals', '🐴', 'intermediate'),
      new VocabularyItem('carabao', 'Karabaw', 'Carabao', 'animals', '🐃', 'intermediate'),
      new VocabularyItem('monkey', 'Amo', 'Monkey', 'animals', '🐵', 'intermediate'),
      new VocabularyItem('butterfly', 'Alibangbang', 'Butterfly', 'animals', '🦋', 'intermediate'),
      new VocabularyItem('rabbit', 'Kuneho', 'Rabbit', 'animals', '🐰', 'intermediate'),
      new VocabularyItem('turtle', 'Pawikan', 'Turtle', 'animals', '🐢', 'intermediate'),
      new VocabularyItem('frog', 'Tukak', 'Frog', 'animals', '🐸', 'intermediate'),
      new VocabularyItem('snake', 'Halas', 'Snake', 'animals', '🐍', 'intermediate'),
      // ADVANCED ANIMALS
      new VocabularyItem('crab', 'Kasag', 'Crab', 'animals', '🦀', 'advanced'),
      new VocabularyItem('shrimp', 'Pasayan', 'Shrimp', 'animals', '🦐', 'advanced'),
      // BEGINNER FOOD
      new VocabularyItem('rice', 'Kan-on', 'Rice', 'food', '🍚', 'beginner'),
      new VocabularyItem('bread', 'Tinapay', 'Bread', 'food', '🍞', 'beginner'),
      new VocabularyItem('egg', 'Itlog', 'Egg', 'food', '🥚', 'beginner'),
      new VocabularyItem('water', 'Tubig', 'Water', 'food', '💧', 'beginner'),
      new VocabularyItem('milk', 'Gatas', 'Milk', 'food', '🥛', 'beginner'),
      // INTERMEDIATE FOOD
      new VocabularyItem('banana', 'Saging', 'Banana', 'food', '🍌', 'intermediate'),
      new VocabularyItem('mango', 'Mangga', 'Mango', 'food', '🥭', 'intermediate'),
      new VocabularyItem('coconut', 'Lubi', 'Coconut', 'food', '🥥', 'intermediate'),
      new VocabularyItem('apple', 'Mansanas', 'Apple', 'food', '🍎', 'intermediate'),
      new VocabularyItem('orange', 'Dalandan', 'Orange', 'food', '🍊', 'intermediate'),
      // BEGINNER COLORS
      new VocabularyItem('red', 'Pula', 'Red', 'colors', '🔴', 'beginner'),
      new VocabularyItem('blue', 'Asul', 'Blue', 'colors', '🔵', 'beginner'),
      new VocabularyItem('yellow', 'Dalag', 'Yellow', 'colors', '🟡', 'beginner'),
      new VocabularyItem('green', 'Lunhaw', 'Green', 'colors', '🟢', 'beginner'),
      new VocabularyItem('white', 'Puti', 'White', 'colors', '⚪', 'beginner'),
      new VocabularyItem('black', 'Itom', 'Black', 'colors', '⚫', 'beginner'),
      // INTERMEDIATE BODY PARTS
      new VocabularyItem('head', 'Ulo', 'Head', 'body', '👤', 'intermediate'),
      new VocabularyItem('eye', 'Mata', 'Eye', 'body', '👁️', 'intermediate'),
      new VocabularyItem('nose', 'Ilong', 'Nose', 'body', '👃', 'intermediate'),
      new VocabularyItem('mouth', 'Baba', 'Mouth', 'body', '👄', 'intermediate'),
      new VocabularyItem('hand', 'Kamot', 'Hand', 'body', '✋', 'intermediate'),
      new VocabularyItem('foot', 'Tiil', 'Foot', 'body', '🦶', 'intermediate'),
      // ADVANCED FAMILY
      new VocabularyItem('mother', 'Iloy', 'Mother', 'family', '👩', 'advanced'),
      new VocabularyItem('father', 'Tatay', 'Father', 'family', '👨', 'advanced'),
      new VocabularyItem('sister', 'Manghod', 'Sister', 'family', '👧', 'advanced'),
      new VocabularyItem('brother', 'Manghod', 'Brother', 'family', '👦', 'advanced'),
      new VocabularyItem('baby', 'Bata', 'Baby', 'family', '👶', 'advanced'),
    ];
  }

  private static buildSentences(): SentenceItem[] {
    return [
      new SentenceItem('cat-sleeping', 'Nagakatulog ang kuring', 'The cat is sleeping', '😴🐱'),
      new SentenceItem('dog-running', 'Nagadalagan ang ido', 'The dog is running', '🏃🐶'),
      new SentenceItem('bird-flying', 'Nagalupad ang pispis', 'The bird is flying', '🦅✈️'),
      new SentenceItem('fish-swimming', 'Nagalangoy ang isda', 'The fish is swimming', '🐟💦'),
      new SentenceItem('chicken-eating', 'Nagakaon ang manok', 'The chicken is eating', '🐔🌾'),
      new SentenceItem('elephant-big', 'Dako ang elepante', 'The elephant is big', '🐘💪'),
      new SentenceItem('monkey-jumping', 'Nagalukso ang amo', 'The monkey is jumping', '🐵🤸'),
      new SentenceItem('rabbit-eating', 'Nagakaon ang kuneho', 'The rabbit is eating', '🐰🥕'),
      new SentenceItem('happy-child', 'Malipayon ang bata', 'The child is happy', '😊👶'),
      new SentenceItem('mother-cooking', 'Nagaluto ang iloy', 'Mother is cooking', '👩‍🍳🍳'),
      new SentenceItem('father-working', 'Nagaobra ang tatay', 'Father is working', '👨‍💼💼'),
      new SentenceItem('eating-rice', 'Nagakaon ako sang kan-on', 'I am eating rice', '🍚😋'),
      new SentenceItem('drinking-water', 'Nagainom ako sang tubig', 'I am drinking water', '💧🥤'),
      new SentenceItem('red-apple', 'Pula ang mansanas', 'The apple is red', '🍎🔴'),
      new SentenceItem('sun-shining', 'Naga-init ang adlaw', 'The sun is hot', '☀️🔥'),
    ];
  }
}

// ─── Convenience helpers (backward-compatible exports) ────────────────────────

const repo = VocabularyRepository.getInstance();

export const vocabularyData = repo.getAll();
export const sentenceData = repo.getAllSentences();
export const getBeginnerWords = () => repo.getByDifficulty('beginner');
export const getIntermediateWords = () => repo.getByDifficulty('intermediate');
export const getAdvancedWords = () => repo.getByDifficulty('advanced');
