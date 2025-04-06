"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Timer,
  Info,
  ArrowLeft,
  RotateCcw,
  Check,
  AlertCircle,
  ArrowRight,
  Square,
  Triangle,
  Circle,
  HelpCircle,
  Pentagon
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface GeoSudoProps {
  studentId: string;
  isPreview?: boolean;
  onComplete?: (score: number, timeTaken: number) => void;
}

// Define grid sizes and difficulty levels
type GridSize = 4 | 5 | 6;
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

// Define shape options
type ShapeType = 'square' | 'triangle' | 'circle' | 'pentagon' | 'diamond' | 'hexagon';

// Define cell data structure
interface Cell {
  shape: ShapeType | null;
  isFixed: boolean;
  isHighlighted?: boolean;
}

// Define puzzle structure
interface Puzzle {
  grid: Cell[][];
  size: GridSize;
  targetPosition: [number, number];
  targetShape: ShapeType;
  optionShapes: ShapeType[];
  timeLimit: number;
  emptyPositions: Array<[number, number]>;
}

// Level settings for different difficulties
const LEVEL_SETTINGS = {
  easy: {
    levelCount: 5,
    gridSizes: [4] as const,
    timeLimit: 120,
    emptyCellsPercentage: 0.25, // 25% of cells will be empty
    timePenalty: 15,
    scorePenalty: 0.2
  },
  medium: {
    levelCount: 8,
    gridSizes: [4, 5] as const,
    timeLimit: 180,
    emptyCellsPercentage: 0.35, // 35% of cells will be empty
    timePenalty: 20,
    scorePenalty: 0.25
  },
  hard: {
    levelCount: 10,
    gridSizes: [5, 6] as const,
    timeLimit: 240,
    emptyCellsPercentage: 0.45, // 45% of cells will be empty
    timePenalty: 25,
    scorePenalty: 0.3
  },
  expert: {
    levelCount: 12,
    gridSizes: [6] as const,
    timeLimit: 300,
    emptyCellsPercentage: 0.55, // 55% of cells will be empty
    timePenalty: 30,
    scorePenalty: 0.35
  }
};

// Define shape mapping for display (outlines only)
const SHAPE_COMPONENTS = {
  square: <Square className="w-full h-full stroke-2 stroke-gray-900 dark:stroke-gray-100" />,
  triangle: <Triangle className="w-full h-full stroke-2 stroke-gray-900 dark:stroke-gray-100" />,
  circle: <Circle className="w-full h-full stroke-2 stroke-gray-900 dark:stroke-gray-100" />,
  pentagon: <Pentagon className="w-full h-full stroke-2 stroke-gray-900 dark:stroke-gray-100" />,
  diamond: <div className="w-full h-full transform rotate-45">
    <Square className="w-full h-full stroke-2 stroke-gray-900 dark:stroke-gray-100" />
  </div>,
  hexagon: <div className="w-full h-full relative">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full text-gray-900 dark:text-gray-100">
      <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" />
    </svg>
  </div>
};

// Color versions of shapes for selection
const COLORED_SHAPE_COMPONENTS = {
  square: <Square className="w-8 h-8 fill-red-500 stroke-red-700" />,
  triangle: <Triangle className="w-8 h-8 fill-amber-500 stroke-amber-700" />,
  circle: <Circle className="w-8 h-8 fill-green-500 stroke-green-700" />,
  pentagon: <Pentagon className="w-8 h-8 fill-blue-500 stroke-blue-700" />,
  diamond: <div className="w-8 h-8 transform rotate-45">
    <Square className="w-8 h-8 fill-purple-500 stroke-purple-700" />
  </div>,
  hexagon: <div className="w-8 h-8 relative">
    <svg viewBox="0 0 24 24" fill="#f97316" stroke="#c2410c" strokeWidth="2" className="w-8 h-8">
      <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" />
    </svg>
  </div>
};

// Shuffle array helper (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate a pre-defined valid grid pattern
const generateGridPattern = (size: GridSize): Cell[][] => {
  // Create base patterns for each size that are already valid
  // Using Latin Squares to ensure validity
  const basePatterns: Record<GridSize, ShapeType[][]> = {
    4: [
      ['square', 'triangle', 'circle', 'pentagon'],
      ['circle', 'pentagon', 'square', 'triangle'],
      ['triangle', 'square', 'pentagon', 'circle'],
      ['pentagon', 'circle', 'triangle', 'square']
    ],
    5: [
      ['square', 'triangle', 'circle', 'pentagon', 'diamond'],
      ['diamond', 'square', 'triangle', 'circle', 'pentagon'],
      ['pentagon', 'diamond', 'square', 'triangle', 'circle'],
      ['circle', 'pentagon', 'diamond', 'square', 'triangle'],
      ['triangle', 'circle', 'pentagon', 'diamond', 'square']
    ],
    6: [
      ['square', 'triangle', 'circle', 'pentagon', 'diamond', 'hexagon'],
      ['hexagon', 'square', 'triangle', 'circle', 'pentagon', 'diamond'],
      ['diamond', 'hexagon', 'square', 'triangle', 'circle', 'pentagon'],
      ['pentagon', 'diamond', 'hexagon', 'square', 'triangle', 'circle'],
      ['circle', 'pentagon', 'diamond', 'hexagon', 'square', 'triangle'],
      ['triangle', 'circle', 'pentagon', 'diamond', 'hexagon', 'square']
    ]
  };

  // Use only the shapes needed for the grid size
  const basePattern = basePatterns[size];
  
  // Randomize the pattern by shuffling rows and columns
  let pattern = [...basePattern];
  
  // Shuffle rows
  pattern = shuffleArray(pattern);
  
  // Shuffle columns
  const transposed = pattern[0].map((_, colIndex) => 
    pattern.map(row => row[colIndex])
  );
  const shuffledTransposed = shuffleArray(transposed);
  pattern = shuffledTransposed[0].map((_, rowIndex) => 
    shuffledTransposed.map(col => col[rowIndex])
  );

  // Convert to Cell structure
  return pattern.map(row => 
    row.map(shape => ({ 
      shape: shape as ShapeType, 
      isFixed: true 
    }))
  );
};

// Generate a puzzle with multiple empty cells
const generatePuzzle = (difficulty: Difficulty, level: number): Puzzle => {
  const settings = LEVEL_SETTINGS[difficulty];
  
  // Determine grid size based on level and difficulty
  const possibleSizes = settings.gridSizes;
  const size = possibleSizes[Math.min(
    Math.floor((level - 1) / 3),
    possibleSizes.length - 1
  )];
  
  // Generate a complete valid grid
  const completeGrid = generateGridPattern(size);
  
  // Calculate number of cells to empty based on percentage
  const totalCells = size * size;
  const numEmptyCells = Math.floor(totalCells * settings.emptyCellsPercentage);
  
  // Create a copy of the complete grid with proper Cell structure
  const puzzleGrid = completeGrid.map(row => 
    row.map(cell => ({
      shape: cell.shape,
      isFixed: true
    }))
  );
  
  // Randomly select cells to empty
  const emptyPositions: Array<[number, number]> = [];
  while (emptyPositions.length < numEmptyCells) {
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * size);
    
    // Check if this position is already empty
    if (puzzleGrid[row][col].shape !== null) {
      emptyPositions.push([row, col]);
      puzzleGrid[row][col] = {
        shape: null,
        isFixed: false
      };
    }
  }
  
  // Select one of the empty positions as the current target
  const targetIndex = Math.floor(Math.random() * emptyPositions.length);
  const [targetRow, targetCol] = emptyPositions[targetIndex];
  
  // Get the correct shape for the target position
  const targetShape = completeGrid[targetRow][targetCol].shape as ShapeType;
  
  // Get all unique shapes used in the grid for options
  const allShapes = new Set<ShapeType>();
  completeGrid.forEach(row => {
    row.forEach(cell => {
      if (cell.shape) allShapes.add(cell.shape);
    });
  });
  
  return {
    grid: puzzleGrid,
    size,
    targetPosition: [targetRow, targetCol],
    targetShape,
    optionShapes: Array.from(allShapes),
    timeLimit: settings.timeLimit,
    emptyPositions
  };
};

export default function GeoSudo({ studentId, isPreview = false, onComplete }: GeoSudoProps) {
  // Game states
  const [stage, setStage] = useState<'config' | 'instructions' | 'play' | 'report'>('config');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [selectedShape, setSelectedShape] = useState<ShapeType | null>(null);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [levelRewards, setLevelRewards] = useState<{level: number, reward: number, timeTaken: number, wrongAnswers: number}[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [agreedToInstructions, setAgreedToInstructions] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [timePenaltyFlash, setTimePenaltyFlash] = useState(false);
  const [accumulatedPenalty, setAccumulatedPenalty] = useState(0);
  
  // Timer reference for cleanup
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Level start time for scoring
  const levelStartTimeRef = useRef<number>(0);
  const baseTimeLimitRef = useRef<number>(0);
  
  // Cleanup function to prevent memory leaks
  const clearGameTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  
  // Clean up timers when component unmounts
  useEffect(() => {
    return clearGameTimer;
  }, []);

  // Handle game initialization on stage change
  useEffect(() => {
    // Clear any existing timer
    clearGameTimer();
    
    // Initialize level when moving to play stage
    if (stage === 'play' && !gameOver) {
      initializeLevel();
    }
  }, [stage, gameOver]);

  // Re-initialize when level changes
  useEffect(() => {
    if (stage === 'play' && !gameOver) {
      initializeLevel();
    }
  }, [currentLevel]);

  // Initialize level with new puzzle
  const initializeLevel = () => {
    try {
      // Generate new puzzle
      const newPuzzle = generatePuzzle(difficulty, currentLevel);
      setPuzzle(newPuzzle);
      setSelectedShape(null);
      setFeedback(null);
      
      // Record start time
      const now = Date.now();
      levelStartTimeRef.current = now;
      
      if (currentLevel === 1) {
        setGameStartTime(now);
      }
      
      // Set initial time and reset accumulated penalties
      setTimeLeft(newPuzzle.timeLimit);
      setAccumulatedPenalty(0);
      baseTimeLimitRef.current = newPuzzle.timeLimit;
      
      // Set up timer - using setTimeout for better performance
      startTimer(newPuzzle.timeLimit, 0);
      
      // Reset wrong answers for new level
      setWrongAnswers(0);
    } catch (error) {
      console.error("Error initializing level:", error);
      // Fallback to avoid game getting stuck
      setGameOver(true);
      setStage('report');
    }
  };

  // Timer function using recursive setTimeout instead of setInterval
  // Modified to account for time penalties
  const startTimer = (baseSeconds: number, penalties: number) => {
    // Clear any existing timer
    clearGameTimer();
    
    // Calculate remaining time based on elapsed time and penalties
    const elapsed = Math.floor((Date.now() - levelStartTimeRef.current) / 1000);
    const remaining = Math.max(0, baseSeconds - elapsed - penalties);
    
    // Set current time
    setTimeLeft(remaining);
    
    if (remaining <= 0) {
      // Time's up
      setGameOver(true);
      setStage('report');
      return;
    }
    
    // Set new timer
    timerRef.current = setTimeout(() => {
      startTimer(baseSeconds, penalties);
    }, 1000);
  };

  // Handle shape selection
  const handleShapeSelect = (shape: ShapeType) => {
    setSelectedShape(shape);
  };

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (!puzzle || selectedShape === null) return;
    
    const isCorrect = selectedShape === puzzle.targetShape;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
      // Stop the timer
      clearGameTimer();
      
      // Calculate time spent on this level
      const timeSpent = Math.max(1, Math.floor((Date.now() - levelStartTimeRef.current) / 1000) + accumulatedPenalty);
      
      // Calculate reward with difficulty multiplier
      const difficultyMultiplier = {
        easy: 1,
        medium: 1.5,
        hard: 2,
        expert: 3
      }[difficulty];
      
      // Formula: (Level² × DifficultyMultiplier) / Time
      let reward = (currentLevel * currentLevel * difficultyMultiplier / timeSpent);
      
      // Apply penalty for wrong answers
      if (wrongAnswers > 0) {
        const penaltyFactor = 1 - (wrongAnswers * LEVEL_SETTINGS[difficulty].scorePenalty);
        reward = reward * Math.max(0.1, penaltyFactor); // Ensure at least 10% of score remains
      }
      
      // Round to 2 decimal places
      reward = Math.round(reward * 100) / 100;
      
      // Update score and rewards
      setTotalScore(prevScore => prevScore + reward);
      setLevelRewards(prev => [...prev, { 
        level: currentLevel, 
        reward, 
        timeTaken: timeSpent,
        wrongAnswers 
      }]);
      
      // Move to next level or finish game
      const maxLevel = LEVEL_SETTINGS[difficulty].levelCount;
      
      if (currentLevel < maxLevel) {
        setTimeout(() => {
          setCurrentLevel(prev => prev + 1);
          setFeedback(null);
          setWrongAnswers(0); // Reset wrong answers for next level
        }, 1500);
      } else {
        setGameOver(true);
        setTimeout(() => {
          setStage('report');
        }, 1500);
      }
    } else {
      // Apply time penalty for wrong answer
      setWrongAnswers(prev => prev + 1);
      const timePenalty = LEVEL_SETTINGS[difficulty].timePenalty;
      
      // Flash the timer in red to indicate penalty
      setTimePenaltyFlash(true);
      
      // Update accumulated penalty
      setAccumulatedPenalty(prev => prev + timePenalty);
      
      // Deduct time - restart timer with updated penalty
      startTimer(baseTimeLimitRef.current, accumulatedPenalty + timePenalty);
      
      // Reset the flash after a brief period
      setTimeout(() => {
        setTimePenaltyFlash(false);
      }, 800);
      
      // For incorrect answers, allow retry after feedback
      setTimeout(() => {
        setSelectedShape(null);
        setFeedback(null);
      }, 1500);
    }
  };
  
  // Start game function
  const startGame = () => {
    // Check if instructions should be shown
    if (showInstructions && !agreedToInstructions) {
      setStage('instructions');
    } else {
      // Reset game state
      setCurrentLevel(1);
      setTotalScore(0);
      setLevelRewards([]);
      setGameOver(false);
      
      // Start the game
      setStage('play');
    }
  };

  // Finish game function
  const finishGame = () => {
    // Clear any timers
    clearGameTimer();
    
    // Report score if callback provided
    if (onComplete && !isPreview) {
      const totalTimeTaken = Math.floor((Date.now() - gameStartTime) / 1000);
      onComplete(totalScore, totalTimeTaken);
    }
    
    // Reset state
    setCurrentLevel(1);
    setTotalScore(0);
    setLevelRewards([]);
    setStage('config');
  };

  // Restart game function
  const restartGame = () => {
    setCurrentLevel(1);
    setTotalScore(0);
    setLevelRewards([]);
    setGameOver(false);
    setStage('play');
  };

  // Render a cell in the grid
  const renderCell = (cell: Cell, rowIndex: number, colIndex: number) => {
    const isTargetCell = puzzle?.targetPosition.row === rowIndex && puzzle?.targetPosition.col === colIndex;
    
    return (
      <div 
        key={`cell-${rowIndex}-${colIndex}`}
        className={`w-12 h-12 flex items-center justify-center rounded-md border-2 ${
          isTargetCell 
            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
            : cell.shape === null
              ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }`}
      >
        {isTargetCell && selectedShape ? (
          COLORED_SHAPE_COMPONENTS[selectedShape]
        ) : cell.shape ? (
          SHAPE_COMPONENTS[cell.shape]
        ) : isTargetCell ? (
          <HelpCircle className="h-6 w-6 text-blue-500" />
        ) : null}
      </div>
    );
  };

  // Configuration screen component
  const renderConfig = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Geo Sudo Challenge</CardTitle>
        <CardDescription className="text-center">
          Solve geometric Sudoku-style puzzles with shape placement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-3 text-lg font-medium">Select Difficulty</h3>
          <Tabs 
            defaultValue="medium" 
            value={difficulty}
            onValueChange={(value) => setDifficulty(value as Difficulty)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="easy">Easy</TabsTrigger>
              <TabsTrigger value="medium">Medium</TabsTrigger>
              <TabsTrigger value="hard">Hard</TabsTrigger>
              <TabsTrigger value="expert">Expert</TabsTrigger>
            </TabsList>
            <TabsContent value="easy" className="space-y-2">
              <div className="p-4 border rounded-md">
                <h4 className="font-medium">Easy Mode</h4>
                <ul className="mt-2 text-sm list-disc list-inside">
                  <li>5 levels to complete</li>
                  <li>4×4 grids</li>
                  <li>More time per level</li>
                  <li>Standard scoring</li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="medium" className="space-y-2">
              <div className="p-4 border rounded-md">
                <h4 className="font-medium">Medium Mode</h4>
                <ul className="mt-2 text-sm list-disc list-inside">
                  <li>8 levels to complete</li>
                  <li>4×4 and 5×5 grids</li>
                  <li>Moderate time pressure</li>
                  <li>1.5× score multiplier</li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="hard" className="space-y-2">
              <div className="p-4 border rounded-md">
                <h4 className="font-medium">Hard Mode</h4>
                <ul className="mt-2 text-sm list-disc list-inside">
                  <li>10 levels to complete</li>
                  <li>4×4, 5×5, and 6×6 grids</li>
                  <li>Challenging time limits</li>
                  <li>2× score multiplier</li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="expert" className="space-y-2">
              <div className="p-4 border rounded-md">
                <h4 className="font-medium">Expert Mode</h4>
                <ul className="mt-2 text-sm list-disc list-inside">
                  <li>12 challenging levels</li>
                  <li>Mostly 5×5 and 6×6 grids</li>
                  <li>Strict time limits</li>
                  <li>3× score multiplier</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="show-instructions" 
              checked={showInstructions}
              onCheckedChange={(checked) => setShowInstructions(checked as boolean)}
            />
            <Label htmlFor="show-instructions">Show game instructions</Label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={startGame} size="lg">
          Start Game
        </Button>
      </CardFooter>
    </Card>
  );

  // Instructions screen component
  const renderInstructions = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">How to Play Geo Sudo Challenge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Game Rules:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>You are given a grid where one position is empty (highlighted in blue)</li>
              <li>Each geometric shape can only appear once in any row or column</li>
              <li>You need to determine which shape belongs in the empty position</li>
              <li>Just like in Sudoku, use the existing patterns to deduce the missing shape</li>
              <li>Select a shape from the options and submit your answer</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Scoring:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Each level has a time limit that decreases as you progress</li>
              <li>Level rewards are calculated as: (Level)² × (Difficulty Multiplier) / (Time taken in seconds)</li>
              <li>Difficulty multipliers: Easy (1×), Medium (1.5×), Hard (2×), Expert (3×)</li>
              <li>Your total score is the sum of all level rewards</li>
              <li>The faster you solve each puzzle, the higher your score</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">Penalties:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Each incorrect answer will deduct time from your timer:
                <ul className="list-disc pl-5 mt-1">
                  <li>Easy: 15 seconds</li>
                  <li>Medium: 20 seconds</li>
                  <li>Hard: 25 seconds</li>
                  <li>Expert: 30 seconds</li>
                </ul>
              </li>
              <li>Each incorrect answer will also reduce your level score:
                <ul className="list-disc pl-5 mt-1">
                  <li>Easy: 20% reduction per wrong answer</li>
                  <li>Medium: 25% reduction per wrong answer</li>
                  <li>Hard: 30% reduction per wrong answer</li>
                  <li>Expert: 35% reduction per wrong answer</li>
                </ul>
              </li>
              <li>Be careful! Too many wrong answers can significantly impact your score!</li>
            </ul>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox 
              id="agree-instructions" 
              checked={agreedToInstructions}
              onCheckedChange={(checked) => setAgreedToInstructions(checked as boolean)}
            />
            <Label htmlFor="agree-instructions">I understand the rules</Label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStage('config')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button 
          onClick={() => setStage('play')} 
          disabled={!agreedToInstructions}
        >
          Start Game <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  // Game board screen component
  const renderGameBoard = () => {
    if (!puzzle) return null;
    
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <Badge variant="outline" className="text-lg font-semibold px-3 py-1">
              Level {currentLevel} ({difficulty})
            </Badge>
            <div className="flex items-center">
              <Timer className="mr-2 h-5 w-5 text-orange-500" />
              <span 
                className={`font-mono text-lg transition-all duration-300 ${
                  timePenaltyFlash 
                    ? 'text-red-600 dark:text-red-400 font-bold scale-110' 
                    : ''
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center mt-2">Geo Sudo Challenge</CardTitle>
          <p className="text-center text-muted-foreground mt-1">
            Select the correct shape for the highlighted position
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {/* Grid */}
          <div className="grid gap-2" style={{
            gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`
          }}>
            {puzzle.grid.map((row, rowIndex) => (
              row.map((cell, colIndex) => {
                const isTarget = rowIndex === puzzle.targetPosition[0] && colIndex === puzzle.targetPosition[1];
                const isEmpty = cell.shape === null;
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cn(
                      "w-16 h-16 flex items-center justify-center border-2 rounded-lg transition-all",
                      isEmpty ? "bg-gray-50 dark:bg-gray-800" : "bg-white dark:bg-gray-700",
                      isTarget ? "border-blue-500 dark:border-blue-400" : "border-gray-200 dark:border-gray-600"
                    )}
                  >
                    {cell.shape && (
                      <div className="w-10 h-10">
                        {SHAPE_COMPONENTS[cell.shape]}
                      </div>
                    )}
                    {isTarget && !cell.shape && (
                      <HelpCircle className="w-10 h-10 text-blue-500 dark:text-blue-400" />
                    )}
                  </div>
                );
              })
            ))}
          </div>
          
          {/* Shape selection */}
          <div className="w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3 text-center">Select a shape:</h3>
            <div className="flex justify-center gap-4">
              {puzzle.optionShapes.map((shape) => (
                <div
                  key={shape}
                  className={cn(
                    "w-16 h-16 flex items-center justify-center border-2 rounded-lg cursor-pointer",
                    selectedShape === shape 
                      ? "border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-700" 
                      : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                  )}
                  onClick={() => handleShapeSelect(shape)}
                >
                  <div className="w-10 h-10">
                    {SHAPE_COMPONENTS[shape]}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Button
            className="w-full max-w-xs mt-4"
            size="lg"
            onClick={handleSubmitAnswer}
            disabled={selectedShape === null}
          >
            Submit Answer
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Report screen component
  const renderReport = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <Trophy className="h-12 w-12 text-yellow-500" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">Game Complete!</CardTitle>
        <CardDescription className="text-center text-lg">
          You reached Level {currentLevel} in {difficulty} mode and earned {totalScore.toFixed(2)} points
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Level Rewards:</h3>
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time (sec)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Wrong Answers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Formula</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reward</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {levelRewards.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.level}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.timeTaken}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.wrongAnswers > 0 ? (
                        <span className="text-red-500">{item.wrongAnswers}</span>
                      ) : (
                        <span className="text-green-500">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                      ({item.level}² × {difficulty === 'easy' ? '1' : difficulty === 'medium' ? '1.5' : difficulty === 'hard' ? '2' : '3'}) / {item.timeTaken}
                      {item.wrongAnswers > 0 ? ` × ${(1 - (item.wrongAnswers * LEVEL_SETTINGS[difficulty].scorePenalty)).toFixed(2)}` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{item.reward.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" colSpan={4}>Total Score</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{totalScore.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={restartGame}>
          <RotateCcw className="mr-2 h-4 w-4" /> Play Again
        </Button>
        <Button onClick={finishGame}>
          Finish <Check className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  // Main render function
  return (
    <div className="w-full p-4 flex flex-col items-center">
      {stage === 'config' && renderConfig()}
      {stage === 'instructions' && renderInstructions()}
      {stage === 'play' && renderGameBoard()}
      {stage === 'report' && renderReport()}
    </div>
  );
} 