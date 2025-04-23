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
import { Trophy, Clock, CheckCircle2, Calendar } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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
      
      console.log("Loading report for assessment ID:", assessmentId, "user ID:", user.id);
      
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
        
        console.log("Assessment data loaded:", assessmentData.name);
        
        // Try to load attempt with multiple possible ID formats
        const attemptsRef = collection(db, "assessmentAttempts");
        
        // Possible ID formats for the document
        const possibleDocIds = [
          `${user.id}_${assessmentData.id}`,
          `${assessmentData.id}_${user.id}`,
          `${user.id.toLowerCase()}_${assessmentData.id}`,
          `${user.email?.toLowerCase()}_${assessmentData.id}`,
          user.id, // Some systems might just use the user ID as the document ID
          assessmentData.id // Or assessment ID as the document ID
        ];
        
        console.log("Trying document IDs:", possibleDocIds);
        
        // Try each possible document ID
        let attemptDoc = null;
        for (const docId of possibleDocIds) {
          const docRef = doc(attemptsRef, docId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            console.log("Found attempt document with ID:", docId);
            attemptDoc = docSnap;
            break;
          }
        }
        
        // If no direct document ID match, try querying by user ID and assessment ID
        if (!attemptDoc) {
          console.log("No direct document ID match, trying queries");
          
          // Try querying the collection with user ID and assessment ID fields
          const userFields = ["userId", "studentId", "user_id", "student_id", "email"];
          const assessmentFields = ["assessmentId", "assessment_id", "assessmentID", "quiz_id", "quizId"];
          
          for (const userField of userFields) {
            for (const assessmentField of assessmentFields) {
              const q = query(
                attemptsRef, 
                where(userField, "==", user.id), 
                where(assessmentField, "==", assessmentData.id)
              );
              
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                console.log(`Found attempt via query: ${userField}=${user.id}, ${assessmentField}=${assessmentData.id}`);
                attemptDoc = querySnapshot.docs[0];
                break;
              }
              
              // Try with email if it's available
              if (user.email && userField === "email") {
                const emailQuery = query(
                  attemptsRef, 
                  where(userField, "==", user.email.toLowerCase()), 
                  where(assessmentField, "==", assessmentData.id)
                );
                
                const emailQuerySnapshot = await getDocs(emailQuery);
                if (!emailQuerySnapshot.empty) {
                  console.log(`Found attempt via email query: ${userField}=${user.email.toLowerCase()}`);
                  attemptDoc = emailQuerySnapshot.docs[0];
                  break;
                }
              }
            }
            
            if (attemptDoc) break;
          }
        }
        
        // Check embedded attempts in the assessment document
        if (!attemptDoc) {
          console.log("Checking for embedded attempts in the assessment document");
          
          const possibleAttemptsFields = ["attempts", "submissions", "studentAttempts", "results"];
          let embeddedAttemptData = null;
          
          for (const field of possibleAttemptsFields) {
            const attemptsData = assessmentData[field];
            
            if (Array.isArray(attemptsData)) {
              // If it's an array of attempts, find the one for this user
              const userAttempt = attemptsData.find((a: any) => 
                a.userId === user.id || 
                a.studentId === user.id ||
                a.email === user.email
              );
              
              if (userAttempt) {
                console.log(`Found embedded attempt in assessment.${field} array`);
                embeddedAttemptData = {
                  id: `${assessmentData.id}_${user.id}`,
                  userId: user.id,
                  assessmentId: assessmentData.id,
                  ...userAttempt
                };
                break;
              }
            } else if (typeof attemptsData === 'object' && attemptsData !== null) {
              // If it's an object with user IDs as keys
              const userIdKeys = [user.id, user.id.toLowerCase(), user.email?.toLowerCase()].filter(Boolean);
              for (const key of userIdKeys) {
                if (attemptsData[key]) {
                  console.log(`Found embedded attempt in assessment.${field} object with key ${key}`);
                  embeddedAttemptData = {
                    id: `${assessmentData.id}_${user.id}`,
                    userId: user.id,
                    assessmentId: assessmentData.id,
                    ...attemptsData[key]
                  };
                  break;
                }
              }
              
              if (embeddedAttemptData) break;
            }
          }
          
          if (embeddedAttemptData) {
            const attemptData = serializeFirestoreData(embeddedAttemptData);
            setAttempt(attemptData);
            
            // Process game data
            const enrichedGames = assessmentData.games.map((game: any) => {
              // Try to find game data in the embedded attempt
              const attemptGame = 
                (attemptData.games && attemptData.games.find((g: any) => g.gameId === game.id)) ||
                (attemptData.gameResults && attemptData.gameResults[game.id]);
              
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
            
            setLoading(false);
            return;
          }
        }
        
        if (!attemptDoc) {
          console.log("No assessment attempt found");
          setError("You have not completed this assessment yet");
          setLoading(false);
          return;
        }
        
        const attemptData = serializeFirestoreData({ id: attemptDoc.id, ...attemptDoc.data() });
        console.log("Attempt data:", attemptData);
        
        // Enrich game data with metadata
        const enrichedGames = assessmentData.games.map((game: any) => {
          // Find the game in the attempt data
          const attemptGame = attemptData.games && attemptData.games.find((g: any) => g.gameId === game.id);
          
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

  // Map games to skills
  const getSkillsForGame = (gameId: string) => {
    const skillMapping: {[key: string]: string[]} = {
      'memory-match': ['Memory', 'Pattern Recognition', 'Attention to Detail'],
      'puzzle-game': ['Problem Solving', 'Logical Reasoning', 'Spatial Awareness'],
      'word-scramble': ['Vocabulary', 'Language Processing', 'Mental Agility'],
      'math-challenge': ['Numerical Reasoning', 'Mathematical Operations', 'Mental Calculation'],
      'sequence-memory': ['Working Memory', 'Sequential Processing', 'Concentration'],
      'reaction-time': ['Processing Speed', 'Hand-Eye Coordination', 'Reflexes'],
      'pattern-recognition': ['Pattern Recognition', 'Visual Processing', 'Analytical Thinking'],
      'logical-reasoning': ['Deductive Reasoning', 'Critical Thinking', 'Problem Solving'],
      'coding-challenge': ['Programming Logic', 'Algorithm Design', 'Technical Knowledge'],
    };
    
    // Default skills if game isn't in the mapping
    return skillMapping[gameId] || ['Cognitive Ability', 'Problem Solving', 'Critical Thinking'];
  };

  // Generate personalized recommendations based on performance
  const getRecommendations = (assessment: any, attempt: any) => {
    if (!assessment?.games || !attempt) return [];
    
    const recommendations = [];
    
    // Find lowest scoring game
    let lowestScore = 101;
    let lowestGame = null;
    
    assessment.games.forEach((game: any) => {
      if (game.attempted && game.normalizedScore < lowestScore) {
        lowestScore = game.normalizedScore;
        lowestGame = game;
      }
    });
    
    if (lowestGame) {
      const skills = getSkillsForGame(lowestGame.id);
      recommendations.push({
        title: `Focus on ${skills[0]}`,
        description: `Your performance in ${lowestGame.name} suggests room for improvement in ${skills.join(', ')}. Consider dedicated practice in these areas.`,
        icon: 'Target'
      });
    }
    
    // Time management recommendation if any game took longer than expected
    const timeManagementIssue = assessment.games.some((game: any) => 
      game.attempted && game.timeTaken > (game.duration * 60 * 0.9)
    );
    
    if (timeManagementIssue) {
      recommendations.push({
        title: 'Improve Time Management',
        description: 'You spent close to or more than the allocated time on some games. Practice completing similar tasks with time constraints.',
        icon: 'Clock'
      });
    }
    
    // Overall score based recommendation
    if (attempt.totalScore < 70) {
      recommendations.push({
        title: 'Regular Practice',
        description: 'Schedule regular practice sessions across different cognitive skills to improve your overall performance.',
        icon: 'Calendar'
      });
    } else {
      recommendations.push({
        title: 'Challenge Yourself',
        description: 'You\'re doing well! Try more advanced assessments to further develop your skills.',
        icon: 'Trophy'
      });
    }
    
    return recommendations;
  };

  // Calculate skill proficiency from game performance
  const calculateSkillProficiency = (assessment: any) => {
    if (!assessment?.games) return {};
    
    const skillScores: {[key: string]: {score: number, count: number}} = {};
    
    assessment.games.forEach((game: any) => {
      if (!game.attempted) return;
      
      const skills = getSkillsForGame(game.id);
      skills.forEach(skill => {
        if (!skillScores[skill]) {
          skillScores[skill] = { score: 0, count: 0 };
        }
        skillScores[skill].score += game.normalizedScore;
        skillScores[skill].count += 1;
      });
    });
    
    // Calculate average score for each skill
    const skillProficiency: {[key: string]: number} = {};
    Object.entries(skillScores).forEach(([skill, data]) => {
      skillProficiency[skill] = Math.round(data.score / data.count);
    });
    
    return skillProficiency;
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center justify-center">
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
              
              <div className="col-span-1 md:col-span-2 space-y-4">
                <div className="border rounded-md p-4 bg-muted/20">
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-md p-3 bg-muted/10">
                    <h3 className="text-sm font-medium mb-2">Assessment Stats</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Games:</span>
                        <span className="font-medium">{assessment?.games?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="font-medium">
                          {assessment?.games?.filter((g: any) => g.attempted).length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Time:</span>
                        <span className="font-medium">
                          {formatTime(assessment?.games?.reduce((total: number, game: any) => 
                            total + (game.attempted ? (game.timeTaken || 0) : 0), 0) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-3 bg-muted/10">
                    <h3 className="text-sm font-medium mb-2">Performance Metrics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Highest Game Score:</span>
                        <span className="font-medium">
                          {Math.max(...(assessment?.games
                            ?.filter((g: any) => g.attempted)
                            .map((g: any) => g.normalizedScore) || [0]))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Average Game Score:</span>
                        <span className="font-medium">
                          {Math.round(
                            (assessment?.games
                              ?.filter((g: any) => g.attempted)
                              .reduce((sum: number, g: any) => sum + g.normalizedScore, 0) || 0) / 
                            (assessment?.games?.filter((g: any) => g.attempted).length || 1)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Completion Rate:</span>
                        <span className="font-medium">
                          {Math.round(
                            ((assessment?.games?.filter((g: any) => g.attempted).length || 0) / 
                            (assessment?.games?.length || 1)) * 100
                          )}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Skill Proficiency Section */}
        <Card className="col-span-1 md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Skill Proficiency</CardTitle>
            <CardDescription>
              Analysis of your performance across different cognitive skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(calculateSkillProficiency(assessment)).map(([skill, score]) => (
                <div key={skill} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{skill}</span>
                    <span className="text-sm">{score}/100</span>
                  </div>
                  <Progress 
                    value={score} 
                    className={`h-2 ${
                      score >= 75 ? 'bg-green-100' : 
                      score >= 50 ? 'bg-yellow-100' : 
                      'bg-red-100'
                    }`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Game Performance Cards */}
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
                    <span className="text-sm text-muted-foreground">Time efficiency:</span>
                    <span className="text-sm">
                      {game.timeTaken > 0 
                        ? `${(game.normalizedScore / (game.timeTaken / 60)).toFixed(1)} points/min`
                        : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Original score:</span>
                    <span className="text-sm">{game.score.toFixed(1)}</span>
                  </div>
                  
                  <div className="pt-2">
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">SKILLS TESTED</h4>
                    <div className="flex flex-wrap gap-1">
                      {getSkillsForGame(game.id).map(skill => (
                        <span key={skill} className="text-xs px-2 py-0.5 bg-muted rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
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
        
        {/* Recommendations Section */}
        <Card className="col-span-1 md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recommendations</CardTitle>
            <CardDescription>
              Personalized suggestions to improve your performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {getRecommendations(assessment, attempt).map((rec, index) => (
                <div key={index} className="border rounded-md p-4 bg-muted/10">
                  <div className="flex gap-3">
                    {rec.icon === 'Trophy' && <Trophy className="h-5 w-5 text-yellow-500 mt-0.5" />}
                    {rec.icon === 'Clock' && <Clock className="h-5 w-5 text-blue-500 mt-0.5" />}
                    {rec.icon === 'Calendar' && <Calendar className="h-5 w-5 text-green-500 mt-0.5" />}
                    {rec.icon === 'Target' && <div className="h-5 w-5 text-red-500 mt-0.5">🎯</div>}
                    <div>
                      <h3 className="text-sm font-medium mb-1">{rec.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 