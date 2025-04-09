"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/providers/session-provider";
import { GameGrid } from "@/components/games/game-grid";
import { Badge } from "@/components/ui/badge";
import { 
  fetchGame,
  getCollegeGameAssignments,
  getGameStats,
  enrichGame,
  GameWithMetadata,
  Game,
  GameStats
} from "@/lib/utils/games";
import { getGameById } from "@/games/index";
import { GAME_CATEGORIES } from "@/lib/constants/games";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function StudentPracticePage() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [games, setGames] = useState<GameWithMetadata[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const router = useRouter();
  const { user } = useSession();

  // Load assigned games
  useEffect(() => {
    const loadAssignedGames = async () => {
      if (!user || !user.college) {
        console.log("No user or college ID found:", user);
        setIsLoading(false);
        return;
      }

      console.log("Loading games for college:", user.college);
      setIsLoading(true);
      try {
        // Get assignments for the student's college
        const assignments = await getCollegeGameAssignments(user.college);
        console.log("Assignments found:", assignments);
        
        const assignedGames: GameWithMetadata[] = [];
        const categorySet = new Set<string>();
        
        // Fetch each game and their stats for this student
        for (const assignment of assignments) {
          // Use gameId property, not id (which might be redundant)
          const gameId = assignment.gameId;
          console.log("Loading game details for:", gameId);
          
          const game = await fetchGame(gameId);
          
          if (game) {
            console.log("Game found:", game.name);
            let gameStats: GameStats | null = null;
            
            if (user.id) {
              gameStats = await getGameStats(gameId, user.id);
            }
            
            const enrichedGame = await enrichGame(game);

            // Add game metadata from our predefined games
            const gameMetadata = getGameById(gameId);
            if (gameMetadata) {
              enrichedGame.thumbnailEmoji = gameMetadata.thumbnailEmoji;
            }

            // Add game stats if available
            if (gameStats) {
              enrichedGame.stats = {
                bestScore: gameStats.bestScore,
                normalizedBestScore: gameStats.normalizedBestScore,
                lastScore: gameStats.lastScore,
                normalizedLastScore: gameStats.normalizedLastScore,
                plays: gameStats.plays
              };
            }
            assignedGames.push(enrichedGame);
            
            // Track categories
            categorySet.add(game.categoryId);
          } else {
            console.error("Game not found for ID:", gameId);
          }
        }
        
        console.log("Loaded games:", assignedGames.length);
        setGames(assignedGames);
        setCategories(Array.from(categorySet));
      } catch (error) {
        console.error("Error loading assigned games:", error);
        toast.error("Failed to load assigned games");
      } finally {
        setIsLoading(false);
      }
    };

    loadAssignedGames();
  }, [user]);

  // Function to get category name from ID
  const getCategoryName = (categoryId: string) => {
    const category = GAME_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : 'Other';
  };

  // Filter games based on search and category
  const filteredGames = games.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || game.categoryId === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Practice</h1>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search games..."
            className="pl-8 w-full sm:w-[300px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {categories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {categoryFilter !== "all" && (
                  <Badge variant="secondary" className="ml-2">1</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup 
                value={categoryFilter} 
                onValueChange={setCategoryFilter}
              >
                <DropdownMenuRadioItem value="all">All Categories</DropdownMenuRadioItem>
                {categories.map((category) => (
                  <DropdownMenuRadioItem key={category} value={category}>
                    {getCategoryName(category)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <GameGrid
        games={filteredGames}
        isLoading={isLoading}
        actionLabel="Practice"
        emptyMessage={
          searchTerm || categoryFilter !== "all"
            ? "No games match your search criteria"
            : "No games have been assigned to your college yet"
        }
        onGameAction={(game) => router.push(`/student/practice/game/${game.id}`)}
      />
    </div>
  );
} 