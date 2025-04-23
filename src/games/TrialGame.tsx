'use client';

import React, { useState, useEffect } from 'react';
import { GamepadIcon, Brain, Lightbulb, Puzzle, Dices, Sparkles } from 'lucide-react';
import WordScramble from './WordScramble';
import { Button } from '@/components/ui/button';

// Background icons component for decoration
const BackgroundIcons = () => {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-[0.03] pointer-events-none">
      <div className="absolute top-5 left-5 text-foreground dark:text-foreground w-16 h-16">
        <Brain className="w-full h-full" />
      </div>
      <div className="absolute bottom-10 left-10 text-foreground dark:text-foreground w-12 h-12">
        <Dices className="w-full h-full" />
      </div>
      <div className="absolute top-20 right-5 text-foreground dark:text-foreground w-14 h-14">
        <Puzzle className="w-full h-full" />
      </div>
      <div className="absolute bottom-5 right-10 text-foreground dark:text-foreground w-10 h-10">
        <Lightbulb className="w-full h-full" />
      </div>
      <div className="absolute bottom-32 left-1/4 text-foreground dark:text-foreground w-14 h-14">
        <Sparkles className="w-full h-full" />
      </div>
    </div>
  );
};

// Loading animation component
const GameLoader = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const loadingSteps = [
    "Loading Game Engine",
    "Running Question Algorithm",
    "Formatting Game",
    "Adding Visuals",
    "Happy Learning :)",
    "Starting Game..."
  ];

  // Different timing for each step
  const stepTimes = [800, 1800, 800, 800, 1500, 200]; // Adjusted timing for visibility

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted) return;
      
      if (step < loadingSteps.length - 1) {
        setStep(step + 1);
      } else {
        setTimeout(() => {
          if (isMounted) {
            onComplete();
          }
        }, 100);
      }
    }, stepTimes[step]);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [step, loadingSteps.length, onComplete, stepTimes]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="relative mb-6">
        <div className="w-12 h-12 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        <div className="w-8 h-8 absolute top-2 left-2 rounded-full border-4 border-t-transparent border-r-primary border-b-transparent border-l-transparent animate-spin"></div>
      </div>
      <div className="text-xl font-semibold mb-2">{loadingSteps[step]}</div>
      <div className="flex space-x-2 mt-4">
        {loadingSteps.map((_, i) => (
          <div 
            key={i} 
            className={`w-2 h-2 rounded-full ${i === step ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
          />
        ))}
      </div>
    </div>
  );
};

// Custom WordScramble wrapper with modified end screen
const CustomWordScramble = ({ onReset }: { onReset: () => void }) => {
  // Game state to handle our own end screen
  const [showingEndScreen, setShowingEndScreen] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalTimeTaken, setFinalTimeTaken] = useState(0);

  // Override the onComplete function to show our custom end screen
  const wrappedOnComplete = (score: number, timeTaken: number) => {
    console.log("Game completed with score:", score, "in time:", timeTaken);
    setFinalScore(score);
    setFinalTimeTaken(timeTaken);
    setShowingEndScreen(true);
  };

  // Custom end screen component
  const renderCustomEndScreen = () => (
    <div className="max-w-md mx-auto bg-card rounded-lg shadow-md p-6 border">
      <h2 className="text-2xl font-bold text-center mb-6">Game Report</h2>
      <div className="text-center mb-6">
        <div className="text-6xl font-bold text-primary">{finalScore.toFixed(1)}</div>
        <div className="text-sm text-muted-foreground">Final Score</div>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Words Unscrambled:</span>
          <span className="font-medium">{Math.round(finalScore)} / 5</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Time Taken:</span>
          <span className="font-medium">{finalTimeTaken}s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Hints Used:</span>
          <span className="font-medium">0/3</span>
        </div>
      </div>
      
      <div className="bg-muted/50 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-2">
          <span className="text-yellow-500 mr-2">🏆</span>
          <span className="font-medium">Performance Insights</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Keep practicing to enhance your word recognition and pattern identification skills.
        </p>
      </div>
      
      <Button 
        className="w-full flex items-center justify-center"
        onClick={() => {
          setShowingEndScreen(false);
          onReset();
        }}
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M9 3L3.5 7L8.5 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Play Again
      </Button>
    </div>
  );

  // Render the custom end screen or the game
  return (
    <div className="w-full h-full">
      {showingEndScreen ? (
        renderCustomEndScreen()
      ) : (
        <WordScramble 
          studentId="preview" 
          isPreview={true}
          onComplete={wrappedOnComplete}
        />
      )}
    </div>
  );
};

interface TrialGameProps {
  className?: string;
}

const TrialGame: React.FC<TrialGameProps> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  const [gameKey, setGameKey] = useState(0);

  // Initialize loading state - will run only once on mount
  useEffect(() => {
    // Ensure loader is shown for at least the minimum duration
    const minLoadTime = 6000;
    const startTime = Date.now();
    
    const timer = setTimeout(() => {
      setLoading(false);
    }, minLoadTime);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Reset handler to restart the game
  const handleReset = () => {
    setLoading(true);
    // Use a key to force a complete remount of the game component
    setGameKey(prev => prev + 1);
    
    // Show loading screen again, with shorter duration on reset
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  };

  return (
    <div className={`w-full h-full relative ${className || ''}`}>
      <BackgroundIcons />
      
      {loading ? (
        <GameLoader onComplete={() => setLoading(false)} />
      ) : (
        <div className="w-full h-full overflow-auto">
          <div className="sticky top-0 left-0 right-0 text-center py-3 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-sm z-50">
            <div className="flex items-center justify-center gap-2 mb-1">
              <GamepadIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Try a Game</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 px-8">
              Challenge your mind with our word scramble puzzle
            </p>
          </div>
          <div className="w-full max-w-[600px] mx-auto pt-4 pb-12 px-2 flex items-center justify-center">
            <CustomWordScramble key={gameKey} onReset={handleReset} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TrialGame; 