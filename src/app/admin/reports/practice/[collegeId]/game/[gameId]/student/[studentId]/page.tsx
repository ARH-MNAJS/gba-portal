"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from 'react'; 
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
import { format, isValid } from "date-fns";

interface GameStat {
  id: string;
  gameId: string;
  userId: string;
  bestScore: number;
  normalizedBestScore: number;
  lastScore: number;
  plays: number;
  lastPlayed: string;
  totalDuration: number;
  scores?: Array<{score: number, timestamp: string}>;
}

interface StudentDetailPageProps {
  params: { 
    collegeId: string; 
    gameId: string; 
    studentId: string 
  };
}

interface StudentData {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

// Helper function to safely format dates
const safeFormatDate = (dateValue: any, formatString: string = "MMM dd, yyyy") => {
  if (!dateValue) return "Never";
  
  try {
    // Handle Firestore timestamp objects
    if (dateValue && typeof dateValue === 'object' && dateValue.toDate && typeof dateValue.toDate === 'function') {
      const date = dateValue.toDate();
      return format(date, formatString);
    }
    
    // Handle string/number timestamps
    const date = new Date(dateValue);
    if (isValid(date)) {
      return format(date, formatString);
    }
    
    return "Invalid date";
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};

export default function StudentGameDetailPage({ params }: StudentDetailPageProps) {
  const router = useRouter();
  
  // Unwrap params using React.use() with proper type casting
  const unwrappedParams = use(params as any) as {collegeId: string; gameId: string; studentId: string};
  const collegeId = unwrappedParams.collegeId;
  const gameId = unwrappedParams.gameId;
  const studentId = unwrappedParams.studentId;

  const [student, setStudent] = useState<StudentData | null>(null);
  const [game, setGame] = useState<any>(null);
  const [gameStats, setGameStats] = useState<GameStat | null>(null);
  const [allGameStats, setAllGameStats] = useState<GameStat[]>([]);
  const [lineChartData, setLineChartData] = useState<any[]>([]);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>(gameId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch student data
        const studentDoc = await getDoc(doc(db, "students", studentId));
        if (!studentDoc.exists()) {
          router.push(`/admin/reports/practice/${collegeId}/game/${gameId}`);
          return;
        }
        
        const studentData = {
          id: studentDoc.id,
          ...studentDoc.data()
        };
        setStudent(studentData);
        
        // Fetch game data
        const gameInfo = getGameById(gameId);
        setGame(gameInfo || { id: gameId, name: "Game" });
        
        // Fetch game stats for this student for all games
        const allStatsQuery = query(
          collection(db, "gameStats"),
          where("userId", "==", studentId)
        );
        
        const allStatsSnapshot = await getDocs(allStatsQuery);
        const allStats = allStatsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GameStat[];
        
        setAllGameStats(allStats);
        
        // Create mock score history data (replace with real data when available)
        const selectedStats = allStats.find(stat => stat.gameId === gameId);
        const mockScoreHistory = [];
        
        if (selectedStats && selectedStats.scores && selectedStats.scores.length > 0) {
          // Use real score history if available
          mockScoreHistory.push(...selectedStats.scores.map((score: any) => {
            let dateStr = "Unknown";
            try {
              // Handle both Firestore timestamps and string timestamps
              if (score.timestamp && typeof score.timestamp === 'object' && score.timestamp.toDate) {
                dateStr = format(score.timestamp.toDate(), "MMM dd");
              } else {
                const date = new Date(score.timestamp);
                if (isValid(date)) {
                  dateStr = format(date, "MMM dd");
                }
              }
            } catch (error) {
              console.error("Error parsing timestamp:", error);
            }
            
            return {
              date: dateStr,
              score: score.score
            };
          }));
        } else {
          // Create mock data as fallback
          for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (10 - i));
            mockScoreHistory.push({
              date: format(date, "MMM dd"),
              score: Math.floor(Math.random() * 100)
            });
          }
        }
        
        setLineChartData(mockScoreHistory);
        
        // Create bar chart data for games played
        const gamesPlayedData = allStats.map(stat => {
          const gameInfo = getGameById(stat.gameId);
          return {
            name: gameInfo?.name || "Unknown Game",
            plays: stat.plays || 0
          };
        });
        
        // Sort by most played
        gamesPlayedData.sort((a, b) => b.plays - a.plays);
        
        setBarChartData(gamesPlayedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [collegeId, gameId, studentId, router]);

  // Handle game selection change for line chart
  const handleGameChange = (value: string) => {
    setSelectedGameId(value);
    
    const selectedStats = allGameStats.find(stat => stat.gameId === value);
    if (selectedStats) {
      // If we have real score history data, use it
      if (selectedStats.scores && selectedStats.scores.length > 0) {
        setLineChartData(selectedStats.scores.map((score: any) => {
          let dateStr = "Unknown";
          try {
            // Handle both Firestore timestamps and string timestamps
            if (score.timestamp && typeof score.timestamp === 'object' && score.timestamp.toDate) {
              dateStr = format(score.timestamp.toDate(), "MMM dd");
            } else {
              const date = new Date(score.timestamp);
              if (isValid(date)) {
                dateStr = format(date, "MMM dd");
              }
            }
          } catch (error) {
            console.error("Error parsing timestamp:", error);
          }
          
          return {
            date: dateStr,
            score: score.score
          };
        }));
      } else {
        // Otherwise use mock data
        const mockData = [];
        for (let i = 0; i < 10; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (10 - i));
          mockData.push({
            date: format(date, "MMM dd"),
            score: Math.floor(Math.random() * 100)
          });
        }
        setLineChartData(mockData);
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Game Name', 'Best Score', 'Last Score', 'Times Played', 'Total Duration (mins)', 'Last Played'];
    const csvData = allGameStats.map(stat => {
      const gameInfo = getGameById(stat.gameId);
      return [
        gameInfo?.name || "Unknown Game",
        (stat.bestScore || 0).toString(),
        (stat.lastScore || 0).toString(),
        (stat.plays || 0).toString(),
        (stat.totalDuration || 0).toString(),
        stat.lastPlayed ? safeFormatDate(stat.lastPlayed) : "Never"
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${student?.name || "student"}_game_stats.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navigateBack = () => {
    router.push(`/admin/reports/practice/${collegeId}/game/${gameId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={navigateBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {student?.name || `${student?.firstName || ''} ${student?.lastName || ''}`} - Game Practice Report
        </h1>
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
              <p>{student?.name || `${student?.firstName || ''} ${student?.lastName || ''}`}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p>{student?.email || 'N/A'}</p>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Game Stats</CardTitle>
            <CardDescription>
              Detailed stats for games played by this student
            </CardDescription>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
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
                  <TableHead>Last Score</TableHead>
                  <TableHead>Times Played</TableHead>
                  <TableHead>Total Duration</TableHead>
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
                      <TableCell>{stat.lastScore || 0}</TableCell>
                      <TableCell>{stat.plays || 0}</TableCell>
                      <TableCell>{stat.totalDuration || 0} mins</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {safeFormatDate(stat.lastPlayed)}
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