"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus } from "lucide-react";
import { GameGrid } from "@/components/games/game-grid";
import { Badge } from "@/components/ui/badge";
import { getGameById } from "@/games/index";
import { GAME_CATEGORIES } from "@/lib/constants/games";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAllColleges } from "@/lib/utils/colleges";

// Simple admin page for practice games with no required URL parameters
export default function AdminPracticePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [games, setGames] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);

  // Load all games on page load
  useEffect(() => {
    const loadGames = async () => {
      setIsLoading(true);
      
      try {
        // Get all predefined games
        const gamesData = getGameById('all');
        
        // If there are games, process them
        if (gamesData && typeof gamesData === 'object') {
          // Cast to appropriate type for object iteration
          const gamesList = Object.entries(gamesData).map(([_, game]) => {
            // Type assertion to access properties safely
            const gameObj = game as any;
            return {
              id: gameObj.id || '',
              name: gameObj.name || '',
              description: gameObj.description || "",
              categoryId: gameObj.categoryId || "",
              categoryName: gameObj.category || "",
              thumbnailEmoji: gameObj.thumbnailEmoji || "🎮",
              thumbnailImage: gameObj.thumbnailImage || "",
            };
          });
          
          setGames(gamesList);
          
          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set(gamesList.map(game => game.categoryId).filter(Boolean))
          );
          setCategories(uniqueCategories as string[]);
        }
      } catch (error) {
        console.error("Error loading games:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGames();
  }, []);

  // Function to get category name from ID
  const getCategoryName = (categoryId: string) => {
    const category = GAME_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : 'Other';
  };

  // Filter games based on search and category
  const filteredGames = games.filter(game => {
    const matchesSearch = 
      game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (game.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (game.categoryName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || game.categoryId === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Handle manage button click
  const handleManageGame = (game: any) => {
    router.push(`/admin/practice/game/${game.id}`);
  };

  // Render secondary action button for each game card
  const renderSecondaryAction = (game: any) => (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => router.push(`/admin/practice/assign?gameId=${game.id}`)}
    >
      <Plus className="h-4 w-4 mr-2" />
      Assign
    </Button>
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Practice Games</h1>
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
        actionLabel="Manage"
        emptyMessage={
          searchTerm || categoryFilter !== "all"
            ? "No games match your search criteria"
            : "No games available"
        }
        onGameAction={handleManageGame}
        renderSecondaryAction={renderSecondaryAction}
      />
    </div>
  );
}