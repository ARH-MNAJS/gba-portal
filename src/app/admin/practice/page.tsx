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
import { collection, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetchUsers } from "@/lib/actions/user-actions";
import collegesData from "@/data/colleges.json";

interface College {
  id: string;
  collegeId: string; // This links to colleges.json
  name: string;
  admin?: {
    name: string;
    email: string;
  };
}

// Extended GameWithMetadata with assignment ID
interface AssignedGame extends GameWithMetadata {
  assignmentId: string;
}

export default function AdminPracticePage() {
  const [activeTab, setActiveTab] = useState<string>("games");
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
      
      // Load colleges
      const collegesResult = await fetchUsers(1, 1000, "college");
      const collegeUsers = collegesResult.users;
      
      const collegesList = collegeUsers.map((user: any) => {
        // Get the college ID from the user's college field (should be a string like "2")
        const collegeId = user.college || "";
        
        // Find the actual college name from colleges.json
        const collegeInfo = collegesData.colleges.find(c => c.id === collegeId);
        const collegeName = collegeInfo ? collegeInfo.name : (user.name || user.email);
        
        return {
          id: user.id,
          collegeId: collegeId, // Store the actual college ID from json
          name: collegeName, // Store the proper college name
          admin: {
            name: user.name || '',
            email: user.email
          }
        };
      });
      
      setColleges(collegesList);
      
      // Load game assignments for each college
      const collegeGamesMap: Record<string, AssignedGame[]> = {};
      
      for (const college of collegesList) {
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
      
      toast.success("Assignment removed successfully");
    } catch (error) {
      console.error("Error removing assignment:", error);
      toast.error("Failed to remove assignment");
    }
  };

  const handleCollegeSelect = (college: College) => {
    setSelectedCollege(college);
    setActiveTab("assignments");
  };
  
  // Get college name from colleges.json
  const getCollegeName = (id: string) => {
    // First, try to find the college object by its ID
    const college = colleges.find(c => c.id === id);
    if (college) {
      // If found, return its name (which should already be the proper name from colleges.json)
      return college.name;
    }
    
    // Legacy fallback method
    const collegeInfo = collegesData.colleges.find(c => c.id === id);
    return collegeInfo ? collegeInfo.name : id;
  };
  
  // Handle back action from assignments view
  const handleBackFromAssignments = () => {
    setActiveTab("colleges"); 
    setSelectedCollege(null);
  };

  // Filter games based on search term
  const filteredGames = games.filter(game => 
    game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (game.categoryName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (game.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Practice Games</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="games">All Games</TabsTrigger>
            <TabsTrigger value="colleges">Colleges</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8 w-[200px] md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {activeTab === "games" && (
              <Button onClick={() => setIsGameModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Game
              </Button>
            )}
            
            {activeTab === "assignments" && selectedCollege && (
              <Button onClick={() => setIsAssigningGame(true)}>
                <Plus className="mr-2 h-4 w-4" /> Assign Game
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="games" className="mt-0">
          <GameGrid
            games={filteredGames}
            isLoading={isLoading}
            actionLabel="Try Game"
            emptyMessage={
              searchTerm 
                ? "No games match your search" 
                : "Create your first game to get started"
            }
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
            ) : colleges.length > 0 ? (
              colleges
                .filter(college => 
                  college.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((college) => {
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
                        {college.admin && (
                          <p className="text-sm text-muted-foreground">
                            Admin: {college.admin.name || college.admin.email}
                          </p>
                        )}
                        <div className="mt-4 pt-4 border-t flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {collegeGames[college.id]?.length || 0} Games Assigned
                          </span>
                          <Button variant="outline" size="sm" onClick={() => handleCollegeSelect(college)}>
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

        {selectedCollege && (
          <TabsContent value="assignments" className="mt-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{selectedCollege.name}: Assigned Games</h2>
                {selectedCollege.admin && (
                  <p className="text-muted-foreground">
                    Admin: {selectedCollege.admin.name || selectedCollege.admin.email}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBackFromAssignments}>
                  <X className="mr-2 h-4 w-4" /> Back to Colleges
                </Button>
              </div>
            </div>
            
            {collegeGames[selectedCollege.id]?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collegeGames[selectedCollege.id]
                  .filter(game => 
                    game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (game.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
                  )
                  .map((game) => (
                    <div key={game.id} className="border rounded-lg overflow-hidden relative">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-3 right-3 opacity-60 hover:opacity-100 bg-red-400 hover:bg-red-500"
                        onClick={() => handleRemoveAssignment(selectedCollege.id, game.id)}
                        title="Remove Assignment"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="bg-primary/10 h-32 flex items-center justify-center">
                        <span className="text-6xl">{game.thumbnailEmoji || '🎮'}</span>
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold mb-1">{game.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {game.description || 'No description'}
                        </p>
                        <div className="mt-4 pt-4 border-t flex justify-between items-center">
                          <Badge>{game.categoryName || 'Other'}</Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/admin/practice/game/${game.id}`)}
                          >
                            Try Game
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
            ) : (
              <div className="text-center py-12 border rounded-lg">
                <p className="text-2xl mb-2">🎮</p>
                <h3 className="text-xl font-medium">No Games Assigned</h3>
                <p className="text-muted-foreground mt-1">
                  Assign games to this college to get started
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsAssigningGame(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Assign Game
                </Button>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Create Game Modal */}
      <GameModal
        open={isGameModalOpen}
        onOpenChange={setIsGameModalOpen}
        onSubmit={handleCreateGame}
        title="Create New Game"
        description="Add a new game to the platform."
        isLoading={isCreating}
      />

      {/* Assign Game Modal */}
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