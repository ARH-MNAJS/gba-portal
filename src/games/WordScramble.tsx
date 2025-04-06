"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Timer, Info, ArrowLeft, Lightbulb, RotateCcw } from "lucide-react";

interface WordScrambleProps {
  studentId: string;
  isPreview?: boolean;
  onComplete?: (score: number, timeTaken: number) => void;
}

// Define the word lists by difficulty
const WORD_LISTS = {
  easy: [
    "apple", "beach", "chair", "door", "earth", 
    "fruit", "glass", "house", "jumbo", "knife",
    "lemon", "music", "night", "ocean", "paper",
    "queen", "river", "smile", "table", "water"
  ],
  medium: [
    "ability", "balance", "channel", "diamond", "elegant",
    "fashion", "gateway", "harmony", "imagine", "journey",
    "kingdom", "leisure", "message", "natural", "opening",
    "perfect", "quality", "reality", "service", "theater"
  ],
  hard: [
    "abundance", "breakfast", "challenge", "determine", "education",
    "furniture", "gratitude", "highlight", "important", "knowledge",
    "languages", "marketing", "nutrition", "operation", "practical",
    "questions", "recognize", "synthesis", "technique", "wonderful"
  ]
};

// Define difficulty settings
const DIFFICULTY_SETTINGS = {
  easy: { wordCount: 5, timeLimit: 60, hintsAllowed: 3 },
  medium: { wordCount: 8, timeLimit: 120, hintsAllowed: 3 },
  hard: { wordCount: 10, timeLimit: 180, hintsAllowed: 3 }
};

// Function to scramble a word
const scrambleWord = (word: string): string => {
  const characters = word.split('');
  
  // Shuffle the characters
  for (let i = characters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }
  
  // Make sure the scrambled word is different from the original
  const scrambled = characters.join('');
  return scrambled === word ? scrambleWord(word) : scrambled;
};

export default function WordScramble({ studentId, isPreview = false, onComplete }: WordScrambleProps) {
  // Game states
  const [stage, setStage] = useState<'config' | 'instructions' | 'play' | 'report'>('config');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [words, setWords] = useState<Array<{ original: string, scrambled: string }>>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userGuess, setUserGuess] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hints, setHints] = useState<number>(0);
  const [score, setScore] = useState(0);
  const [correctWords, setCorrectWords] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [agreedToInstructions, setAgreedToInstructions] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fix for auto-submit bug by using this flag to ensure initialization happens only once per stage transition
  useEffect(() => {
    // Reset initialization flag when stage changes
    setIsInitialized(false);
  }, [stage]);

  // Initialize game when difficulty changes or stage changes to 'play'
  useEffect(() => {
    if (stage === 'play' && !gameOver && !isInitialized) {
      // Set initialized to prevent re-initialization
      setIsInitialized(true);
      
      initializeGame();
      setStartTime(Date.now());
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimeTaken(elapsed);
        
        // Update time left
        const timeLimit = DIFFICULTY_SETTINGS[difficulty].timeLimit;
        const remaining = Math.max(0, timeLimit - elapsed);
        setTimeLeft(remaining);
        
        // End game if time is up
        if (remaining === 0) {
          endGame();
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [stage, difficulty, gameOver, isInitialized]);

  // Initialize the game with scrambled words
  const initializeGame = () => {
    const wordList = WORD_LISTS[difficulty];
    const { wordCount } = DIFFICULTY_SETTINGS[difficulty];
    
    // Select random words from the list
    const selectedIndexes = new Set<number>();
    while (selectedIndexes.size < wordCount) {
      selectedIndexes.add(Math.floor(Math.random() * wordList.length));
    }
    
    // Create the word array with original and scrambled versions
    const selectedWords = Array.from(selectedIndexes).map(index => {
      const original = wordList[index];
      return {
        original,
        scrambled: scrambleWord(original)
      };
    });
    
    setWords(selectedWords);
    setCurrentWordIndex(0);
    setUserGuess('');
    setIsCorrect(null);
    setCorrectWords(0);
    setHints(DIFFICULTY_SETTINGS[difficulty].hintsAllowed);
    setGameOver(false);
    setTimeLeft(DIFFICULTY_SETTINGS[difficulty].timeLimit);
  };

  // Handle word submission
  const handleSubmitWord = useCallback(() => {
    const currentWord = words[currentWordIndex];
    
    // Check if the guess is correct
    const isWordCorrect = userGuess.toLowerCase() === currentWord.original.toLowerCase();
    setIsCorrect(isWordCorrect);
    
    if (isWordCorrect) {
      setCorrectWords(prev => prev + 1);
      
      // Move to next word after a brief delay
      setTimeout(() => {
        if (currentWordIndex + 1 < words.length) {
          setCurrentWordIndex(prev => prev + 1);
          setUserGuess('');
          setIsCorrect(null);
        } else {
          endGame();
        }
      }, 1000);
    } else {
      // Clear the input on wrong answer
      setTimeout(() => {
        setUserGuess('');
        setIsCorrect(null);
      }, 1000);
    }
  }, [currentWordIndex, userGuess, words]);

  // Use a hint
  const useHint = () => {
    if (hints > 0) {
      const currentWord = words[currentWordIndex];
      setUserGuess(currentWord.original[0]);
      setHints(prev => prev - 1);
    }
  };

  // Skip the current word
  const skipWord = () => {
    if (currentWordIndex + 1 < words.length) {
      setCurrentWordIndex(prev => prev + 1);
      setUserGuess('');
      setIsCorrect(null);
    } else {
      endGame();
    }
  };

  // End the game and calculate score
  const endGame = () => {
    setGameOver(true);
    
    // Calculate score (0-10)
    const { wordCount, timeLimit } = DIFFICULTY_SETTINGS[difficulty];
    const timeBonus = Math.max(0, (timeLimit - timeTaken) / timeLimit);
    const correctPercentage = correctWords / wordCount;
    
    const gameScore = Math.min(10, (correctPercentage * 7) + (timeBonus * 3));
    setScore(Number(gameScore.toFixed(1)));
    
    setStage('report');
    
    // Call onComplete if provided
    if (onComplete && !isPreview) {
      onComplete(gameScore, timeTaken);
    }
  };

  // Configuration screen
  const renderConfig = () => (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Word Scramble</CardTitle>
        <CardDescription>Configure your game settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="difficulty" className="text-base">Difficulty Level</Label>
            <RadioGroup 
              id="difficulty" 
              className="mt-2" 
              value={difficulty} 
              onValueChange={(value) => setDifficulty(value as 'easy' | 'medium' | 'hard')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="easy" id="easy" />
                <Label htmlFor="easy">Easy (5 words)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Medium (8 words)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard" id="hard" />
                <Label htmlFor="hard">Hard (10 words)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={() => setStage('instructions')}
        >
          Save and Continue
        </Button>
      </CardFooter>
    </Card>
  );

  // Instructions screen
  const renderInstructions = () => (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>How to Play</CardTitle>
        <CardDescription>Word Scramble Game Instructions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Game Rules:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>You will be shown a series of scrambled words.</li>
            <li>Try to unscramble each word and type the correct word.</li>
            <li>You can use hints to reveal the first letter of a word.</li>
            <li>You can skip a word if you're stuck, but it will count as incorrect.</li>
            <li>The game ends when you've gone through all words or when time runs out.</li>
            <li>Your score is based on the number of correct words and time taken.</li>
          </ul>
        </div>
        <div className="flex items-center space-x-2 pt-4">
          <Checkbox 
            id="agree" 
            checked={agreedToInstructions}
            onCheckedChange={() => setAgreedToInstructions(!agreedToInstructions)}
          />
          <Label htmlFor="agree">I understand the instructions</Label>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          disabled={!agreedToInstructions}
          onClick={() => setStage('play')}
        >
          Start Game
        </Button>
      </CardFooter>
    </Card>
  );

  // Game board
  const renderGameBoard = () => {
    if (words.length === 0) return <div>Loading...</div>;
    
    const currentWord = words[currentWordIndex];
    
    return (
      <div className="w-full p-4">
        <div className="flex flex-wrap justify-between items-center mb-4">
          <div className="flex space-x-4">
            <div className="flex items-center gap-1">
              <Timer className="h-4 w-4" />
              <span className="text-sm">{timeLeft}s left</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              <span className="text-sm">{correctWords}/{words.length} correct</span>
            </div>
            <div className="flex items-center gap-1">
              <Lightbulb className="h-4 w-4" />
              <span className="text-sm">{hints} hints</span>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowInstructions(!showInstructions)}
          >
            <Info className="h-4 w-4 mr-1" />
            Instructions
          </Button>
        </div>
        
        {/* Progress bar */}
        <div className="mb-6">
          <Progress value={((currentWordIndex) / words.length) * 100} />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Word {currentWordIndex + 1} of {words.length}</span>
            <span>{Math.round(((currentWordIndex) / words.length) * 100)}% complete</span>
          </div>
        </div>
        
        {showInstructions && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold mb-2">Quick Instructions:</h3>
                  <ul className="list-disc pl-5 text-sm">
                    <li>Unscramble the word</li>
                    <li>Type your answer and press Enter</li>
                    <li>Use hints if you're stuck</li>
                  </ul>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowInstructions(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="text-center space-y-6">
              <div>
                <Label htmlFor="scrambled-word" className="text-sm font-medium mb-2 block">
                  Unscramble this word:
                </Label>
                <div className="text-4xl font-bold tracking-wider">
                  {currentWord.scrambled.toUpperCase()}
                </div>
              </div>
              
              <div className="max-w-xs mx-auto">
                <Label htmlFor="word-guess" className="sr-only">Your answer</Label>
                <div className="relative">
                  <Input
                    id="word-guess"
                    type="text"
                    placeholder="Type your answer"
                    value={userGuess}
                    onChange={(e) => setUserGuess(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && userGuess.trim() !== '') {
                        handleSubmitWord();
                      }
                    }}
                    className={`
                      text-center text-lg
                      ${isCorrect === true ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
                      ${isCorrect === false ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
                    `}
                    disabled={isCorrect !== null}
                  />
                  {isCorrect === true && (
                    <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-500">
                      Correct!
                    </Badge>
                  )}
                  {isCorrect === false && (
                    <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500">
                      Try Again
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={useHint}
              disabled={hints <= 0 || isCorrect !== null}
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              Use Hint
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={skipWord}
                disabled={isCorrect !== null}
              >
                Skip
              </Button>
              <Button 
                size="sm" 
                onClick={handleSubmitWord}
                disabled={userGuess.trim() === '' || isCorrect !== null}
              >
                Submit
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  };

  // Report screen
  const renderReport = () => (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Game Report</CardTitle>
        <CardDescription>Word Scramble Performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-primary mb-2">{score}</div>
          <p className="text-sm text-muted-foreground">Final Score</p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label>Words Unscrambled</Label>
              <span className="font-medium">{correctWords}/{words.length}</span>
            </div>
            <Progress value={(correctWords / words.length) * 100} />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label>Time Taken</Label>
              <span className="font-medium">{timeTaken}s</span>
            </div>
            <Progress value={Math.min(100, (timeTaken / DIFFICULTY_SETTINGS[difficulty].timeLimit) * 100)} />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label>Hints Used</Label>
              <span className="font-medium">
                {DIFFICULTY_SETTINGS[difficulty].hintsAllowed - hints}/
                {DIFFICULTY_SETTINGS[difficulty].hintsAllowed}
              </span>
            </div>
            <Progress 
              value={((DIFFICULTY_SETTINGS[difficulty].hintsAllowed - hints) / DIFFICULTY_SETTINGS[difficulty].hintsAllowed) * 100} 
            />
          </div>
        </div>
        
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Trophy className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">Performance Insights</h3>
              <p className="text-sm">
                {score >= 8 
                  ? "Excellent vocabulary skills! You have a strong ability to recognize patterns and rearrange letters." 
                  : score >= 6 
                  ? "Good job! Your word recognition skills are solid. With more practice, you can improve even further." 
                  : "Keep practicing to enhance your word recognition and pattern identification skills."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={() => {
            setStage('config');
            setGameOver(false);
            setAgreedToInstructions(false);
          }}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Play Again
        </Button>
        <Button 
          className="flex-1" 
          onClick={() => window.history.back()}
        >
          Exit Game
        </Button>
      </CardFooter>
    </Card>
  );

  // Render the appropriate screen based on game stage
  return (
    <div className="container mx-auto py-6 min-h-[500px] flex items-center justify-center">
      {isPreview && stage === 'config' && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-center py-1 text-sm">
          Admin Preview Mode - Student statistics will not be saved
        </div>
      )}
      
      <div className="w-full max-w-4xl">
        {stage === 'config' && renderConfig()}
        {stage === 'instructions' && renderInstructions()}
        {stage === 'play' && renderGameBoard()}
        {stage === 'report' && renderReport()}
      </div>
    </div>
  );
} 