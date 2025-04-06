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
  X,
  Plus,
  Asterisk,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SwitchProps {
  studentId: string;
  isPreview?: boolean;
  onComplete?: (score: number, timeTaken: number) => void;
}

// Define difficulty levels
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

// Define level settings for each difficulty
const LEVEL_SETTINGS = {
  easy: {
    1: { switchCodes: ['1234', '2143', '3412', '4321'], timeLimit: 120 },
    2: { switchCodes: ['1324', '2413', '3142', '4231'], timeLimit: 110 },
    3: { switchCodes: ['1423', '2314', '3241', '4132'], timeLimit: 100 },
    4: { switchCodes: ['1342', '2431', '3124', '4213'], timeLimit: 90 },
    5: { switchCodes: ['1243', '2134', '3421', '4312'], timeLimit: 80 },
    timePenalty: 5,  // 5 seconds deducted for wrong answers
    scorePenalty: 0.1,  // 10% score reduction per wrong answer
  },
  medium: {
    1: { switchCodes: ['1234', '2143', '3412', '4321'], timeLimit: 100 },
    2: { switchCodes: ['1324', '2413', '3142', '4231'], timeLimit: 90 },
    3: { switchCodes: ['1423', '2314', '3241', '4132'], timeLimit: 80 },
    4: { switchCodes: ['1342', '2431', '3124', '4213'], timeLimit: 70 },
    5: { switchCodes: ['1243', '2134', '3421', '4312'], timeLimit: 60 },
    6: { switchCodes: ['1432', '2341', '3214', '4123'], timeLimit: 50 },
    7: { switchCodes: ['1342', '2431', '3124', '4213'], timeLimit: 45 },
    8: { switchCodes: ['1423', '2314', '3241', '4132'], timeLimit: 40 },
    timePenalty: 8,  // 8 seconds deducted for wrong answers
    scorePenalty: 0.15,  // 15% score reduction per wrong answer
  },
  hard: {
    1: { switchCodes: ['1234', '2143', '3412', '4321'], timeLimit: 90 },
    2: { switchCodes: ['1324', '2413', '3142', '4231'], timeLimit: 80 },
    3: { switchCodes: ['1423', '2314', '3241', '4132'], timeLimit: 70 },
    4: { switchCodes: ['1342', '2431', '3124', '4213'], timeLimit: 60 },
    5: { switchCodes: ['1243', '2134', '3421', '4312'], timeLimit: 50 },
    6: { switchCodes: ['1432', '2341', '3214', '4123'], timeLimit: 45 },
    7: { switchCodes: ['1342', '2431', '3124', '4213'], timeLimit: 40 },
    8: { switchCodes: ['1423', '2314', '3241', '4132'], timeLimit: 35 },
    9: { switchCodes: ['1324', '2413', '3142', '4231'], timeLimit: 30 },
    10: { switchCodes: ['1243', '2134', '3421', '4312'], timeLimit: 25 },
    timePenalty: 10,  // 10 seconds deducted for wrong answers
    scorePenalty: 0.2,  // 20% score reduction per wrong answer
  },
  expert: {
    1: { switchCodes: ['1234', '2143', '3412', '4321'], timeLimit: 60 },
    2: { switchCodes: ['1324', '2413', '3142', '4231'], timeLimit: 55 },
    3: { switchCodes: ['1423', '2314', '3241', '4132'], timeLimit: 50 },
    4: { switchCodes: ['1342', '2431', '3124', '4213'], timeLimit: 45 },
    5: { switchCodes: ['1243', '2134', '3421', '4312'], timeLimit: 40 },
    6: { switchCodes: ['1432', '2341', '3214', '4123'], timeLimit: 35 },
    7: { switchCodes: ['1342', '2431', '3124', '4213'], timeLimit: 30 },
    8: { switchCodes: ['1423', '2314', '3241', '4132'], timeLimit: 25 },
    9: { switchCodes: ['1324', '2413', '3142', '4231'], timeLimit: 20 },
    10: { switchCodes: ['1243', '2134', '3421', '4312'], timeLimit: 18 },
    11: { switchCodes: ['1432', '2341', '3214', '4123'], timeLimit: 15 },
    12: { switchCodes: ['1324', '2413', '3142', '4231'], timeLimit: 12 },
    timePenalty: 15,  // 15 seconds deducted for wrong answers
    scorePenalty: 0.25,  // 25% score reduction per wrong answer
  }
};

// Maximum levels for each difficulty
const MAX_LEVELS = {
  easy: 5,
  medium: 8,
  hard: 10,
  expert: 12
};

// Dynamically create pattern transformations (more complex for harder levels)
const createSwitchPattern = (difficulty: Difficulty, level: number) => {
  // Basic patterns for easy
  if (difficulty === 'easy') {
    return LEVEL_SETTINGS[difficulty][level as keyof typeof LEVEL_SETTINGS[typeof difficulty]].switchCodes;
  }
  
  // For medium and above, add more complexity to later levels
  const basePatterns = LEVEL_SETTINGS[difficulty][level as keyof typeof LEVEL_SETTINGS[typeof difficulty]].switchCodes;
  
  // For harder difficulties and higher levels, make the patterns more complex
  if ((difficulty === 'hard' && level > 5) || (difficulty === 'expert' && level > 3)) {
    // Add some distractors or more similar patterns to make it harder to choose
    return basePatterns;
  }
  
  return basePatterns;
};

// Define shape mapping - replacing Plus with Asterisk
const SHAPES = {
  1: { name: 'square', icon: <Square className="w-8 h-8 fill-red-500 stroke-red-700" /> },
  2: { name: 'triangle', icon: <Triangle className="w-8 h-8 fill-yellow-500 stroke-yellow-700" /> },
  3: { name: 'asterisk', icon: <Asterisk className="w-8 h-8 text-blue-500" /> },
  4: { name: 'circle', icon: <Circle className="w-8 h-8 fill-green-500 stroke-green-700" /> }
};

// Generate a random problem for the given level and difficulty
const generateProblem = (difficulty: Difficulty, level: number) => {
  // Get available codes for this level and difficulty
  const difficultySettings = LEVEL_SETTINGS[difficulty];
  const levelSettings = difficultySettings[level as keyof typeof difficultySettings] || difficultySettings[1];
  const { switchCodes, timeLimit } = levelSettings;

  // Randomly select a code
  const selectedCodeIndex = Math.floor(Math.random() * switchCodes.length);
  const selectedCode = switchCodes[selectedCodeIndex];

  // Generate input order (always 1, 2, 3, 4 in this game)
  const inputOrder = [1, 2, 3, 4];

  // Apply the selected code to generate the output
  const outputOrder = [];
  for (let i = 0; i < 4; i++) {
    const position = parseInt(selectedCode[i]) - 1;
    outputOrder[position] = inputOrder[i];
  }

  return {
    inputOrder,
    outputOrder,
    selectedCode,
    switchCodes,
    timeLimit
  };
};

export default function Switch({ studentId, isPreview = false, onComplete }: SwitchProps) {
  // Game states
  const [stage, setStage] = useState<'config' | 'instructions' | 'play' | 'report'>('config');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [problem, setProblem] = useState<{
    inputOrder: number[];
    outputOrder: number[];
    selectedCode: string;
    switchCodes: string[];
    timeLimit: number;
  } | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [levelRewards, setLevelRewards] = useState<{level: number, reward: number, timeTaken: number, wrongAnswers: number}[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [agreedToInstructions, setAgreedToInstructions] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [timePenaltyFlash, setTimePenaltyFlash] = useState(false);
  const [accumulatedPenalty, setAccumulatedPenalty] = useState(0);
  
  // Timer references
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const levelStartTimeRef = useRef<number>(0);
  const timerTickRef = useRef<number>(0); // For forcing re-renders
  const baseTimeLimitRef = useRef<number>(0);

  // Fix for auto-submit bug by using this flag to ensure initialization happens only once per stage transition
  useEffect(() => {
    // Reset initialization flag when stage changes
    setIsInitialized(false);
  }, [stage]);

  // Clean up timers on unmount or stage change
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [stage]);

  // Timer setup function - separated to make it cleaner
  const setupTimer = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Set initial values
    const now = Date.now();
    levelStartTimeRef.current = now;
    
    if (currentLevel === 1) {
      setStartTime(now);
    }

    // Initialize time left based on the current problem
    if (problem) {
      setTimeLeft(problem.timeLimit);
      baseTimeLimitRef.current = problem.timeLimit;
      setAccumulatedPenalty(0);
    }
    
    // Create new timer that ticks every 1000ms (1 second)
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - levelStartTimeRef.current) / 1000);
      const timeLimit = baseTimeLimitRef.current || 60;
      const remaining = Math.max(0, timeLimit - elapsed - accumulatedPenalty);
      
      // Update time left - this should cause a re-render
      setTimeLeft(remaining);
      
      // Force component to re-render by updating the tick ref
      timerTickRef.current += 1;
      
      // End level if time is up
      if (remaining === 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setGameOver(true);
        setStage('report');
      }
    }, 1000);
  };

  // Initialize game when level changes or stage changes to 'play'
  useEffect(() => {
    if (stage === 'play' && !gameOver && !isInitialized) {
      // Set initialized to prevent re-initialization
      setIsInitialized(true);
      
      // Initialize the level
      initializeLevel();
      
      // Setup the timer after the problem is initialized
      setupTimer();
    }
  }, [stage, currentLevel, gameOver, isInitialized]);

  // Initialize level with a new problem
  const initializeLevel = () => {
    const newProblem = generateProblem(difficulty, currentLevel);
    setProblem(newProblem);
    setUserAnswer('');
    setFeedback(null);
    setTimeLeft(newProblem.timeLimit);
    setWrongAnswers(0);
    setAccumulatedPenalty(0);
  };

  // Handle user answer submission
  const handleSubmitAnswer = () => {
    if (!problem || userAnswer.length !== 4) return;
    
    const isCorrect = userAnswer === problem.selectedCode;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
      // Pause the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Calculate reward with bonus for faster completion
      const timeSpent = Math.max(1, Math.floor((Date.now() - levelStartTimeRef.current) / 1000) + accumulatedPenalty);
      
      // More points for harder difficulties
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
      
      // Update total score and level rewards
      setTotalScore(prevScore => prevScore + reward);
      setLevelRewards(prev => [...prev, { 
        level: currentLevel, 
        reward, 
        timeTaken: timeSpent,
        wrongAnswers 
      }]);
      
      // Move to next level or finish game
      const maxLevel = MAX_LEVELS[difficulty];
      if (currentLevel < maxLevel) {
        setTimeout(() => {
          setCurrentLevel(prev => prev + 1);
          setFeedback(null);
          setIsInitialized(false); // Reset initialization flag for next level
          // The timer will be set up again when the level is initialized
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
      
      // Reset the flash after a brief period
      setTimeout(() => {
        setTimePenaltyFlash(false);
      }, 800);
      
      // Allow retry after feedback
      setTimeout(() => {
        setUserAnswer('');
        setFeedback(null);
      }, 1500);
    }
  };

  // Start game from configuration
  const startGame = () => {
    if (showInstructions && !agreedToInstructions) {
      setStage('instructions');
    } else {
      setCurrentLevel(1);
      setTotalScore(0);
      setLevelRewards([]);
      setGameOver(false);
      setStage('play');
    }
  };

  // Finish game and report score
  const finishGame = () => {
    // Stop any running timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (onComplete && !isPreview) {
      const totalTimeTaken = Math.floor((Date.now() - startTime) / 1000);
      onComplete(totalScore, totalTimeTaken);
    }
    
    // Reset game state for potential replay
    setCurrentLevel(1);
    setTotalScore(0);
    setLevelRewards([]);
    setStage('config');
  };

  // Render shape based on number
  const renderShape = (num: number) => {
    return (
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 border">
          {SHAPES[num as keyof typeof SHAPES]?.icon || num}
        </div>
      </div>
    );
  };

  // Configuration screen
  const renderConfig = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Switch Challenge</CardTitle>
        <CardDescription className="text-center">
          Decode the pattern that transforms shapes through the switch
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
                  <li>More time per level</li>
                  <li>Standard scoring</li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="medium" className="space-y-2">
              <div className="p-4 border rounded-md">
                <h4 className="font-medium">Medium Mode</h4>
                <ul className="mt-2 text-sm list-disc list-inside">
                  <li>7 levels to complete</li>
                  <li>Moderate time pressure</li>
                  <li>1.5× score multiplier</li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="hard" className="space-y-2">
              <div className="p-4 border rounded-md">
                <h4 className="font-medium">Hard Mode</h4>
                <ul className="mt-2 text-sm list-disc list-inside">
                  <li>9 levels to complete</li>
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

  // Instructions screen
  const renderInstructions = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">How to Play Switch Challenge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Game Rules:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>This game tests your ability to predict how switches transform input to output</li>
              <li>You'll see an input row of shapes and an output row with the shapes rearranged</li>
              <li>Your task is to figure out the pattern of transformation (the switch code)</li>
              <li>Select the shapes in the order you think they would need to be arranged to get the output</li>
              <li>The difficulty increases with each level, with less time and more complex patterns</li>
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
                  <li>Easy: 5 seconds</li>
                  <li>Medium: 8 seconds</li>
                  <li>Hard: 10 seconds</li>
                  <li>Expert: 15 seconds</li>
                </ul>
              </li>
              <li>Each incorrect answer will also reduce your level score:
                <ul className="list-disc pl-5 mt-1">
                  <li>Easy: 10% reduction per wrong answer</li>
                  <li>Medium: 15% reduction per wrong answer</li>
                  <li>Hard: 20% reduction per wrong answer</li>
                  <li>Expert: 25% reduction per wrong answer</li>
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

  // Game play screen
  const renderGameBoard = () => {
    if (!problem) return null;
    
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
          <CardTitle className="text-2xl font-bold text-center mt-2">Switch Challenge</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {/* Problem visualization - redesigned to match image */}
          <div className="w-full max-w-2xl flex flex-col items-center">
            {/* Input shapes at top */}
            <div className="flex justify-center gap-4 mb-4">
              {problem.inputOrder.map((num, idx) => (
                <div key={`input-${idx}`} className="flex flex-col items-center">
                  <div className="w-16 h-16 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 border">
                    {SHAPES[num as keyof typeof SHAPES]?.icon || num}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Switch mechanism */}
            <div className="relative my-4 flex flex-col items-center">
              {/* Funnel top */}
              <div className="w-8 h-4 bg-gray-400 dark:bg-gray-600"></div>
              
              {/* Switch box with codes */}
              <div className="flex items-center justify-center">
                <div className="relative flex flex-row">
                  {problem.switchCodes.map((code, idx) => (
                    <div 
                      key={`switch-${idx}`} 
                      className={`w-24 h-10 border border-gray-400 flex items-center justify-center 
                                 ${idx === 0 ? 'rounded-l-md' : ''} 
                                 ${idx === problem.switchCodes.length - 1 ? 'rounded-r-md' : ''}
                                 bg-gray-100 dark:bg-gray-800`}
                    >
                      <span className="font-mono text-lg">{code}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Funnel bottom */}
              <div className="w-8 h-4 bg-gray-400 dark:bg-gray-600"></div>
            </div>
            
            {/* Output shapes at bottom */}
            <div className="flex justify-center gap-4 mt-4">
              {problem.outputOrder.map((num, idx) => (
                <div key={`output-${idx}`} className="flex flex-col items-center">
                  <div className="w-16 h-16 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 border">
                    {SHAPES[num as keyof typeof SHAPES]?.icon || num}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Answer section */}
            <div className="mt-12 w-full">
              <h3 className="font-semibold text-xl text-center mb-4">Which code was used?</h3>
              <div className="flex justify-center gap-6">
                <RadioGroup
                  value={userAnswer}
                  onValueChange={setUserAnswer}
                  className="flex gap-6"
                >
                  {problem.switchCodes.map((code) => (
                    <div key={code} className="flex items-center space-x-2">
                      <RadioGroupItem value={code} id={`code-${code}`} />
                      <Label htmlFor={`code-${code}`} className="font-mono text-lg">{code}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
            
            {/* Feedback section */}
            {feedback && (
              <div className={`p-4 rounded-md flex items-center justify-center mt-8 w-full ${
                feedback === 'correct' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
              }`}>
                {feedback === 'correct' ? (
                  <>
                    <Check className="mr-2 h-6 w-6 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-lg">
                      Correct! Moving to next level...
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-2 h-6 w-6 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-lg">
                      Incorrect. Try again!
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pt-4">
          <Button 
            onClick={handleSubmitAnswer} 
            size="lg"
            disabled={!userAnswer || feedback !== null}
            className="px-8 py-6 text-lg"
          >
            Submit Answer
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Report screen
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
        <Button variant="outline" onClick={() => {
          setCurrentLevel(1);
          setTotalScore(0);
          setLevelRewards([]);
          setGameOver(false);
          setIsInitialized(false);
          setStage('play');
        }}>
          <RotateCcw className="mr-2 h-4 w-4" /> Play Again
        </Button>
        <Button onClick={finishGame}>
          Finish <Check className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  // Render the appropriate screen based on the game stage
  return (
    <div className="w-full p-4 flex flex-col items-center">
      {stage === 'config' && renderConfig()}
      {stage === 'instructions' && renderInstructions()}
      {stage === 'play' && renderGameBoard()}
      {stage === 'report' && renderReport()}
    </div>
  );
} 