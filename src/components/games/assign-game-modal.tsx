"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  fetchGames, 
  Game, 
  GameWithMetadata, 
  enrichGame,
  enrichGames
} from "@/lib/utils/games";
import { Skeleton } from "@/components/ui/skeleton";
import { GameCard } from "@/components/games/game-card";

interface College {
  id: string;
  name: string;
}

interface AssignGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (collegeId: string, gameId: string) => Promise<void>;
  colleges: College[];
  isLoading?: boolean;
  title?: string;
  preselectedCollegeId?: string;
}

export function AssignGameModal({
  open,
  onOpenChange,
  onAssign,
  colleges,
  isLoading = false,
  title = "Assign Game to College",
  preselectedCollegeId,
}: AssignGameModalProps) {
  const [selectedCollege, setSelectedCollege] = useState<string>(preselectedCollegeId || "");
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [games, setGames] = useState<Game[]>([]);
  const [enrichedGames, setEnrichedGames] = useState<GameWithMetadata[]>([]);
  const [loadingGames, setLoadingGames] = useState<boolean>(false);

  // Load all games
  useEffect(() => {
    if (open) {
      const loadGames = async () => {
        setLoadingGames(true);
        try {
          const allGames = await fetchGames();
          setGames(allGames);
          
          // Create enriched versions for display
          const enriched = await Promise.all(allGames.map(game => enrichGame(game)));
          setEnrichedGames(enriched);
        } catch (error) {
          console.error("Error loading games:", error);
        } finally {
          setLoadingGames(false);
        }
      };
      
      loadGames();
    }
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      if (!preselectedCollegeId) {
        setSelectedCollege("");
      }
      setSelectedGame("");
    } else if (preselectedCollegeId) {
      setSelectedCollege(preselectedCollegeId);
    }
  }, [open, preselectedCollegeId]);

  const handleSubmit = async () => {
    if (selectedCollege && selectedGame) {
      await onAssign(selectedCollege, selectedGame);
      onOpenChange(false);
    }
  };

  const selectedGameData = enrichedGames.find(game => game.id === selectedGame);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {preselectedCollegeId ? "Select a game to assign." : "Select a college and a game to assign."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {!preselectedCollegeId && (
            <div className="space-y-2">
              <Label htmlFor="college">College</Label>
              <Select 
                value={selectedCollege} 
                onValueChange={setSelectedCollege}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a college" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((college) => (
                    <SelectItem key={college.id} value={college.id}>
                      {college.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Game</Label>
            
            {loadingGames ? (
              <div className="space-y-2">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : enrichedGames.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1">
                {enrichedGames.map((game) => (
                  <div 
                    key={game.id} 
                    className={`cursor-pointer transition-all ${selectedGame === game.id ? 'ring-2 ring-primary rounded-lg' : ''}`}
                    onClick={() => setSelectedGame(game.id)}
                  >
                    <GameCard 
                      game={game} 
                      actionLabel="Select"
                      onAction={() => setSelectedGame(game.id)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 border rounded-lg">
                <p className="text-muted-foreground">No games available</p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedCollege || !selectedGame || isLoading}
          >
            {isLoading ? "Assigning..." : "Assign Game"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 