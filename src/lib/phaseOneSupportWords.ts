import { VocabularyItem } from '../data/vocabulary';

const PHASE_ONE_SUPPORT_BASE: Array<
  Pick<VocabularyItem, 'id' | 'nativeWord' | 'englishWord' | 'category' | 'emoji'>
> = [
  { id: 'cook', nativeWord: 'Luto', englishWord: 'Cook', category: 'actions', emoji: '🍳' },
  { id: 'work', nativeWord: 'Obra', englishWord: 'Work', category: 'actions', emoji: '💼' },
  { id: 'hot', nativeWord: 'Init', englishWord: 'Hot', category: 'descriptions', emoji: '☀️' },
];

export const buildPhaseOneSupportWords = (levelCycle: number): VocabularyItem[] =>
  PHASE_ONE_SUPPORT_BASE.map((item, index) => ({
    ...item,
    id: `lvl-${levelCycle + 1}-phase-one-support-${index + 1}-${item.id}`,
    difficulty: 'beginner',
  }));
