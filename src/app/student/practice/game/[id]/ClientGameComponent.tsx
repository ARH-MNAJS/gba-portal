"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "@/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { 
  fetchGame, 
  getCollegeGameAssignments, 
  updateGameStats 
} from "@/lib/utils/games";
import { getGameComponent, getGameById } from "@/games/index";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface ClientGameComponentProps {
  gameId: string;
}

export function ClientGameComponent({ gameId }: ClientGameComponentProps) {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<any | null>(null);
  const [isAssigned, setIsAssigned] = useState(false);
  
  // Get the dynamic game component
  const GameComponent = getGameComponent(gameId);

  useEffect(() => {
    async function loadGame() {
      try {
        // Check if user is authenticated
        if (sessionLoading) return;
        
        if (!user) {
          // This is expected when a user signs out, so use info level instead of error
          console.info("No authenticated user found - user may have signed out");
          setError("Please sign in to play games");
          setLoading(false);
          return;
        }
        
        // Check if user has a college assigned and try to get it if missing
        let collegeId = user.college;
        
        if (!collegeId || collegeId === "") {
          console.log("User has no college assigned, attempting to fetch from user document");
          
          // Try to fetch collegeId from the user document directly
          if (user.id) {
            const userRef = doc(db, 'users', user.id);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              collegeId = userData.college || userData.collegeId;
              console.log("Found college ID from user document:", collegeId);
            }
          }
          
          if (!collegeId || collegeId === "") {
            console.error("User has no college assigned after document check:", user);
            setError("Your account is not linked to any college. Please contact your administrator.");
            setLoading(false);
            return;
          }
        }
        
        console.log("Loading game", gameId, "for college", collegeId);
        
        // Load game data
        const gameData = await fetchGame(gameId);
        if (!gameData) {
          console.error("Game not found:", gameId);
          setError("Game not found");
          setLoading(false);
          return;
        }
        
        // Check if the game is assigned to this student's college
        const assignments = await getCollegeGameAssignments(collegeId);
        console.log("College assignments:", assignments);
        
        // Look for the game in the assignments using gameId field
        const assigned = assignments.some(assignment => assignment.gameId === gameId);
        console.log("Game assigned:", assigned);
        
        if (!assigned) {
          setIsAssigned(false);
          setError("This game is not assigned to your college");
        } else {
          setIsAssigned(true);
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
  }, [gameId, user, sessionLoading]);

  // Handle game completion
  const handleGameComplete = async (score: number, timeTaken: number) => {
    try {
      if (!user?.id) {
        toast.error("User ID not found");
        return;
      }
      
      await updateGameStats(
        gameId,
        user.id,
        score,
        timeTaken
      );
      
      toast.success("Game progress saved!");
    } catch (error) {
      console.error("Error saving game stats:", error);
      toast.error("Failed to save game progress");
    }
  };

  if (loading || sessionLoading) {
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
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6 max-w-md mx-auto text-center">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
          <p className="font-medium">{error || "Game component not found"}</p>
        </div>
        <Button onClick={() => router.push('/student/practice')}>
          Back to Practice Games
        </Button>
      </div>
    );
  }

  // If game is not assigned, don't show it
  if (!isAssigned) {
    return (
      <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-4 rounded-md mb-6 max-w-md mx-auto text-center">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
          <p className="font-medium">This game is not currently assigned to your college</p>
        </div>
        <Button onClick={() => router.push('/student/practice')}>
          Back to Practice Games
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
          <p className="text-muted-foreground">{gameMetadata?.description || "Practice Game"}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push('/student/practice')}
        >
          Back to Games
        </Button>
      </div>
      
      <div className="bg-card rounded-lg border shadow-sm">
        <GameComponent 
          studentId={user?.id || "anonymous"} 
          onComplete={handleGameComplete}
        />
      </div>
    </div>
  );
} 