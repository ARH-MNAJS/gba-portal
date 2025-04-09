"use client";

import { useState, useEffect } from "react";
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
import { CalendarIcon, Trash, Clock, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { GAMES_METADATA } from "@/games/index";
import { getAllColleges, type College } from "@/lib/utils/colleges";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/auth-guard";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
  collegeId: z.string({ required_error: "Please select a college" }),
  gameId: z.string({ required_error: "Please select a game" }),
  dueDate: z.string({ required_error: "Due date is required" }),
  maxAttempts: z.coerce.number().min(1, { message: "At least 1 attempt required" }).default(1),
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
  const [games, setGames] = useState<Game[]>([]);

  // Set up form with validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      collegeId: "",
      gameId: "",
      dueDate: "",
      maxAttempts: 1,
    },
  });

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

        setGames(predefinedGames);

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load required data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);

    try {
      // Find the game name from our list of games
      const selectedGame = games.find(game => game.id === values.gameId);
      const gameName = selectedGame?.name || "Unknown Game";

      // Create assessment document
      const assessmentRef = await addDoc(collection(db, 'assessments'), {
        name: values.name,
        description: values.description || "",
        collegeId: values.collegeId,
        gameId: values.gameId,
        gameName: gameName, // Store the game name for easier reference
        dueDate: new Date(values.dueDate).toISOString(),
        maxAttempts: values.maxAttempts,
        createdAt: serverTimestamp(),
        status: 'active',
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
                        Select the college this assessment is for, or All Colleges
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gameId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a game" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {games.map((game) => (
                            <SelectItem key={game.id} value={game.id}>
                              {game.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose a game for this assessment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
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
                  name="maxAttempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Attempts</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={submitting}
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