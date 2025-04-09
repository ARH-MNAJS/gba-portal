"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCollegeNameById } from '@/lib/utils/colleges';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { serializeFirestoreData } from "@/lib/utils";
import { getGameThumbnail, getGameById } from "@/games";
import { Input } from "@/components/ui/input";
import { use } from "react";

interface GameStats {
  gameId: string;
  normalizedBestScore: number;
  plays: number;
  lastPlayed: string;
}

interface Student {
  id: string;
  name: string;
  gameStats: GameStats[];
}

export default function CollegePracticeReportsPage({ params }: { params: { collegeId: string } }) {
  const unwrappedParams = use(params);
  const collegeId = unwrappedParams.collegeId;
  
  const [college, setCollege] = useState<any>(null);
  const [collegeName, setCollegeName] = useState<string>("College");
  const [games, setGames] = useState<any[]>([]);
  const [filteredGames, setFilteredGames] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // First find if collegeId is from a user document (admin) or actual college
        let actualCollegeId = collegeId;
        
        // Handle admin user case (get their college)
        const userRef = doc(db, 'users', collegeId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // If this is a college admin, get their actual college ID
          if (userData.role === 'college' && userData.college) {
            actualCollegeId = userData.college;
            console.log("Found actual college ID from admin user:", actualCollegeId);
          }
        }
        
        // Now find the college document
        const collegeRef = doc(db, 'colleges', actualCollegeId);
        let collegeDoc = await getDoc(collegeRef);
        
        // If not found as direct college document, try other methods
        if (!collegeDoc.exists()) {
          console.log("College document not found by direct ID, searching by college field");
          const collegesRef = collection(db, 'colleges');
          const q = query(collegesRef, where('college', '==', actualCollegeId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            collegeDoc = querySnapshot.docs[0];
            console.log("Found college document by field value:", collegeDoc.id);
            actualCollegeId = collegeDoc.id;
          } else {
            // If still not found, redirect to colleges list
            console.warn("College not found:", actualCollegeId);
            router.push('/admin/reports/practice');
            return;
          }
        }
        
        // College document found directly
        const collegeData = {
          id: collegeDoc.id,
          ...serializeFirestoreData(collegeDoc.data())
        };
        setCollege(collegeData);
        
        // Fetch college name using the utility function instead of colleges.json
        try {
          const name = await getCollegeNameById(actualCollegeId);
          setCollegeName(name);
        } catch (error) {
          console.error("Error fetching college name:", error);
          setCollegeName(collegeData.name || "College");
        }
        
        // Fetch games assigned to this college
        const gamesAssigned = collegeData.gamesAssigned || [];
        
        // Process game assignments with a fallback query approach
        const gamesList = await Promise.all(
          gamesAssigned.map(async (assignment: any) => {
            const gameId = assignment.gameId || assignment.id;
            // Try to get predefined game first
            const gameMetadata = getGameById(gameId);
            
            // Try to get practice statistics for this game using direct collegeId query
            const statsQuery = query(
              collection(db, "gameStats"),
              where("collegeId", "==", actualCollegeId),
              where("gameId", "==", gameId)
            );
            
            let statsSnapshot = await getDocs(statsQuery);
            let totalPlayers = statsSnapshot.size;
            let totalPlays = statsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().plays || 0), 0);
            
            // If no results, try alternate approach (for backward compatibility)
            if (statsSnapshot.empty) {
              console.log(`No stats found with collegeId for game ${gameId}, using fallback approach`);
              
              // Get all students from this college
              const studentsQuery = query(
                collection(db, "students"),
                where("collegeId", "==", actualCollegeId)
              );
              
              const studentsSnapshot = await getDocs(studentsQuery);
              const studentIds = studentsSnapshot.docs.map(doc => doc.id);
              
              if (studentIds.length > 0) {
                // Get all stats for this game
                const allStatsQuery = query(
                  collection(db, "gameStats"),
                  where("gameId", "==", gameId)
                );
                
                const allStatsSnapshot = await getDocs(allStatsQuery);
                
                // Filter manually to only include stats for students in this college
                const filteredStats = allStatsSnapshot.docs.filter(doc => {
                  const statData = doc.data();
                  return studentIds.includes(statData.userId);
                });
                
                totalPlayers = filteredStats.length;
                totalPlays = filteredStats.reduce((sum, doc) => sum + (doc.data().plays || 0), 0);
              }
            }
            
            if (gameMetadata) {
              return {
                id: gameId,
                assignmentId: assignment.id || gameId,
                name: gameMetadata.name || "Unknown Game",
                description: gameMetadata.description || "",
                thumbnail: getGameThumbnail(gameId),
                categoryId: gameMetadata.categoryId,
                stats: {
                  totalPlayers,
                  totalPlays
                }
              };
            }
            
            // If not a predefined game, try to get from database
            const gameDoc = await getDoc(doc(db, "games", gameId));
            const gameData = gameDoc.exists() 
              ? serializeFirestoreData(gameDoc.data()) 
              : null;
            
            if (!gameData) return null;
            
            return {
              id: gameId,
              assignmentId: assignment.id || gameId,
              name: gameData.name || "Unknown Game",
              description: gameData.description || "",
              thumbnail: getGameThumbnail(gameId),
              stats: {
                totalPlayers,
                totalPlays
              },
              ...gameData
            };
          })
        );
        
        const validGames = gamesList.filter(Boolean) as any[];
        setGames(validGames);
        setFilteredGames(validGames);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [collegeId, router]);

  if (loading) {
    return <div className="space-y-4">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-[400px] w-full" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Practice Report for {collegeName}</h1>
      
      {games.length === 0 ? (
        <Card>
          <CardContent className="py-4">
            No games found for this college
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {games.map(game => (
            <Card key={game.id}>
              <CardHeader>
                <CardTitle>{game.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <strong>Description:</strong>
                    <div className="text-sm text-muted-foreground">
                      {game.description}
                    </div>
                  </div>
                  <div>
                    <strong>Category:</strong>
                    <div className="text-sm text-muted-foreground">
                      {game.categoryId}
                    </div>
                  </div>
                  <div>
                    <strong>Total Players:</strong>
                    <div className="text-sm text-muted-foreground">
                      {game.stats.totalPlayers}
                    </div>
                  </div>
                  <div>
                    <strong>Total Plays:</strong>
                    <div className="text-sm text-muted-foreground">
                      {game.stats.totalPlays}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 