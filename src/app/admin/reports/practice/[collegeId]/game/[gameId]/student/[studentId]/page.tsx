"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc, 
  getDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Download, Trophy } from "lucide-react";
import { serializeFirestoreData } from "@/lib/utils";
import { getGameById, GAMES_METADATA } from "@/games";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function StudentGameDetailPage({ 
  params 
}: { 
  params: { collegeId: string; gameId: string; studentId: string } 
}) {
  const unwrappedParams = use(params);
  const collegeId = unwrappedParams.collegeId;
  const gameId = unwrappedParams.gameId;
  const studentId = unwrappedParams.studentId;

  const [student, setStudent] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [gameStats, setGameStats] = useState<any>(null);
  const [allGameStats, setAllGameStats] = useState<any[]>([]);
  const [lineChartData, setLineChartData] = useState<any[]>([]);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>(gameId);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student data
        const studentDoc = await getDoc(doc(db, "students", studentId));
        if (!studentDoc.exists()) {
          router.push(`/admin/reports/practice/${collegeId}/game/${gameId}`);
          return;
        }
        
        const studentData = {
          id: studentDoc.id,
          ...serializeFirestoreData(studentDoc.data())
        };
        setStudent(studentData);
        
        // Fetch game data
        const gameMetadata = getGameById(gameId);
        const gameDoc = await getDoc(doc(db, "games", gameId));
        const gameData = gameDoc.exists() 
          ? {
              id: gameId,
              ...serializeFirestoreData(gameDoc.data()),
              name: gameDoc.data().name || gameMetadata?.name || "Unknown Game"
            }
          : {
              id: gameId,
              name: gameMetadata?.name || "Unknown Game"
            };
        
        setGame(gameData);
        
        // Fetch game stats for this student for this specific game
        const statsQuery = query(
          collection(db, "gameStats"),
          where("gameId", "==", gameId),
          where("userId", "==", studentId)
        );
        
        const statsSnapshot = await getDocs(statsQuery);
        if (statsSnapshot.docs.length > 0) {
          const statsData = {
            id: statsSnapshot.docs[0].id,
            ...serializeFirestoreData(statsSnapshot.docs[0].data())
          };
          setGameStats(statsData);
        }
        
        // Fetch game stats for this student for all games
        const allStatsQuery = query(
          collection(db, "gameStats"),
          where("userId", "==", studentId)
        );
        
        const allStatsSnapshot = await getDocs(allStatsQuery);
        const allStats = allStatsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...serializeFirestoreData(doc.data())
        }));
        
        setAllGameStats(allStats);
        
        // Create line chart data (in a real app you would fetch historical scores)
        // This is a simplified example using random data
        const mockHistoricalData = Array.from({ length: 10 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (10 - i));
          return {
            date: format(date, "MMM dd"),
            score: Math.floor(Math.random() * (statsData?.bestScore || 100))
          };
        });
        
        if (statsData) {
          mockHistoricalData.push({
            date: "Latest",
            score: statsData.lastScore
          });
        }
        
        setLineChartData(mockHistoricalData);
        
        // Create bar chart data for games played by this student
        const gamesPlayedData = allStats.map(stat => {
          const gameInfo = getGameById(stat.gameId);
          return {
            name: gameInfo?.name || "Unknown Game",
            plays: stat.plays || 0
          };
        });
        
        setBarChartData(gamesPlayedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [collegeId, gameId, studentId, router]);

  // Handle game selection for line chart
  const handleGameChange = (value: string) => {
    setSelectedGameId(value);
    
    const selectedStats = allGameStats.find(stat => stat.gameId === value);
    if (selectedStats) {
      // In a real app, you would fetch historical data for the selected game
      const mockHistoricalData = Array.from({ length: 10 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (10 - i));
        return {
          date: format(date, "MMM dd"),
          score: Math.floor(Math.random() * (selectedStats.bestScore || 100))
        };
      });
      
      mockHistoricalData.push({
        date: "Latest",
        score: selectedStats.lastScore
      });
      
      setLineChartData(mockHistoricalData);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/admin/reports/practice/${collegeId}/game/${gameId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {student?.firstName} {student?.lastName} - Game Practice Report
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Info</CardTitle>
          <CardDescription>
            Basic information about the student
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p>{student?.firstName} {student?.lastName}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p>{student?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p>{student?.phone || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Score History</CardTitle>
                <CardDescription>
                  Score trend over time
                </CardDescription>
              </div>
              <Select 
                value={selectedGameId} 
                onValueChange={handleGameChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Game" />
                </SelectTrigger>
                <SelectContent>
                  {allGameStats.map(stat => {
                    const gameInfo = getGameById(stat.gameId);
                    return (
                      <SelectItem key={stat.gameId} value={stat.gameId}>
                        {gameInfo?.name || "Unknown Game"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Games Practiced</CardTitle>
            <CardDescription>
              Number of times each game has been played
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="plays" name="Times Played" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Game Stats</CardTitle>
          <CardDescription>
            Detailed stats for games played by this student
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allGameStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No game stats available for this student
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game Name</TableHead>
                  <TableHead>Best Score</TableHead>
                  <TableHead>Normalized Best Score</TableHead>
                  <TableHead>Last Score</TableHead>
                  <TableHead>Times Played</TableHead>
                  <TableHead>Last Played</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allGameStats.map((stat) => {
                  const gameInfo = getGameById(stat.gameId);
                  return (
                    <TableRow key={stat.id}>
                      <TableCell className="font-medium">
                        {gameInfo?.name || "Unknown Game"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-amber-500" />
                          {stat.bestScore || 0}
                        </div>
                      </TableCell>
                      <TableCell>{stat.normalizedBestScore || 0}/100</TableCell>
                      <TableCell>{stat.lastScore || 0}</TableCell>
                      <TableCell>{stat.plays || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {stat.lastPlayed ? format(new Date(stat.lastPlayed), "MMM dd, yyyy") : "Never"}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 