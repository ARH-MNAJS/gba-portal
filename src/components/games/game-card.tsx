"use client";

import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameWithMetadata } from "@/lib/utils/games";
import { cn } from "@/lib/utils";
import { getGameColorScheme, getCategoryById } from "@/games/index";

interface GameCardProps {
  game: GameWithMetadata;
  actionLabel?: string;
  onAction?: (game: GameWithMetadata) => void;
  secondaryAction?: React.ReactNode;
}

export function GameCard({ game, actionLabel = "Play", onAction, secondaryAction }: GameCardProps) {
  const handleAction = () => {
    if (onAction) {
      onAction(game);
    }
  };

  // Get color scheme for this game
  const colorScheme = getGameColorScheme(game.id);
  
  // Get category name
  const category = getCategoryById(game.categoryId);
  const thumbnailEmoji = game.thumbnailEmoji || '🎮';

  return (
    <Card className={cn(
      "overflow-hidden pt-0 transition-all hover:shadow-md",
      colorScheme.border
    )}>
      <div className={cn(
        "h-32 flex items-center justify-center text-6xl",
        "rounded-t-lg mt-[-1px] border-b",
        colorScheme.primary,
        colorScheme.text
      )}>
        {thumbnailEmoji}
      </div>
      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{game.name}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {category?.name || game.categoryName || game.categoryId}
          </Badge>
        </div>
        {game.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {game.description}
          </p>
        )}
      </CardHeader>
      {game.stats && (
        <CardContent className="pb-0">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="font-semibold">Best Score</p>
              <p className="text-muted-foreground">{game.stats.bestScore.toFixed(1)}</p>
            </div>
            <div>
              <p className="font-semibold">Last Score</p>
              <p className="text-muted-foreground">{game.stats.lastScore.toFixed(1)}</p>
            </div>
            <div>
              <p className="font-semibold">Played</p>
              <p className="text-muted-foreground">{game.stats.plays} times</p>
            </div>
          </div>
        </CardContent>
      )}
      <CardFooter className={`${game.stats ? 'pt-4' : 'pt-0'} flex gap-2`}>
        <Button
          className="flex-1"
          onClick={handleAction}
        >
          {actionLabel}
        </Button>
        {secondaryAction}
      </CardFooter>
    </Card>
  );
} 