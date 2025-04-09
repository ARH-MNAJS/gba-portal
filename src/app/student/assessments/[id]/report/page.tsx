"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSession } from "@/providers/session-provider";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection } from "firebase/firestore";
import { serializeFirestoreData } from "@/lib/utils";
import { GAMES_METADATA } from "@/games/index";

export default function AssessmentReportPage({ params }: { params: { id: string } }) {
  const unwrappedParams = use(params);
  const assessmentId = unwrappedParams.id;
  const [assessment, setAssessment] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSession();
  const router = useRouter();

  // Load assessment and attempt data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      try {
        // Load assessment
        const assessmentDoc = await getDoc(doc(db, "assessments", assessmentId));
        
        if (!assessmentDoc.exists()) {
          setError("Assessment not found");
          setLoading(false);
          return;
        }
        
        const assessmentData = serializeFirestoreData({ 
          id: assessmentDoc.id, 
          ...assessmentDoc.data() 
        });
        
        // Load attempt
        const attemptsRef = collection(db, "assessmentAttempts");
        const attemptDoc = await getDoc(doc(attemptsRef, `${user.id}_${assessmentData.id}`));
        
        if (!attemptDoc.exists()) {
          setError("You have not completed this assessment yet");
          setLoading(false);
          return;
        }
        
        const attemptData = serializeFirestoreData({ id: attemptDoc.id, ...attemptDoc.data() });
        
        // Enrich game data with metadata
        const enrichedGames = assessmentData.games.map((game: any) => {
          // Find the game in the attempt data
          const attemptGame = attemptData.games.find((g: any) => g.gameId === game.id);
          
          // Find the game in predefined games metadata
          const gameMetadata = GAMES_METADATA.find(g => g.id === game.id);
          
          return {
            ...game,
            ...(gameMetadata ? { name: gameMetadata.name } : {}),
            attempted: !!attemptGame,
            score: attemptGame?.score || 0,
            normalizedScore: attemptGame?.normalizedScore || 0,
            timeTaken: attemptGame?.timeTaken || 0,
          };
        });
        
        setAssessment({
          ...assessmentData,
          games: enrichedGames,
        });
        setAttempt(attemptData);
      } catch (error) {
        console.error("Error loading assessment report:", error);
        setError("Error loading assessment report");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [assessmentId, user]);

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Format time duration
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Calculate overall performance message
  const getPerformanceMessage = (score: number) => {
    if (score >= 90) return "Excellent! You've demonstrated exceptional understanding across all games.";
    if (score >= 75) return "Great job! You've shown strong skills in most areas.";
    if (score >= 60) return "Good work! You've demonstrated solid understanding with some areas for growth.";
    if (score >= 40) return "You've completed the assessment with some strengths. Keep practicing to improve.";
    return "Keep practicing! This assessment reveals opportunities for improvement.";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Report Unavailable</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push("/student/assessments")}>
              Back to Assessments
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Assessment Report</h1>
        <Button variant="outline" onClick={() => router.push("/student/assessments")}>
          Back to Assessments
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>{assessment?.name}</CardTitle>
            <CardDescription>
              Completed on {formatDate(attempt?.completedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl font-bold">{attempt?.totalScore}</span>
                </div>
                <svg className="w-40 h-40" viewBox="0 0 100 100">
                  <circle
                    className="stroke-gray-200 dark:stroke-gray-700 fill-none"
                    cx="50"
                    cy="50"
                    r="40"
                    strokeWidth="10"
                  />
                  <circle
                    className={`stroke-primary fill-none ${attempt?.totalScore >= 75 ? 'stroke-green-500' : attempt?.totalScore >= 50 ? 'stroke-yellow-500' : 'stroke-red-500'}`}
                    cx="50"
                    cy="50"
                    r="40"
                    strokeWidth="10"
                    strokeDasharray={`${(attempt?.totalScore / 100) * 251.2} 251.2`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Total Score (out of 100)</p>
            </div>
            
            <div className="border rounded-md p-4 mt-4 bg-muted/20">
              <div className="flex items-start gap-2">
                <Trophy className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">Overall Performance</h3>
                  <p className="text-sm text-muted-foreground">
                    {getPerformanceMessage(attempt?.totalScore)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {assessment?.games.map((game: any, index: number) => (
          <Card key={game.id} className={game.attempted ? "" : "opacity-70"}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{game.name}</CardTitle>
                {game.attempted ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs">Completed</span>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Not attempted</div>
                )}
              </div>
              <CardDescription>
                Game {index + 1} • {game.duration} minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {game.attempted ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Score</span>
                      <span className="font-medium">{game.normalizedScore}/100</span>
                    </div>
                    <Progress 
                      value={game.normalizedScore} 
                      className={`h-2 ${
                        game.normalizedScore >= 75 ? 'bg-green-100' : 
                        game.normalizedScore >= 50 ? 'bg-yellow-100' : 
                        'bg-red-100'
                      }`}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Time taken:</span>
                    </div>
                    <span className="text-sm">{formatTime(game.timeTaken)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Original score:</span>
                    <span className="text-sm">{game.score.toFixed(1)}</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 