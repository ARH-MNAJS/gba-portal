"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Copy, Trash2, Building, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GameGrid } from "@/components/games/game-grid";
import { GameModal } from "@/components/games/game-modal";
import { AssignGameModal } from "@/components/games/assign-game-modal";
import { 
  fetchGames, 
  enrichGame,
  enrichGames,
  createGame,
  deleteGame,
  assignGameToCollege,
  removeGameAssignment,
  getCollegeGameAssignments,
  fetchGame,
  GameWithMetadata,
  Game,
  GameAssignment
} from "@/lib/utils/games";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getAllColleges, College } from "@/lib/utils/colleges";

// Extended GameWithMetadata with assignment ID
interface AssignedGame extends GameWithMetadata {
  assignmentId: string;
}

export default function AdminPracticePage() {
  const [activeTab, setActiveTab] = useState<string>("allgames");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [games, setGames] = useState<GameWithMetadata[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeGames, setCollegeGames] = useState<Record<string, AssignedGame[]>>({});
  const [isGameModalOpen, setIsGameModalOpen] = useState<boolean>(false);
  const [isAssigningGame, setIsAssigningGame] = useState<boolean>(false);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const router = useRouter();

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load games
      const allGames = await fetchGames();
      const enrichedGames = await enrichGames(allGames);
      setGames(enrichedGames);
      
      // Load colleges directly from Firestore
      const collegesList = await getAllColleges();
      setColleges(collegesList);
      
      // Load game assignments for each college
      const collegeGamesMap: Record<string, AssignedGame[]> = {};
      
      for (const college of collegesList) {
        try {
          const assignments = await getCollegeGameAssignments(college.id);
          const collegeGames: AssignedGame[] = [];
          
          for (const assignment of assignments) {
            // Ensure the assignment object has properly serialized timestamps
            const serializedAssignment = {
              ...assignment,
              // Handle different types of timestamp objects
              assignedAt: (() => {
                if (typeof assignment.assignedAt === 'string') {
                  return assignment.assignedAt;
                } else if (assignment.assignedAt && typeof (assignment.assignedAt as any).toDate === 'function') {
                  return (assignment.assignedAt as any).toDate().toISOString();
                } else if (assignment.assignedAt && (assignment.assignedAt as any)._seconds !== undefined) {
                  return new Date((assignment.assignedAt as any)._seconds * 1000).toISOString();
                } else {
                  return new Date().toISOString();
                }
              })()
            };
            
            const game = await fetchGame(serializedAssignment.gameId);
            if (game) {
              const enrichedGame = await enrichGame(game);
              collegeGames.push({
                ...enrichedGame,
                assignmentId: serializedAssignment.id
              });
            }
          }
          
          collegeGamesMap[college.id] = collegeGames;
        } catch (error) {
          console.error(`Error loading games for college ${college.id}:`, error);
          collegeGamesMap[college.id] = [];
        }
      }
      
      setCollegeGames(collegeGamesMap);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error(`Error loading data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new game
  const handleCreateGame = async (data: any) => {
    setIsCreating(true);
    try {
      const newGame = await createGame({
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        component: data.component,
        difficulty: data.difficulty
      });
      
      if (newGame && newGame.id) {
        // Get the fully populated game with metadata
        const retrievedGame = await fetchGame(newGame.id);
        if (retrievedGame) {
          const enrichedGame = await enrichGame(retrievedGame);
          setGames(prev => [...prev, enrichedGame]);
          
          toast.success("Game created successfully");
          setIsGameModalOpen(false);
        }
      } else {
        toast.error("Failed to create game");
      }
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error("Failed to create game");
    } finally {
      setIsCreating(false);
    }
  };

  // Delete a game
  const handleDeleteGame = async (gameId: string) => {
    try {
      await deleteGame(gameId);
      setGames(prev => prev.filter(game => game.id !== gameId));
      toast.success("Game deleted successfully");
    } catch (error) {
      console.error("Error deleting game:", error);
      toast.error("Failed to delete game");
    }
  };

  // Assign a game to a college
  const handleAssignGame = async (collegeId: string, gameId: string) => {
    try {
      const assignment = await assignGameToCollege(gameId, collegeId, "admin");
      
      if (assignment) {
        // Make sure the assignment has properly serialized timestamps
        const serializedAssignment = {
          ...assignment,
          // Handle different types of timestamp objects
          assignedAt: (() => {
            if (typeof assignment.assignedAt === 'string') {
              return assignment.assignedAt;
            } else if (assignment.assignedAt && typeof (assignment.assignedAt as any).toDate === 'function') {
              return (assignment.assignedAt as any).toDate().toISOString();
            } else if (assignment.assignedAt && (assignment.assignedAt as any)._seconds !== undefined) {
              return new Date((assignment.assignedAt as any)._seconds * 1000).toISOString();
            } else {
              return new Date().toISOString();
            }
          })()
        };
        
        // Update the college games list
        const game = await fetchGame(serializedAssignment.gameId);
        if (game) {
          const enrichedGame = await enrichGame(game);
          
          setCollegeGames(prev => ({
            ...prev,
            [collegeId]: [...(prev[collegeId] || []), {
              ...enrichedGame,
              assignmentId: serializedAssignment.id
            } as AssignedGame]
          }));
        }
        
        toast.success("Game assigned successfully");
        setIsAssigningGame(false);
      } else {
        toast.error("Failed to assign game");
      }
    } catch (error) {
      console.error("Error assigning game:", error);
      toast.error("Failed to assign game");
    }
  };

  // Remove a game assignment
  const handleRemoveAssignment = async (collegeId: string, gameId: string) => {
    try {
      await removeGameAssignment(collegeId, gameId);
      
      setCollegeGames(prev => ({
        ...prev,
        [collegeId]: prev[collegeId].filter(game => game.id !== gameId)
      }));
      
      toast.success("Game removed successfully");
    } catch (error) {
      console.error("Error removing game assignment:", error);
      toast.error("Failed to remove game");
    }
  };

  // Select a college to manage
  const handleCollegeSelect = (college: College) => {
    setSelectedCollege(college);
    setIsAssigningGame(true);
  };

  // Handle back from assignments view
  const handleBackFromAssignments = () => {
    setSelectedCollege(null);
  };

  // Filtered colleges based on search term
  const filteredColleges = colleges.filter(college => 
    college.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Practice Games</h1>
        
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full sm:w-[200px]"
            />
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="allgames" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="allgames">All Games</TabsTrigger>
          <TabsTrigger value="colleges">Colleges</TabsTrigger>
        </TabsList>
        
        <TabsContent value="allgames" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">All Available Games</h2>
            <Button size="sm" onClick={() => setIsGameModalOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Create Game
            </Button>
          </div>
          
          <GameGrid
            games={games.filter(game => 
              game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (game.categoryName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
              (game.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            )}
            isLoading={isLoading}
            onGameAction={(game) => router.push(`/admin/practice/game/${game.id}`)}
            renderSecondaryAction={(game) => (
              <Button
                variant="destructive"
                size="icon"
                className="opacity-60 hover:opacity-100 bg-red-400 hover:bg-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGame(game.id);
                }}
                title="Delete Game"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          />
        </TabsContent>
        
        <TabsContent value="colleges" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : filteredColleges.length > 0 ? (
              filteredColleges.map((college) => {
                return (
                  <div 
                    key={college.id} 
                    className="border rounded-lg overflow-hidden hover:border-primary cursor-pointer transition-all"
                  >
                    <div className="bg-slate-100 dark:bg-slate-800 py-6 text-center">
                      <Building className="h-12 w-12 mx-auto text-muted-foreground" />
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-semibold mb-1 truncate">{college.name}</h3>
                      {college.adminName && (
                        <p className="text-sm text-muted-foreground">
                          Admin: {college.adminName}
                        </p>
                      )}
                      {college.adminEmail && !college.adminName && (
                        <p className="text-sm text-muted-foreground">
                          Admin: {college.adminEmail}
                        </p>
                      )}
                      <div className="mt-4 pt-4 border-t flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {collegeGames[college.id]?.length || 0} Games Assigned
                        </span>
                        <Button onClick={() => handleCollegeSelect(college)}>
                          Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-2xl mb-2">🏫</p>
                <h3 className="text-xl font-medium">No Colleges Found</h3>
                <p className="text-muted-foreground mt-1">
                  Add colleges to start assigning games
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <GameModal
        open={isGameModalOpen}
        onOpenChange={setIsGameModalOpen}
        onSubmit={handleCreateGame}
        title="Create New Game"
        description="Add a new game to the platform"
        isLoading={isCreating}
      />
      
      {selectedCollege && (
        <AssignGameModal
          open={isAssigningGame}
          onOpenChange={setIsAssigningGame}
          onAssign={(_, gameId) => handleAssignGame(selectedCollege.id, gameId)}
          colleges={colleges}
          isLoading={false}
          title={`Assign Game to ${selectedCollege.name}`}
          preselectedCollegeId={selectedCollege.id}
        />
      )}
    </div>
  );
} 