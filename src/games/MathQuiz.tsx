"use client";

import { useState, useEffect } from 'react';
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
import {
  Trophy,
  Timer,
  Info,
  ArrowLeft,
  RotateCcw,
  Plus,
  Minus,
  X,
  Divide,
  Check,
  AlertCircle
} from "lucide-react";

interface MathQuizProps {
  studentId: string;
  isPreview?: boolean;
  onComplete?: (score: number, timeTaken: number) => void;
}

// Define difficulty settings
const DIFFICULTY_SETTINGS = {
  easy: { 
    questionCount: 10, 
    timeLimit: 120,
    operations: ['+', '-'],
    maxNumber: 20
  },
  medium: { 
    questionCount: 15, 
    timeLimit: 180,
    operations: ['+', '-', '*'],
    maxNumber: 50
  },
  hard: { 
    questionCount: 20, 
    timeLimit: 240,
    operations: ['+', '-', '*', '/'],
    maxNumber: 100
  }
};

// Helper to generate random integer between min and max (inclusive)
const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generate a math question based on difficulty
const generateQuestion = (difficulty: 'easy' | 'medium' | 'hard'): {
  question: string;
  answer: number;
  operation: string;
} => {
  const { operations, maxNumber } = DIFFICULTY_SETTINGS[difficulty];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1: number, num2: number, answer: number;
  
  switch (operation) {
    case '+':
      num1 = getRandomInt(1, maxNumber);
      num2 = getRandomInt(1, maxNumber);
      answer = num1 + num2;
      return { question: `${num1} + ${num2}`, answer, operation };
      
    case '-':
      // Ensure the result is positive
      num1 = getRandomInt(1, maxNumber);
      num2 = getRandomInt(1, num1);
      answer = num1 - num2;
      return { question: `${num1} - ${num2}`, answer, operation };
      
    case '*':
      // Make multiplication more manageable
      num1 = getRandomInt(1, Math.min(12, maxNumber / 2));
      num2 = getRandomInt(1, Math.min(12, maxNumber / num1));
      answer = num1 * num2;
      return { question: `${num1} × ${num2}`, answer, operation };
      
    case '/':
      // Generate division with whole number results
      num2 = getRandomInt(1, 12);
      answer = getRandomInt(1, Math.min(10, maxNumber / num2));
      num1 = num2 * answer;
      return { question: `${num1} ÷ ${num2}`, answer, operation };
      
    default:
      return generateQuestion(difficulty);
  }
};

export default function MathQuiz({ studentId, isPreview = false, onComplete }: MathQuizProps) {
  // Game states
  const [stage, setStage] = useState<'config' | 'instructions' | 'play' | 'report'>('config');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [questions, setQuestions] = useState<Array<{
    question: string;
    answer: number;
    userAnswer?: number;
    isCorrect?: boolean;
    operation: string;
    timeSpent?: number;
  }>>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
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
      setQuestionStartTime(Date.now());
      
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

  // Initialize the game with questions
  const initializeGame = () => {
    const { questionCount } = DIFFICULTY_SETTINGS[difficulty];
    const generatedQuestions = [];
    
    for (let i = 0; i < questionCount; i++) {
      generatedQuestions.push(generateQuestion(difficulty));
    }
    
    setQuestions(generatedQuestions);
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setShowResult(false);
    setCorrectAnswers(0);
    setGameOver(false);
    setTimeLeft(DIFFICULTY_SETTINGS[difficulty].timeLimit);
  };

  // Submit answer for current question
  const handleSubmitAnswer = () => {
    if (userAnswer.trim() === '') return;
    
    const answerValue = parseFloat(userAnswer);
    if (isNaN(answerValue)) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = Math.abs(answerValue - currentQuestion.answer) < 0.001; // Handle floating point precision
    
    // Calculate time spent on this question
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    
    // Update questions array with user's answer
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = {
      ...currentQuestion,
      userAnswer: answerValue,
      isCorrect,
      timeSpent
    };
    
    setQuestions(updatedQuestions);
    if (isCorrect) {
      setCorrectAnswers(correctAnswers + 1);
    }
    
    setShowResult(true);
    
    // Move to next question after a delay
    setTimeout(() => {
      if (currentQuestionIndex + 1 < questions.length) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setUserAnswer('');
        setShowResult(false);
        setQuestionStartTime(Date.now());
      } else {
        endGame();
      }
    }, 1500);
  };

  // End the game and calculate score
  const endGame = () => {
    setGameOver(true);
    
    // Calculate score (0-10)
    const { questionCount } = DIFFICULTY_SETTINGS[difficulty];
    const correctPercentage = correctAnswers / questionCount;
    
    // Calculate average time per question (exclude unanswered questions)
    const answeredQuestions = questions.filter(q => q.userAnswer !== undefined);
    const avgTimePerQuestion = answeredQuestions.length > 0
      ? answeredQuestions.reduce((sum, q) => sum + (q.timeSpent || 0), 0) / answeredQuestions.length
      : 0;
    
    // Speed score component (faster = better)
    const speedScore = Math.max(0, 1 - (avgTimePerQuestion / 15)); // 15 seconds as benchmark
    
    // Final score calculation
    const gameScore = Math.min(10, (correctPercentage * 8) + (speedScore * 2));
    setScore(Number(gameScore.toFixed(1)));
    
    setStage('report');
    
    // Call onComplete if provided
    if (onComplete && !isPreview) {
      onComplete(gameScore, timeTaken);
    }
  };

  // Get operation icon
  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case '+': return <Plus className="h-4 w-4" />;
      case '-': return <Minus className="h-4 w-4" />;
      case '*': return <X className="h-4 w-4" />;
      case '/': return <Divide className="h-4 w-4" />;
      default: return null;
    }
  };

  // Configuration screen
  const renderConfig = () => (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Math Quiz</CardTitle>
        <CardDescription>Configure your quiz settings</CardDescription>
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
                <Label htmlFor="easy">Easy (Addition, Subtraction)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Medium (+ Multiplication)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard" id="hard" />
                <Label htmlFor="hard">Hard (+ Division)</Label>
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
        <CardDescription>Math Quiz Instructions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Game Rules:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>You will be presented with a series of math problems to solve.</li>
            <li>Type your answer in the input field and click Submit.</li>
            <li>For division problems, round to the nearest whole number if necessary.</li>
            <li>Try to answer correctly and quickly for a better score.</li>
            <li>The game ends when you've answered all questions or when time runs out.</li>
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
          Start Quiz
        </Button>
      </CardFooter>
    </Card>
  );

  // Game board
  const renderGameBoard = () => {
    if (questions.length === 0) return <div>Loading...</div>;
    
    const currentQuestion = questions[currentQuestionIndex];
    
    return (
      <div className="w-full p-4">
        <div className="flex flex-wrap justify-between items-center mb-4">
          <div className="flex space-x-4">
            <div className="flex items-center gap-1">
              <Timer className="h-4 w-4" />
              <span className="text-sm">{timeLeft}s left</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              <span className="text-sm">{correctAnswers} correct</span>
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
          <Progress value={((currentQuestionIndex) / questions.length) * 100} />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestionIndex) / questions.length) * 100)}% complete</span>
          </div>
        </div>
        
        {showInstructions && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold mb-2">Quick Instructions:</h3>
                  <ul className="list-disc pl-5 text-sm">
                    <li>Solve the math problem</li>
                    <li>Type your answer and submit</li>
                    <li>Try to be both fast and accurate</li>
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
              <div className="flex items-center justify-center gap-2 mb-2">
                <Badge variant="outline" className="font-normal">
                  {getOperationIcon(currentQuestion.operation)}
                  <span className="ml-1">
                    {currentQuestion.operation === '+' ? 'Addition' : 
                     currentQuestion.operation === '-' ? 'Subtraction' : 
                     currentQuestion.operation === '*' ? 'Multiplication' : 'Division'}
                  </span>
                </Badge>
              </div>
              
              <div>
                <Label htmlFor="question" className="text-sm font-medium mb-2 block">
                  Solve this problem:
                </Label>
                <div className="text-4xl font-bold tracking-wider">
                  {currentQuestion.question} = ?
                </div>
              </div>
              
              <div className="max-w-xs mx-auto">
                <Label htmlFor="answer" className="sr-only">Your answer</Label>
                <div className="relative">
                  <Input
                    id="answer"
                    type="number"
                    placeholder="Type your answer"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && userAnswer.trim() !== '') {
                        handleSubmitAnswer();
                      }
                    }}
                    className={`
                      text-center text-lg
                      ${showResult && questions[currentQuestionIndex].isCorrect 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : ''}
                      ${showResult && !questions[currentQuestionIndex].isCorrect 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                        : ''}
                    `}
                    disabled={showResult}
                  />
                  {showResult && questions[currentQuestionIndex].isCorrect && (
                    <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-500">
                      Correct!
                    </Badge>
                  )}
                  {showResult && !questions[currentQuestionIndex].isCorrect && (
                    <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500">
                      Incorrect
                    </Badge>
                  )}
                </div>
                
                {showResult && !questions[currentQuestionIndex].isCorrect && (
                  <p className="text-sm text-center mt-2">
                    Correct answer: {questions[currentQuestionIndex].answer}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              onClick={handleSubmitAnswer}
              disabled={userAnswer.trim() === '' || showResult}
            >
              Submit Answer
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  // Report screen with breakdown by operation type
  const renderReport = () => {
    // Calculate stats by operation
    const statsByOperation: Record<string, { total: number, correct: number }> = {};
    
    questions.forEach(q => {
      if (!statsByOperation[q.operation]) {
        statsByOperation[q.operation] = { total: 0, correct: 0 };
      }
      
      statsByOperation[q.operation].total++;
      if (q.isCorrect) {
        statsByOperation[q.operation].correct++;
      }
    });
    
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Quiz Report</CardTitle>
          <CardDescription>Math Quiz Performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2">{score}</div>
            <p className="text-sm text-muted-foreground">Final Score</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label>Correct Answers</Label>
                <span className="font-medium">{correctAnswers}/{questions.length}</span>
              </div>
              <Progress value={(correctAnswers / questions.length) * 100} />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label>Time Taken</Label>
                <span className="font-medium">{timeTaken}s</span>
              </div>
              <Progress value={Math.min(100, (timeTaken / DIFFICULTY_SETTINGS[difficulty].timeLimit) * 100)} />
            </div>
            
            {/* Performance by operation type */}
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">Performance by Operation Type</h3>
              <div className="space-y-3">
                {Object.entries(statsByOperation).map(([op, stats]) => (
                  <div key={op} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        {getOperationIcon(op)}
                        <span className="ml-2">
                          {op === '+' ? 'Addition' : 
                           op === '-' ? 'Subtraction' : 
                           op === '*' ? 'Multiplication' : 'Division'}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {stats.correct}/{stats.total} ({Math.round((stats.correct / stats.total) * 100)}%)
                      </span>
                    </div>
                    <Progress value={(stats.correct / stats.total) * 100} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Trophy className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">Performance Insights</h3>
                <p className="text-sm">
                  {score >= 8 
                    ? "Excellent math skills! You demonstrated strong arithmetic abilities and quick calculation skills." 
                    : score >= 6 
                    ? "Good job! Your math skills are developing well. Continue practicing to improve your speed and accuracy." 
                    : "Keep practicing to enhance your basic math skills. Focus on the operations where you had the most difficulty."}
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
            Exit Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Render the appropriate screen based on game stage
  return (
    <div className="container mx-auto py-6 min-h-[500px] flex items-center justify-center">

      
      <div className="w-full max-w-4xl">
        {stage === 'config' && renderConfig()}
        {stage === 'instructions' && renderInstructions()}
        {stage === 'play' && renderGameBoard()}
        {stage === 'report' && renderReport()}
      </div>
    </div>
  );
} 