"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon, Trash, Clock, Plus, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { GAMES_METADATA } from "@/games/index";
import { getAllColleges, type College } from "@/lib/utils/colleges";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/auth-guard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
  collegeId: z.string({ required_error: "Please select a college" }),
  startDate: z.string({ required_error: "Start date is required" }),
  endDate: z.string({ required_error: "End date is required" }),
  showReportAtEnd: z.boolean().default(true),
  allowQuestionSwitch: z.boolean().default(false),
  maxAttempts: z.coerce.number().min(1, { message: "At least 1 attempt required" }).default(1),
  games: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      duration: z.coerce.number().min(1, { message: "Game duration must be at least 1 minute" }),
    })
  ).min(1, { message: "Please add at least one game" }),
});

type FormValues = z.infer<typeof formSchema>;

interface Game {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
}

export default function CreateAssessmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [selectedGameDuration, setSelectedGameDuration] = useState<number>(5);
  const [durationWarning, setDurationWarning] = useState<string | null>(null);

  // Set up form with validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      collegeId: "",
      startDate: "",
      endDate: "",
      showReportAtEnd: true,
      allowQuestionSwitch: false,
      maxAttempts: 1,
      games: [],
    },
  });

  const games = form.watch("games");
  const totalGamesDuration = games.reduce((acc, game) => acc + game.duration, 0);
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  
  // Calculate assessment window duration (in minutes)
  const assessmentWindowDuration = useMemo(() => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return null;
    }
    
    if (start >= end) {
      return null;
    }
    
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  }, [startDate, endDate]);
  
  // Check if assessment duration is valid (can only be 2 minutes higher than total game duration)
  const assessmentDurationValid = useMemo(() => {
    if (!assessmentWindowDuration || games.length === 0) return true;
    
    // Enforce 2-minute buffer rule
    const maxAllowedDuration = totalGamesDuration + 2;
    return assessmentWindowDuration <= maxAllowedDuration;
  }, [assessmentWindowDuration, totalGamesDuration, games.length]);
  
  // Single validation status for form submission
  const isFormValid = useMemo(() => {
    // Basic check if dates are valid
    if (!startDate || !endDate) return false;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return false;
    }
    
    // Games must be added
    if (games.length === 0) return false;
    
    // Total game duration must not exceed assessment window
    if (totalGamesDuration > assessmentWindowDuration) return false;
    
    // Assessment duration must not exceed game duration + 2 minutes
    if (!assessmentDurationValid) return false;
    
    return true;
  }, [startDate, endDate, games, totalGamesDuration, assessmentWindowDuration, assessmentDurationValid]);
  
  // Get the appropriate error message for time validation
  const getTimeErrorMessage = useMemo(() => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return null;
    }
    
    if (start >= end) {
      return "Start date must be before end date";
    }
    
    if (!assessmentWindowDuration) return null;
    
    if (totalGamesDuration > assessmentWindowDuration) {
      return `Total game duration (${totalGamesDuration} min) exceeds assessment window (${assessmentWindowDuration} min)`;
    }
    
    if (!assessmentDurationValid) {
      return `Assessment duration can only be up to 2 minutes longer than total game duration (${totalGamesDuration} min)`;
    }
    
    return null;
  }, [startDate, endDate, assessmentWindowDuration, totalGamesDuration, assessmentDurationValid]);

  // Update duration warning whenever dates or games change
  useEffect(() => {
    setDurationWarning(getTimeErrorMessage);
  }, [getTimeErrorMessage]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Get all colleges from the database
        const collegesData = await getAllColleges();
        setColleges(collegesData);

        // Use predefined games from GAMES_METADATA instead of fetching from the database
        // This ensures we always have games available for assessment creation
        const predefinedGames = GAMES_METADATA.map(game => ({
          id: game.id,
          name: game.name,
          description: game.description,
          categoryId: game.categoryId
        }));

        setAvailableGames(predefinedGames);

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load required data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Ensure selected game duration is valid
  const handleGameDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setSelectedGameDuration(value);
    } else {
      // Default to 1 minute if invalid value
      setSelectedGameDuration(1);
    }
  };

  const addGameToAssessment = () => {
    if (!selectedGame) return;
    
    const gameToAdd = availableGames.find(g => g.id === selectedGame);
    if (!gameToAdd) return;
    
    const currentGames = form.getValues("games");
    
    // Check if game already exists
    if (currentGames.some(g => g.id === selectedGame)) {
      toast.error("This game is already added to the assessment");
      return;
    }
    
    // Ensure duration is valid
    const gameDuration = !isNaN(selectedGameDuration) && selectedGameDuration > 0 
      ? selectedGameDuration 
      : 1;
    
    form.setValue("games", [
      ...currentGames, 
      { 
        id: gameToAdd.id, 
        name: gameToAdd.name,
        duration: gameDuration
      }
    ], { shouldValidate: true });
    
    // Reset selection
    setSelectedGame('');
    setSelectedGameDuration(5);
  };

  const removeGameFromAssessment = (index: number) => {
    const currentGames = form.getValues("games");
    form.setValue("games", currentGames.filter((_, i) => i !== index), { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);

    try {
      // Validate dates
      const startDate = new Date(values.startDate);
      const endDate = new Date(values.endDate);
      
      if (startDate >= endDate) {
        toast.error("Start date must be before end date");
        setSubmitting(false);
        return;
      }
      
      // Calculate duration in minutes
      const durationInMinutes = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));
      
      if (totalGamesDuration > durationInMinutes) {
        toast.error("Total game duration exceeds assessment window");
        setSubmitting(false);
        return;
      }
      
      // Validate 2-minute buffer rule
      const maxAllowedDuration = totalGamesDuration + 2;
      if (durationInMinutes > maxAllowedDuration) {
        toast.error("Assessment duration can only be up to 2 minutes longer than total game duration");
        setSubmitting(false);
        return;
      }

      // Prepare colleges array
      let assignedTo: string[];
      if (values.collegeId === "all") {
        // Assign to all colleges
        assignedTo = colleges.map(college => college.id);
      } else {
        // Assign to selected college
        assignedTo = [values.collegeId];
      }
      
      // Create assessment document
      const assessmentRef = await addDoc(collection(db, 'assessments'), {
        name: values.name,
        description: values.description || "",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration: durationInMinutes, // Auto-calculated from start/end dates
        showReportAtEnd: values.showReportAtEnd,
        allowQuestionSwitch: values.allowQuestionSwitch,
        games: values.games,
        assignedTo: assignedTo,
        createdBy: "admin", // You may want to get the actual admin ID
        createdAt: serverTimestamp(),
        maxAttempts: values.maxAttempts
      });

      toast.success('Assessment created successfully');
      router.push('/admin/assessments');
    } catch (error: any) {
      console.error('Error creating assessment:', error);
      toast.error(error.message || 'Failed to create assessment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="space-y-4">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-[400px] w-full" />
    </div>;
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create New Assessment</h1>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/assessments")}
          >
            Cancel
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Define the assessment details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter assessment name" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter assessment description (optional)" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collegeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>College</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select college" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Colleges</SelectItem>
                          {colleges.map((college) => (
                            <SelectItem key={college.id} value={college.id}>
                              {college.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select a college or "All Colleges" to assign to all
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {getTimeErrorMessage && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Time Validation Error</AlertTitle>
                    <AlertDescription>{getTimeErrorMessage}</AlertDescription>
                  </Alert>
                )}

                {assessmentWindowDuration && !getTimeErrorMessage && (
                  <div className="text-sm text-muted-foreground">
                    Assessment Duration: {assessmentWindowDuration} minutes
                    {games.length > 0 && (
                      <span className="ml-2">
                        (Total games: {totalGamesDuration} minutes)
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxAttempts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Attempts</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            value={field.value === null || isNaN(field.value) ? 1 : field.value}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              field.onChange(!isNaN(value) && value > 0 ? value : 1);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="showReportAtEnd"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Show Report at End</FormLabel>
                          <FormDescription>
                            Show result report to student after completion
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="allowQuestionSwitch"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Allow Game Switching</FormLabel>
                          <FormDescription>
                            Allow students to switch between games
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Games</CardTitle>
                <CardDescription>
                  Add games to this assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="game-select">Game</Label>
                    <Select
                      value={selectedGame}
                      onValueChange={setSelectedGame}
                    >
                      <SelectTrigger id="game-select">
                        <SelectValue placeholder="Select a game" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGames.map((game) => (
                          <SelectItem key={game.id} value={game.id}>
                            {game.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="game-duration">Duration (minutes)</Label>
                    <Input
                      id="game-duration"
                      type="number"
                      min="1"
                      value={selectedGameDuration}
                      onChange={handleGameDurationChange}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      type="button" 
                      onClick={addGameToAssessment}
                      disabled={!selectedGame}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Game
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Added Games</h3>
                  {games.length === 0 ? (
                    <div className="text-center p-4 border rounded-md">
                      <p className="text-muted-foreground">No games added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {games.map((game, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div>
                            <p className="font-medium">{game.name}</p>
                            <p className="text-sm text-muted-foreground">Duration: {game.duration} minutes</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGameFromAssessment(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className={cn(
                        "text-sm font-medium mt-2 p-2 rounded-md",
                        getTimeErrorMessage && games.length > 0
                          ? "bg-red-50 text-red-500 dark:bg-red-950"
                          : ""
                      )}>
                        Total games duration: {totalGamesDuration} minutes
                      </div>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="games"
                    render={() => (
                      <FormMessage />
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={submitting || !isFormValid}
              >
                {submitting ? "Creating..." : "Create Assessment"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AuthGuard>
  );
} 