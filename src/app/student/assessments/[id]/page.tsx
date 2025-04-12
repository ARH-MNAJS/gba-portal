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
import { Timer, AlertTriangle } from "lucide-react";
import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { normalizeScore, getGameMaxScore } from "@/lib/utils/score-normalization";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import dynamic from "next/dynamic";
import { serializeFirestoreData } from "@/lib/utils";

// Dynamically import game components
const Switch = dynamic(() => import("@/games/Switch"));
const GeoSudo = dynamic(() => import("@/games/GeoSudo"));
const MemoryMatch = dynamic(() => import("@/games/MemoryMatch"));
const WordScramble = dynamic(() => import("@/games/WordScramble"));
const MathQuiz = dynamic(() => import("@/games/MathQuiz"));

// Map game IDs to components
const GAME_COMPONENTS: Record<string, any> = {
  "switch": Switch,
  "geo-sudo": GeoSudo,
  "memory-match": MemoryMatch,
  "word-scramble": WordScramble,
  "math-quiz": MathQuiz,
};

export default function AssessmentPage({ params }: { params: { id: string } }) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const [assessmentId] = useState(() => unwrappedParams.id);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [gameScores, setGameScores] = useState<Record<string, { score: number, normalizedScore: number, timeTaken: number }>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [testStarted, setTestStarted] = useState<boolean>(false);
  const [testCompleted, setTestCompleted] = useState<boolean>(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const { user } = useSession();
  const router = useRouter();

  // Load assessment
  useEffect(() => {
    // Remove direct params.id access here since we now use assessmentId state
    const loadAssessment = async () => {
      if (!user?.id) return;
      
      try {
        console.log(`Loading assessment: ${assessmentId} for student: ${user.id}`);
        const assessmentDoc = await getDoc(doc(db, "assessments", assessmentId));
        
        if (!assessmentDoc.exists()) {
          setAssessmentError("Assessment not found");
          setLoading(false);
          return;
        }
        
        const assessmentData = serializeFirestoreData({ 
          id: assessmentDoc.id, 
          ...assessmentDoc.data() 
        });
        
        // Check if assessment is active
        const now = new Date();
        const startDate = new Date(assessmentData.startDate);
        const endDate = new Date(assessmentData.endDate);
        
        if (now < startDate) {
          setAssessmentError("This assessment has not started yet");
          setLoading(false);
          return;
        }
        
        if (now > endDate) {
          setAssessmentError("This assessment has already ended");
          setLoading(false);
          return;
        }
        
        // Get user's college using multiple methods
        let studentCollege = null;
        
        // Try to find student by ID first in students collection
        try {
          const studentRef = collection(db, "students");
          
          // Try by ID
          const studentByIdQuery = query(studentRef, where("id", "==", user.id));
          const studentByIdSnapshot = await getDocs(studentByIdQuery);
          
          if (!studentByIdSnapshot.empty) {
            const studentData = studentByIdSnapshot.docs[0].data();
            // Try both collegeId and college fields
            studentCollege = studentData.collegeId || studentData.college;
            console.log(`Found student by ID, college: ${studentCollege}`);
          } 
          // Try by email if ID search failed
          else if (user.email) {
            const studentByEmailQuery = query(studentRef, where("email", "==", user.email));
            const studentByEmailSnapshot = await getDocs(studentByEmailQuery);
            
            if (!studentByEmailSnapshot.empty) {
              const studentData = studentByEmailSnapshot.docs[0].data();
              studentCollege = studentData.collegeId || studentData.college;
              console.log(`Found student by email, college: ${studentCollege}`);
            }
          }
        } catch (error) {
          console.error("Error finding student college:", error);
        }
        
        // If we couldn't find the student's college
        if (!studentCollege) {
          setAssessmentError("Could not find your college information");
          setLoading(false);
          return;
        }
        
        console.log(`Student college: ${studentCollege}, Assessment assigned to:`, assessmentData.assignedTo);
        
        // Check if assessment is assigned to student's college
        if (!assessmentData.assignedTo.includes(studentCollege)) {
          setAssessmentError("This assessment is not assigned to your college");
          setLoading(false);
          return;
        }
        
        // Check if student has already taken this assessment
        try {
          const attemptsRef = collection(db, "assessmentAttempts");
          const attemptsQuery = query(
            attemptsRef, 
            where("studentId", "==", user.id),
            where("assessmentId", "==", assessmentData.id)
          );
          const attemptSnapshot = await getDocs(attemptsQuery);
          
          if (!attemptSnapshot.empty) {
            setAssessmentError("You have already taken this assessment");
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error checking attempts:", error);
        }
        
        setAssessment(assessmentData);
        setTimeLeft(assessmentData.duration * 60); // Convert minutes to seconds
      } catch (error) {
        console.error("Error loading assessment:", error);
        setAssessmentError("Error loading assessment");
      } finally {
        setLoading(false);
      }
    };
    
    loadAssessment();
  }, [assessmentId, user]); // Update dependency array to use assessmentId state

  // Timer for the assessment
  useEffect(() => {
    if (!testStarted || testCompleted || !assessment) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTestComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [testStarted, testCompleted, assessment]);

  // Format time remaining
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Start the assessment
  const handleStartTest = () => {
    setTestStarted(true);
  };

  // Handle completing a game
  const handleGameComplete = (gameId: string, score: number, timeTaken: number) => {
    // Calculate normalized score
    const maxScore = getGameMaxScore(gameId);
    const normalizedScore = normalizeScore(score, maxScore);
    
    // Update game scores
    setGameScores((prev) => ({
      ...prev,
      [gameId]: { score, normalizedScore, timeTaken },
    }));
    
    // Move to next game
    if (currentStep < assessment.games.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleTestComplete();
    }
  };

  // Handle switching to a specific game (if allowed)
  const handleSwitchGame = (index: number) => {
    if (assessment.allowQuestionSwitch) {
      setCurrentStep(index);
    }
  };

  // Handle manually submitting the test
  const handleManualSubmit = () => {
    setShowConfirmSubmit(true);
  };

  // Handle completing the assessment
  const handleTestComplete = async () => {
    if (testCompleted) return;
    
    setTestCompleted(true);
    
    try {
      const attemptData = {
        id: `${user.id}_${assessment.id}`,
        assessmentId: assessment.id,
        studentId: user.id,
        completedAt: serverTimestamp(),
        games: Object.entries(gameScores).map(([gameId, data]) => ({
          gameId,
          score: data.score,
          normalizedScore: data.normalizedScore,
          timeTaken: data.timeTaken,
        })),
        totalScore: calculateTotalScore(),
      };
      
      // Save attempt to Firestore
      await addDoc(collection(db, "assessmentAttempts"), attemptData);
      
      // Navigate to report if configured, or back to assessments
      if (assessment.showReportAtEnd) {
        router.push(`/student/assessments/${assessment.id}/report`);
      } else {
        toast.success("Assessment completed successfully");
        router.push("/student/assessments");
      }
    } catch (error) {
      console.error("Error saving assessment attempt:", error);
      toast.error("Error saving assessment results");
    }
  };

  // Calculate the total score for the assessment
  const calculateTotalScore = () => {
    if (Object.keys(gameScores).length === 0) return 0;
    
    // Average of normalized scores
    const normalizedScores = Object.values(gameScores).map(data => data.normalizedScore);
    return Math.round(normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length);
  };

  // Render the current game
  const renderCurrentGame = () => {
    if (!assessment || !testStarted) return null;
    
    const currentGame = assessment.games[currentStep];
    const GameComponent = GAME_COMPONENTS[currentGame.id];
    
    if (!GameComponent) {
      return (
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Game Not Available</CardTitle>
            <CardDescription>
              This game is not available in the system.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => currentStep < assessment.games.length - 1 ? setCurrentStep(currentStep + 1) : handleTestComplete()}>
              Skip Game
            </Button>
          </CardFooter>
        </Card>
      );
    }
    
    return (
      <div className="w-full">
        <GameComponent
          studentId={user?.id || ""}
          onComplete={(score: number, timeTaken: number) => handleGameComplete(currentGame.id, score, timeTaken)}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (assessmentError) {
    return (
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Assessment Unavailable</CardTitle>
            <CardDescription>
              {assessmentError}
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

  if (!testStarted) {
    return (
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{assessment?.name}</CardTitle>
            <CardDescription>
              You are about to start this assessment. Please read the instructions carefully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-md p-4 bg-muted/50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">Important Information</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>This assessment will take {assessment?.duration} minutes to complete.</li>
                    <li>The timer will start once you click "Start Assessment".</li>
                    <li>There are {assessment?.games.length} games in this assessment.</li>
                    {assessment?.allowQuestionSwitch ? (
                      <li>You can switch between games during the assessment.</li>
                    ) : (
                      <li>You must complete each game before proceeding to the next one.</li>
                    )}
                    <li>The assessment will automatically submit when the time expires.</li>
                    <li>Leaving the page will not pause the timer.</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">Games in this Assessment:</h3>
              <ul className="space-y-2">
                {assessment?.games.map((game: any, index: number) => (
                  <li key={game.id} className="flex items-center justify-between">
                    <span>
                      {index + 1}. {game.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {game.duration} minutes
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleStartTest} className="w-full">
              Start Assessment
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 space-y-4">
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>{assessment?.name}</CardTitle>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span className={`font-mono ${timeLeft < 60 ? 'text-red-500 font-bold' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">
              Progress: {currentStep + 1} of {assessment?.games.length} games
            </div>
            <div className="text-sm text-muted-foreground">
              Time Remaining: {Math.floor(timeLeft / 60)} minutes
            </div>
          </div>
          <Progress 
            value={(currentStep + 1) / assessment?.games.length * 100} 
            className="h-2"
          />
          
          {assessment?.allowQuestionSwitch && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {assessment.games.map((game: any, index: number) => (
                <Button
                  key={game.id}
                  variant={currentStep === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSwitchGame(index)}
                  className="flex-grow-0"
                >
                  Game {index + 1}: {game.name.split(' ')[0]}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex-1 min-h-[500px]">
        {renderCurrentGame()}
      </div>
      
      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={currentStep === 0 || !assessment?.allowQuestionSwitch}
          onClick={() => setCurrentStep(currentStep - 1)}
        >
          Previous Game
        </Button>
        
        <Button
          variant="outline"
          onClick={handleManualSubmit}
        >
          Submit Assessment
        </Button>
        
        <Button
          disabled={currentStep === assessment?.games.length - 1 || !assessment?.allowQuestionSwitch}
          onClick={() => setCurrentStep(currentStep + 1)}
        >
          Next Game
        </Button>
      </div>
      
      {/* Confirm Submit Dialog */}
      <AlertDialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this assessment? 
              {Object.keys(gameScores).length < assessment?.games.length && (
                <span className="text-red-500 block mt-2">
                  Warning: You have not completed all games yet.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTestComplete}>
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 