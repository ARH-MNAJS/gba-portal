"use client";

import React from "react";
import { GameWithMetadata } from "@/lib/utils/games";
import { GameCard } from "@/components/games/game-card";
import { Skeleton } from "@/components/ui/skeleton";

interface GameGridProps {
  games: GameWithMetadata[];
  isLoading?: boolean;
  emptyMessage?: string;
  actionLabel?: string;
  onGameAction?: (game: GameWithMetadata) => void;
  renderSecondaryAction?: (game: GameWithMetadata) => React.ReactNode;
}

export function GameGrid({
  games,
  isLoading = false,
  emptyMessage = "No games found",
  actionLabel = "Play",
  onGameAction,
  renderSecondaryAction,
}: GameGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl mb-2">🎮</p>
        <h3 className="text-xl font-medium">No Games Found</h3>
        <p className="text-muted-foreground mt-1">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          actionLabel={actionLabel}
          onAction={onGameAction}
          secondaryAction={renderSecondaryAction ? renderSecondaryAction(game) : undefined}
        />
      ))}
    </div>
  );
} 