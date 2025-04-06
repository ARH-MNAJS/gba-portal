"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { fetchGame } from "@/lib/utils/games";
import { getGameComponent, getGameById } from "@/games/index";

interface ClientGameComponentProps {
  gameId: string;
}

export function ClientGameComponent({ gameId }: ClientGameComponentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<any | null>(null);
  
  // Get the dynamic game component
  const GameComponent = getGameComponent(gameId);

  useEffect(() => {
    async function loadGame() {
      try {
        setLoading(true);
        const gameData = await fetchGame(gameId);
        
        if (!gameData) {
          setError("Game not found");
          setLoading(false);
          return;
        }
        
        setGame(gameData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading game:", error);
        setError("Failed to load game");
        setLoading(false);
      }
    }
    
    loadGame();
  }, [gameId]);

  // Handle game completion (admin preview - doesn't save stats)
  const handleGameComplete = (score: number, timeTaken: number) => {
    console.log("Admin preview - Game completed with score:", score, "Time taken:", timeTaken);
    // Stats are not saved for admin preview
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  if (error || !GameComponent) {
    return (
      <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
          <p className="font-medium">{error || "Game component not found"}</p>
        </div>
        <Button onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const gameMetadata = getGameById(gameId);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{gameMetadata?.name || game.name}</h1>
          <p className="text-muted-foreground">{gameMetadata?.description || "Admin Preview Mode"}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push('/admin/practice')}
        >
          Back to Games
        </Button>
      </div>
      
      <div className="bg-card rounded-lg border shadow-sm">
        <GameComponent 
          studentId="admin-preview" 
          isPreview={true}
          onComplete={handleGameComplete}
        />
      </div>
    </div>
  );
} 