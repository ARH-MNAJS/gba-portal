"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, getDocs, collection, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { createCollege } from "@/lib/utils/colleges";
import { createUser } from "@/lib/actions/user-actions";
import { PlusCircle, X } from "lucide-react";

// Define form schema for college creation with admin
const collegeFormSchema = z.object({
  name: z.string().min(1, { message: "College name is required" }).max(100),
  collegeId: z.string().min(1, { message: "College ID is required" }).max(50),
  branches: z.array(z.string()).min(1, { message: "At least one branch is required" }),
  years: z.array(z.string()).min(1, { message: "At least one year is required" }),
  // Admin fields
  adminName: z.string().min(1, { message: "Admin name is required" }),
  adminEmail: z.string().email({ message: "Invalid email format" }),
  adminPhone: z.string().regex(/^\d{10}$/, { message: "Phone must be 10 digits" }),
  adminPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type CollegeFormValues = z.infer<typeof collegeFormSchema>;

export default function AddCollegePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBranch, setNewBranch] = useState<string>("");
  const [newYear, setNewYear] = useState<string>("");

  const form = useForm<CollegeFormValues>({
    resolver: zodResolver(collegeFormSchema),
    defaultValues: {
      name: "",
      collegeId: "",
      branches: ["Computer Science", "Information Technology"],
      years: ["First Year", "Second Year", "Third Year", "Fourth Year"],
      adminName: "",
      adminEmail: "",
      adminPhone: "",
      adminPassword: "",
    },
  });

  const addBranch = () => {
    if (!newBranch) return;
    form.setValue("branches", [...form.getValues("branches"), newBranch]);
    setNewBranch("");
  };

  const removeBranch = (index: number) => {
    const branches = form.getValues("branches");
    form.setValue(
      "branches",
      branches.filter((_, i) => i !== index)
    );
  };

  const addYear = () => {
    if (!newYear) return;
    form.setValue("years", [...form.getValues("years"), newYear]);
    setNewYear("");
  };

  const removeYear = (index: number) => {
    const years = form.getValues("years");
    form.setValue(
      "years",
      years.filter((_, i) => i !== index)
    );
  };

  // Update the generateCollegeId function to log and ensure it works
  const generateCollegeId = () => {
    const name = form.getValues("name");
    console.log("Generating ID from name:", name);
    
    if (!name) {
      toast.error("Please enter a college name first");
      return;
    }
    
    const id = name
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");
    
    console.log("Generated ID:", id);
    form.setValue("collegeId", id);
    toast.success("College ID generated");
  };

  // Handle form submission
  const onSubmit = async (values: CollegeFormValues) => {
    // Prevent double submission
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Check if the email is already in use
      try {
        // Check if the email exists in Firebase Auth
        const methods = await fetchSignInMethodsForEmail(auth, values.adminEmail);
        
        if (methods && methods.length > 0) {
          // Email exists, check if it's associated with a college
          const collegesRef = collection(db, "colleges");
          const q = query(collegesRef, where("adminEmail", "==", values.adminEmail));
          const snapshot = await getDocs(q);
          
          // If no college is using this email, the user might be orphaned in Auth
          if (snapshot.empty) {
            toast.error(
              "This email is already registered but not associated with a college. " +
              "Please use a different email or contact your administrator to clean up the orphaned account.",
              { duration: 8000 }
            );
            setIsSubmitting(false);
            return;
          } else {
            toast.error("This email is already used by another college admin");
            setIsSubmitting(false);
            return;
          }
        }
      } catch (authCheckError) {
        // Continue if there's an error checking the email
        console.error("Error checking email:", authCheckError);
      }
      
      // Create admin user using the server action instead of client-side auth
      const result = await createUser({
        email: values.adminEmail,
        password: values.adminPassword,
        name: values.adminName,
        role: 'college',
        phone: values.adminPhone,
        college: values.collegeId,
      });
      
      if (!result.success) {
        throw new Error(result.error || "Failed to create admin user");
      }
      
      const adminId = result.userId;
      
      // Create college document with admin details embedded
      await createCollege(
        {
          name: values.name,
          branches: values.branches,
          years: values.years,
          // Include admin details directly in the college document
          adminName: values.adminName,
          adminEmail: values.adminEmail,
          adminPhone: values.adminPhone,
          adminId: adminId,
          collegeId: values.collegeId, // Explicitly add collegeId field
        },
        values.collegeId
      );
      
      toast.success("College created successfully");
      router.push("/admin/user/college");
    } catch (error: any) {
      console.error("Error creating college:", error);
      
      if (error.code === "auth/email-already-in-use") {
        toast.error(
          "This email is already in use. If you're certain this email should be available, please contact your administrator.",
          { duration: 8000 }
        );
      } else {
        toast.error(error.message || "Failed to create college");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Add New College</h1>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>College Information</CardTitle>
            <CardDescription>
              Add a new college and its admin to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* College Name Field */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>College Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter college name"
                            {...field}
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* College ID Field */}
                  <FormField
                    control={form.control}
                    name="collegeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>College ID</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="Enter college ID"
                              {...field}
                              autoComplete="off"
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={generateCollegeId}
                          >
                            Generate
                          </Button>
                        </div>
                        <FormDescription>
                          This will be used as a unique identifier
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Branches Section */}
                  <div className="space-y-2">
                    <Label>Branches</Label>
                    <div className="flex flex-wrap gap-2">
                      {form.watch("branches").map((branch, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md"
                        >
                          <span className="text-sm">{branch}</span>
                          <button
                            type="button"
                            onClick={() => removeBranch(index)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Add a branch"
                        value={newBranch}
                        onChange={(e) => setNewBranch(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={addBranch}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                    {form.formState.errors.branches && (
                      <p className="text-sm font-medium text-destructive">
                        {form.formState.errors.branches.message}
                      </p>
                    )}
                  </div>

                  {/* Years Section */}
                  <div className="space-y-2">
                    <Label>Years</Label>
                    <div className="flex flex-wrap gap-2">
                      {form.watch("years").map((year, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md"
                        >
                          <span className="text-sm">{year}</span>
                          <button
                            type="button"
                            onClick={() => removeYear(index)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Add a year"
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={addYear}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                    {form.formState.errors.years && (
                      <p className="text-sm font-medium text-destructive">
                        {form.formState.errors.years.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-4">Admin Information</h3>
                  <Alert className="mb-4">
                    <AlertDescription>
                      An admin account will be created for this college. You can share these
                      credentials with the college administrator.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Admin Name Field */}
                    <FormField
                      control={form.control}
                      name="adminName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter admin name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Admin Email Field */}
                    <FormField
                      control={form.control}
                      name="adminEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter admin email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Admin Phone Field */}
                    <FormField
                      control={form.control}
                      name="adminPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Phone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter admin phone (10 digits)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Admin Password Field */}
                    <FormField
                      control={form.control}
                      name="adminPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter admin password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create College"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
} 