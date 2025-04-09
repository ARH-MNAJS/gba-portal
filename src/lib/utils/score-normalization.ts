/**
 * Normalizes a game score to a 1-100 scale
 * @param score The original game score
 * @param maxPossibleScore The maximum possible score in the game's scoring system
 * @param minPossibleScore The minimum possible score in the game's scoring system (default: 0)
 * @returns A normalized score between 1-100
 */
export function normalizeScore(
  score: number,
  maxPossibleScore: number,
  minPossibleScore: number = 0
): number {
  // Ensure score is within valid range
  const validatedScore = Math.max(
    minPossibleScore,
    Math.min(score, maxPossibleScore)
  );
  
  // Calculate normalized score (1-100 scale)
  const normalizedValue = 
    ((validatedScore - minPossibleScore) / (maxPossibleScore - minPossibleScore)) * 99 + 1;
  
  // Return rounded integer
  return Math.round(normalizedValue);
}

/**
 * Gets the appropriate max score for a game based on its ID
 * @param gameId The ID of the game
 * @returns The maximum possible score for the game
 */
export function getGameMaxScore(gameId: string): number {
  switch (gameId) {
    case 'switch':
      return 1000; // Switch game max score
    case 'geo-sudo':
      return 1000; // GeoSudo game max score
    case 'memory-match':
      return 10; // MemoryMatch max score
    case 'word-scramble':
      return 10; // WordScramble max score
    case 'math-quiz':
      return 10; // MathQuiz max score
    default:
      return 100; // Default max score
  }
} 