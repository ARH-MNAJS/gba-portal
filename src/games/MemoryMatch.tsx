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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Timer, Move, Trophy, Info, ArrowLeft } from "lucide-react";

interface MemoryMatchProps {
  studentId: string;
  isPreview?: boolean;
  onComplete?: (score: number, timeTaken: number) => void;
}

// Define difficulty settings
const DIFFICULTY_SETTINGS = {
  easy: { pairs: 6, timeLimit: 60 },
  medium: { pairs: 8, timeLimit: 90 },
  hard: { pairs: 12, timeLimit: 120 }
};

// Define card symbols
const CARD_SYMBOLS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'];

export default function MemoryMatch({ studentId, isPreview = false, onComplete }: MemoryMatchProps) {
  // Game states
  const [stage, setStage] = useState<'config' | 'instructions' | 'play' | 'report'>('config');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [cards, setCards] = useState<Array<{ id: number, symbol: string, flipped: boolean, matched: boolean }>>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [score, setScore] = useState(0);
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
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimeTaken(elapsed);
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [stage, difficulty, gameOver, isInitialized]);

  // Initialize the game with cards
  const initializeGame = () => {
    const { pairs } = DIFFICULTY_SETTINGS[difficulty];
    const symbols = CARD_SYMBOLS.slice(0, pairs);
    const cardPairs = [...symbols, ...symbols];
    
    // Shuffle cards
    const shuffledCards = cardPairs
      .map(symbol => ({ symbol, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ symbol }, index) => ({
        id: index,
        symbol,
        flipped: false,
        matched: false
      }));
      
    setCards(shuffledCards);
    setMoves(0);
    setMatchedPairs(0);
    setGameOver(false);
  };

  // Handle card flip
  const handleCardClick = (cardId: number) => {
    if (gameOver) return;
    
    // Get the card
    const clickedCard = cards.find(card => card.id === cardId);
    if (!clickedCard || clickedCard.flipped || clickedCard.matched) return;
    
    // Get already flipped cards
    const flippedCards = cards.filter(card => card.flipped && !card.matched);
    
    // If we already have 2 flipped cards, do nothing
    if (flippedCards.length >= 2) return;
    
    // Flip the card
    const updatedCards = cards.map(card => 
      card.id === cardId 
        ? { ...card, flipped: true } 
        : card
    );
    setCards(updatedCards);
    
    // If this is the second card flipped
    const newFlippedCards = updatedCards.filter(card => card.flipped && !card.matched);
    if (newFlippedCards.length === 2) {
      setMoves(moves + 1);
      
      // Check if the two cards match
      if (newFlippedCards[0].symbol === newFlippedCards[1].symbol) {
        // Mark cards as matched
        setTimeout(() => {
          setCards(prevCards => 
            prevCards.map(card => 
              (card.id === newFlippedCards[0].id || card.id === newFlippedCards[1].id)
                ? { ...card, matched: true }
                : card
            )
          );
          setMatchedPairs(prevMatched => prevMatched + 1);
          
          // Check if all pairs are matched
          if (matchedPairs + 1 === DIFFICULTY_SETTINGS[difficulty].pairs) {
            endGame();
          }
        }, 500);
      } else {
        // Flip cards back
        setTimeout(() => {
          setCards(prevCards => 
            prevCards.map(card => 
              (card.id === newFlippedCards[0].id || card.id === newFlippedCards[1].id)
                ? { ...card, flipped: false }
                : card
            )
          );
        }, 1000);
      }
    }
  };

  // End the game and calculate score
  const endGame = () => {
    setGameOver(true);
    
    // Calculate score (0-10)
    const { pairs, timeLimit } = DIFFICULTY_SETTINGS[difficulty];
    const timeBonus = Math.max(0, (timeLimit - timeTaken) / timeLimit);
    const moveEfficiency = Math.max(0, 1 - (moves / (pairs * 2.5)));
    
    const gameScore = Math.min(10, ((matchedPairs / pairs) * 6) + (timeBonus * 2) + (moveEfficiency * 2));
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
        <CardTitle>Memory Match</CardTitle>
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
                <Label htmlFor="easy">Easy (6 pairs)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Medium (8 pairs)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard" id="hard" />
                <Label htmlFor="hard">Hard (12 pairs)</Label>
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
        <CardDescription>Memory Match Game Instructions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Game Rules:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Click on cards to flip them and reveal the symbols.</li>
            <li>Try to find matching pairs of cards with the same symbol.</li>
            <li>You can only have two cards flipped at the same time.</li>
            <li>When you find a matching pair, the cards will stay face up.</li>
            <li>The game ends when you match all the pairs.</li>
            <li>Try to finish in as few moves and as quickly as possible for a better score.</li>
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
  const renderGameBoard = () => (
    <div className="w-full p-4">
      <div className="flex flex-wrap justify-between items-center mb-4">
        <div className="flex space-x-4">
          <div className="flex items-center gap-1">
            <Timer className="h-4 w-4" />
            <span className="text-sm">{timeTaken}s</span>
          </div>
          <div className="flex items-center gap-1">
            <Move className="h-4 w-4" />
            <span className="text-sm">{moves} moves</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4" />
            <span className="text-sm">{matchedPairs}/{DIFFICULTY_SETTINGS[difficulty].pairs} pairs</span>
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
      
      {showInstructions && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold mb-2">Quick Instructions:</h3>
                <ul className="list-disc pl-5 text-sm">
                  <li>Click cards to reveal symbols</li>
                  <li>Match pairs of same symbols</li>
                  <li>Complete with as few moves as possible</li>
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
      
      <div className={`grid gap-3 ${
        difficulty === 'easy' 
          ? 'grid-cols-3 sm:grid-cols-4' 
          : difficulty === 'medium' 
          ? 'grid-cols-4 sm:grid-cols-4' 
          : 'grid-cols-4 sm:grid-cols-6'
      }`}>
        {cards.map(card => (
          <div
            key={card.id}
            className={`
              aspect-square rounded-lg shadow-sm cursor-pointer transition-all
              ${card.matched ? 'bg-primary/20' : ''}
            `}
            onClick={() => handleCardClick(card.id)}
          >
            <div className="w-full h-full relative">
              {/* Card back */}
              <div 
                className={`
                  absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center
                  ${card.flipped || card.matched ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                  transition-all duration-300
                `}
              >
                <span className="text-lg font-bold">?</span>
              </div>
              
              {/* Card front */}
              <div 
                className={`
                  absolute inset-0 bg-white rounded-lg flex items-center justify-center
                  ${card.flipped || card.matched ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                  transition-all duration-300
                `}
              >
                <span className="text-3xl">{card.symbol}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Report screen
  const renderReport = () => (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Game Report</CardTitle>
        <CardDescription>Memory Match Performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-primary mb-2">{score}</div>
          <p className="text-sm text-muted-foreground">Final Score</p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label>Moves</Label>
              <span className="font-medium">{moves}</span>
            </div>
            <Progress value={Math.min(100, (moves / (DIFFICULTY_SETTINGS[difficulty].pairs * 3)) * 100)} />
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
              <Label>Pairs Matched</Label>
              <span className="font-medium">{matchedPairs}/{DIFFICULTY_SETTINGS[difficulty].pairs}</span>
            </div>
            <Progress value={(matchedPairs / DIFFICULTY_SETTINGS[difficulty].pairs) * 100} />
          </div>
        </div>
        
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Trophy className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">Performance Insights</h3>
              <p className="text-sm">
                {score >= 8 
                  ? "Excellent memory skills! You completed the game efficiently with minimal moves." 
                  : score >= 6 
                  ? "Good job! Your memory skills are solid, but with more practice you can improve even more." 
                  : "Keep practicing to enhance your memory and concentration. Try to focus on remembering card positions."}
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

      
      <div className="w-full max-w-4xl">
        {stage === 'config' && renderConfig()}
        {stage === 'instructions' && renderInstructions()}
        {stage === 'play' && renderGameBoard()}
        {stage === 'report' && renderReport()}
      </div>
    </div>
  );
} 