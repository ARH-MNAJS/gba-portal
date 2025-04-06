export const GAME_CATEGORIES = [
  {
    id: "memory",
    name: "Memory Games",
    description: "Games that enhance memory and recall abilities"
  },
  {
    id: "logic",
    name: "Logic Games",
    description: "Games that test logical reasoning and problem-solving"
  },
  {
    id: "attention",
    name: "Attention Games",
    description: "Games that improve focus and attention to detail"
  },
  {
    id: "speed",
    name: "Speed Games",
    description: "Games that test reaction time and processing speed"
  },
  {
    id: "creativity",
    name: "Creativity Games",
    description: "Games that encourage creative thinking and expression"
  }
];

// Simple icons for games that can be easily displayed without relying on external storage
export const GAME_ICONS = {
  "memory": "🧠",
  "logic": "🧩",
  "attention": "👁️",
  "speed": "⚡",
  "creativity": "🎨",
  "default": "🎮"
};

// Default color schemes for game cards by category
export const GAME_COLORS = {
  "memory": {
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-600 dark:text-blue-400"
  },
  "logic": {
    bg: "bg-purple-50 dark:bg-purple-950",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-600 dark:text-purple-400"
  },
  "attention": {
    bg: "bg-green-50 dark:bg-green-950",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-600 dark:text-green-400"
  },
  "speed": {
    bg: "bg-yellow-50 dark:bg-yellow-950",
    border: "border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-600 dark:text-yellow-400"
  },
  "creativity": {
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-600 dark:text-red-400"
  },
  "default": {
    bg: "bg-gray-50 dark:bg-gray-900",
    border: "border-gray-200 dark:border-gray-800",
    text: "text-gray-600 dark:text-gray-400"
  }
}; 