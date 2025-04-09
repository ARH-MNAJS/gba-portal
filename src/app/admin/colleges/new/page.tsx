"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { AuthGuard } from "@/components/auth-guard";
import { createCollege } from "@/lib/utils/colleges";
import { toast } from "sonner";

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
import { PlusCircle, X } from "lucide-react";

// Create a schema for college creation
const collegeFormSchema = z.object({
  collegeId: z.string().min(1, { message: "College ID is required" }).max(50),
  name: z.string().min(1, { message: "College name is required" }).max(100),
  branches: z.array(z.string()).min(1, { message: "At least one branch is required" }),
  years: z.array(z.string()).min(1, { message: "At least one year is required" }),
  createAdmin: z.boolean().default(false),
  adminName: z.string().optional(),
  adminEmail: z.string().email({ message: "Invalid email format" }).optional(),
  adminPhone: z.string().regex(/^\d{10}$/, { message: "Phone must be 10 digits" }).optional(),
  adminPassword: z.string().min(6, { message: "Password must be at least 6 characters" }).optional(),
}).refine((data) => {
  // If createAdmin is true, admin fields should be provided
  if (data.createAdmin) {
    return !!data.adminName && !!data.adminEmail && !!data.adminPhone && !!data.adminPassword;
  }
  return true;
}, {
  message: "Admin details are required when creating an admin account",
  path: ["createAdmin"],
});

type CollegeFormValues = z.infer<typeof collegeFormSchema>;

export default function NewCollegePage() {
  const router = useRouter();
  const [newBranch, setNewBranch] = useState("");
  const [newYear, setNewYear] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set up form with validation
  const form = useForm<CollegeFormValues>({
    resolver: zodResolver(collegeFormSchema),
    defaultValues: {
      collegeId: "",
      name: "",
      branches: [],
      years: [],
      createAdmin: false,
      adminName: "",
      adminEmail: "",
      adminPhone: "",
      adminPassword: "",
    },
  });

  // Watch createAdmin value to conditionally render admin fields
  const createAdmin = form.watch("createAdmin");
  
  // Handle adding a new branch
  const handleAddBranch = () => {
    if (!newBranch.trim()) return;
    const currentBranches = form.getValues("branches");
    
    if (!currentBranches.includes(newBranch)) {
      form.setValue("branches", [...currentBranches, newBranch]);
    }
    
    setNewBranch("");
  };
  
  // Handle removing a branch
  const handleRemoveBranch = (branch: string) => {
    const currentBranches = form.getValues("branches");
    form.setValue(
      "branches",
      currentBranches.filter((b) => b !== branch)
    );
  };
  
  // Handle adding a new year
  const handleAddYear = () => {
    if (!newYear.trim()) return;
    const currentYears = form.getValues("years");
    
    if (!currentYears.includes(newYear)) {
      form.setValue("years", [...currentYears, newYear]);
    }
    
    setNewYear("");
  };
  
  // Handle removing a year
  const handleRemoveYear = (year: string) => {
    const currentYears = form.getValues("years");
    form.setValue(
      "years",
      currentYears.filter((y) => y !== year)
    );
  };

  // Handle form submission
  const onSubmit = async (values: CollegeFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Create college in Firestore
      await createCollege(
        {
          name: values.name,
          branches: values.branches,
          years: values.years,
        },
        values.collegeId
      );
      
      // If createAdmin is true, create an admin user
      if (values.createAdmin && values.adminEmail && values.adminPassword) {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          values.adminEmail,
          values.adminPassword!
        );
        
        // Create user document in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          name: values.adminName,
          email: values.adminEmail,
          phone: values.adminPhone,
          role: "college",
          college: values.collegeId,
          createdAt: serverTimestamp(),
        });
        
        toast.success("College and admin user created successfully");
      } else {
        toast.success("College created successfully");
      }
      
      // Redirect to colleges list
      router.push("/admin/colleges");
    } catch (error: any) {
      console.error("Error creating college:", error);
      toast.error(error.message || "Failed to create college");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate college ID from name
  const generateCollegeId = () => {
    const name = form.getValues("name");
    if (!name) return;
    
    const id = name
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");
    
    form.setValue("collegeId", id);
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create New College</h1>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/colleges")}
          >
            Cancel
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>College Information</CardTitle>
                <CardDescription>
                  Create a new college and optionally add an admin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            onBlur={() => {
                              if (!form.getValues("collegeId")) {
                                generateCollegeId();
                              }
                            }} 
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
                        <FormLabel>College ID</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="unique-college-id" 
                              {...field} 
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={generateCollegeId}
                            >
                              Generate
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          A unique identifier for the college
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Branches */}
                <FormField
                  control={form.control}
                  name="branches"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branches</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a branch (e.g. Computer Science)"
                              value={newBranch}
                              onChange={(e) => setNewBranch(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddBranch();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddBranch}
                            >
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {field.value.map((branch, index) => (
                              <div
                                key={index}
                                className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-md"
                              >
                                <span>{branch}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 ml-2"
                                  onClick={() => handleRemoveBranch(branch)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Years */}
                <FormField
                  control={form.control}
                  name="years"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a year (e.g. First Year)"
                              value={newYear}
                              onChange={(e) => setNewYear(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddYear();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddYear}
                            >
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {field.value.map((year, index) => (
                              <div
                                key={index}
                                className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-md"
                              >
                                <span>{year}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 ml-2"
                                  onClick={() => handleRemoveYear(year)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Create admin toggle */}
                <FormField
                  control={form.control}
                  name="createAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Create College Admin</FormLabel>
                        <FormDescription>
                          Create an admin user for this college
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Admin fields (conditionally rendered) */}
                {createAdmin && (
                  <div className="border rounded-md p-4 space-y-4">
                    <h3 className="font-medium">Admin User Details</h3>
                    
                    <FormField
                      control={form.control}
                      name="adminName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="adminEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="admin@college.edu"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="adminPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="10-digit phone number"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="adminPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Minimum 6 characters"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create College"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AuthGuard>
  );
} 