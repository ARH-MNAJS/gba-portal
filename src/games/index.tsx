import { ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Game components with dynamic imports
export const GameComponents = {
  'memory-match': dynamic(() => import('./MemoryMatch'), { 
    ssr: false,
    loading: () => <div className="w-full h-[500px] flex items-center justify-center">Loading Memory Match Game...</div>
  }),
  'word-scramble': dynamic(() => import('./WordScramble'), { 
    ssr: false,
    loading: () => <div className="w-full h-[500px] flex items-center justify-center">Loading Word Scramble Game...</div>
  }),
  'math-quiz': dynamic(() => import('./MathQuiz'), { 
    ssr: false,
    loading: () => <div className="w-full h-[500px] flex items-center justify-center">Loading Math Quiz Game...</div>
  }),
  'switch': dynamic(() => import('./Switch'), { 
    ssr: false,
    loading: () => <div className="w-full h-[500px] flex items-center justify-center">Loading Switch Game...</div>
  }),
  'geo-sudo': dynamic(() => import('./GeoSudo'), { 
    ssr: false,
    loading: () => <div className="w-full h-[500px] flex items-center justify-center">Loading Geo-Sudo Game...</div>
  })
};

// Game categories
export const GAME_CATEGORIES = [
  {
    id: 'memory',
    name: 'Memory Games',
    description: 'Games that enhance memory and recall skills'
  },
  {
    id: 'language',
    name: 'Language Games',
    description: 'Games that improve vocabulary and language skills'
  },
  {
    id: 'math',
    name: 'Math Games',
    description: 'Games that develop arithmetic and mathematical thinking'
  },
  {
    id: 'logic',
    name: 'Logic Games',
    description: 'Games that enhance critical thinking and problem-solving skills'
  },
  {
    id: 'pattern',
    name: 'Pattern Games',
    description: 'Games that test pattern recognition and sequence prediction'
  },
  {
    id: 'creativity',
    name: 'Creativity Games',
    description: 'Games that foster creative thinking and expression'
  }
];

// Game metadata
export const GAMES_METADATA = [
  {
    id: 'memory-match',
    name: 'Memory Match',
    description: 'Test your memory by matching pairs of cards',
    categoryId: 'memory',
    difficulty: 'medium',
    estimatedTimeMin: 5,
    thumbnailEmoji: '🎴'
  },
  {
    id: 'word-scramble',
    name: 'Word Scramble',
    description: 'Unscramble letters to form correct words',
    categoryId: 'language',
    difficulty: 'medium',
    estimatedTimeMin: 8,
    thumbnailEmoji: '🔤'
  },
  {
    id: 'math-quiz',
    name: 'Math Quiz',
    description: 'Practice math operations with varied difficulty levels',
    categoryId: 'math',
    difficulty: 'medium',
    estimatedTimeMin: 10,
    thumbnailEmoji: '🧮'
  },
  {
    id: 'switch',
    name: 'Switch',
    description: 'Decode how patterns transform through a switch',
    categoryId: 'pattern',
    difficulty: 'medium',
    estimatedTimeMin: 15,
    thumbnailEmoji: '🔄'
  },
  {
    id: 'geo-sudo',
    name: 'Geo-Sudo',
    description: 'Solve Sudoku-style puzzles with geometric shapes',
    categoryId: 'logic',
    difficulty: 'medium',
    estimatedTimeMin: 15,
    thumbnailEmoji: '🧩'
  }
];

// Color schemes for game UI
export const GAME_COLORS = {
  memory: {
    primary: 'bg-purple-100 dark:bg-purple-900',
    text: 'text-purple-800 dark:text-purple-100',
    accent: 'bg-purple-500',
    border: 'border-purple-200 dark:border-purple-800'
  },
  language: {
    primary: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-800 dark:text-blue-100',
    accent: 'bg-blue-500',
    border: 'border-blue-200 dark:border-blue-800'
  },
  math: {
    primary: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-800 dark:text-green-100',
    accent: 'bg-green-500',
    border: 'border-green-200 dark:border-green-800'
  },
  logic: {
    primary: 'bg-amber-100 dark:bg-amber-900',
    text: 'text-amber-800 dark:text-amber-100',
    accent: 'bg-amber-500',
    border: 'border-amber-200 dark:border-amber-800'
  },
  pattern: {
    primary: 'bg-cyan-100 dark:bg-cyan-900',
    text: 'text-cyan-800 dark:text-cyan-100',
    accent: 'bg-cyan-500',
    border: 'border-cyan-200 dark:border-cyan-800'
  },
  creativity: {
    primary: 'bg-pink-100 dark:bg-pink-900',
    text: 'text-pink-800 dark:text-pink-100',
    accent: 'bg-pink-500',
    border: 'border-pink-200 dark:border-pink-800'
  }
};

// Interface for the game component props
export interface GameProps {
  studentId: string;
  isPreview?: boolean;
  onComplete?: (score: number, timeTaken: number) => void;
}

// Function to get a game by ID
export function getGameById(gameId: string) {
  return GAMES_METADATA.find(game => game.id === gameId);
}

// Function to get games by category
export function getGamesByCategory(categoryId: string) {
  return GAMES_METADATA.filter(game => game.categoryId === categoryId);
}

// Function to get category by ID
export function getCategoryById(categoryId: string) {
  return GAME_CATEGORIES.find(category => category.id === categoryId);
}

// Function to get color scheme for a game
export function getGameColorScheme(gameId: string) {
  const game = getGameById(gameId);
  if (!game) return GAME_COLORS.memory; // Default
  return GAME_COLORS[game.categoryId as keyof typeof GAME_COLORS] || GAME_COLORS.memory;
}

// Function to get the dynamic component for a game
export function getGameComponent(gameId: string): React.ComponentType<GameProps> | null {
  return GameComponents[gameId as keyof typeof GameComponents] || null;
} 