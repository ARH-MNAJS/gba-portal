"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc, 
  getDoc 
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
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Download, Trophy, Info } from "lucide-react";
import { serializeFirestoreData } from "@/lib/utils";
import { getGameById } from "@/games";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { use } from "react";

// Helper function to get performance message
const getPerformanceMessage = (score: number): string => {
  if (score >= 90) return "Excellent! Outstanding performance.";
  if (score >= 80) return "Great job! Very good performance.";
  if (score >= 70) return "Good work! Solid performance.";
  if (score >= 60) return "Satisfactory performance.";
  if (score >= 50) return "Average performance. Room for improvement.";
  if (score >= 40) return "Below average. Needs improvement.";
  return "Needs significant improvement. Consider additional practice.";
};

export default function StudentAssessmentReportPage({ 
  params 
}: { 
  params: { collegeId: string; assessmentId: string; studentId: string } 
}) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const collegeId = unwrappedParams.collegeId;
  const assessmentId = unwrappedParams.assessmentId;
  const studentId = unwrappedParams.studentId;

  const [student, setStudent] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [highestScore, setHighestScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [gameChartData, setGameChartData] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student data
        const studentDoc = await getDoc(doc(db, "students", studentId));
        if (!studentDoc.exists()) {
          router.push(`/admin/reports/assessments/${collegeId}/${assessmentId}`);
          return;
        }
        
        const studentData = {
          id: studentDoc.id,
          ...serializeFirestoreData(studentDoc.data())
        };
        setStudent(studentData);
        
        // Fetch assessment data
        const assessmentDoc = await getDoc(doc(db, "assessments", assessmentId));
        if (!assessmentDoc.exists()) {
          router.push(`/admin/reports/assessments/${collegeId}/${assessmentId}`);
          return;
        }
        
        const assessmentData = {
          id: assessmentDoc.id,
          ...serializeFirestoreData(assessmentDoc.data())
        };
        setAssessment(assessmentData);
        
        // Fetch student's attempt
        const attemptsQuery = query(
          collection(db, "assessmentAttempts"),
          where("assessmentId", "==", assessmentId),
          where("studentId", "==", studentId)
        );
        
        const attemptsSnapshot = await getDocs(attemptsQuery);
        if (attemptsSnapshot.docs.length === 0) {
          router.push(`/admin/reports/assessments/${collegeId}/${assessmentId}`);
          return;
        }
        
        const attemptData = {
          id: attemptsSnapshot.docs[0].id,
          ...serializeFirestoreData(attemptsSnapshot.docs[0].data())
        };
        setAttempt(attemptData);
        
        // Find highest score among all students
        const allAttemptsQuery = query(
          collection(db, "assessmentAttempts"),
          where("assessmentId", "==", assessmentId)
        );
        
        const allAttemptsSnapshot = await getDocs(allAttemptsQuery);
        let highest = 0;
        
        allAttemptsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.totalScore > highest) {
            highest = data.totalScore;
          }
        });
        
        setHighestScore(highest);
        
        // Create chart data for games
        if (attemptData.games && Array.isArray(attemptData.games)) {
          const gameData = attemptData.games.map((game: any) => {
            const gameInfo = getGameById(game.gameId);
            return {
              name: gameInfo?.name || "Unknown Game",
              score: game.normalizedScore || 0,
              maxScore: 100,
              timeTaken: game.timeTaken || 0
            };
          });
          
          setGameChartData(gameData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [collegeId, assessmentId, studentId, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Format time taken (seconds to mm:ss)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate total time taken
  const totalTimeTaken = attempt?.games?.reduce((acc: number, game: any) => acc + (game.timeTaken || 0), 0) || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/admin/reports/assessments/${collegeId}/${assessmentId}`)}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {student?.firstName} {student?.lastName} - Assessment Report
        </h1>
      </div>

      <Card className="border-primary">
        <CardHeader className="pb-4">
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>
            Overall assessment performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Total Score</div>
              <div className="text-3xl font-bold">{attempt?.totalScore || 0}/100</div>
              <div className="text-sm text-muted-foreground">
                {getPerformanceMessage(attempt?.totalScore || 0)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Highest Score in Class</div>
              <div className="text-3xl font-bold">{highestScore}/100</div>
              <div className="text-sm text-muted-foreground">
                {attempt?.totalScore === highestScore ? "Top of the class!" : `${(attempt?.totalScore / highestScore * 100).toFixed(1)}% of highest score`}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Time Taken</div>
              <div className="text-3xl font-bold">{formatTime(totalTimeTaken)}</div>
              <div className="text-sm text-muted-foreground">
                Out of {assessment?.duration || 0} minutes allowed
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="text-sm font-medium">Score Comparison</div>
              <div className="text-sm text-muted-foreground">{attempt?.totalScore || 0}/100</div>
            </div>
            <Progress value={attempt?.totalScore || 0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Performance</CardTitle>
          <CardDescription>
            Breakdown of performance in each game
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gameChartData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No game data available
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gameChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" name="Score" fill="#3b82f6">
                    {gameChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.score >= 70 ? '#22c55e' : entry.score >= 40 ? '#eab308' : '#ef4444'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Detailed Game Reports</h2>
        
        {attempt?.games?.map((game: any, index: number) => {
          const gameInfo = getGameById(game.gameId);
          return (
            <Card key={game.gameId || index}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle>{gameInfo?.name || "Unknown Game"}</CardTitle>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Info className="h-4 w-4" />
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">About this game</h4>
                        <p className="text-sm text-muted-foreground">
                          {gameInfo?.description || "No description available"}
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Raw Score</div>
                    <div className="text-xl font-semibold">{game.score || 0}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Normalized Score</div>
                    <div className="text-xl font-semibold">{game.normalizedScore || 0}/100</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Time Taken</div>
                    <div className="text-xl font-semibold">{formatTime(game.timeTaken || 0)}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="text-sm font-medium">Performance</div>
                    <div className="text-sm text-muted-foreground">{game.normalizedScore || 0}/100</div>
                  </div>
                  <Progress 
                    value={game.normalizedScore || 0} 
                    className="h-2" 
                    indicator={game.normalizedScore >= 70 ? 'bg-green-500' : game.normalizedScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}
                  />
                </div>
                
                <div className="text-sm">
                  <h4 className="font-medium mb-1">Performance Insights:</h4>
                  <p className="text-muted-foreground">
                    {game.normalizedScore >= 80 
                      ? "Excellent performance! Great mastery of this game." 
                      : game.normalizedScore >= 60 
                        ? "Good performance. Shows competence in this game." 
                        : game.normalizedScore >= 40 
                          ? "Average performance. More practice would be beneficial." 
                          : "Needs improvement. Consider additional practice with this game."}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 