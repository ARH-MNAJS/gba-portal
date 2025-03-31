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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import collegesData from "@/data/colleges.json";
import { createUser } from "@/lib/actions/user-actions";

// Define form schema for college user addition
const collegeUserSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email format" }),
  phone: z.string().regex(/^\d{10}$/, { message: "Phone must be 10 digits" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  college: z.string().min(1, { message: "College is required" }),
});

type CollegeUserFormValues = z.infer<typeof collegeUserSchema>;

export default function AddCollegeUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form for adding college user
  const form = useForm<CollegeUserFormValues>({
    resolver: zodResolver(collegeUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      college: "",
    },
  });

  // Handle form submission
  const handleSubmit = async (values: CollegeUserFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Call the server action to create a user
      await createUser({
        email: values.email,
        password: values.password,
        name: values.name,
        role: 'college',
        phone: values.phone,
        college: values.college,
      });

      toast.success("College user created successfully");
      router.push("/admin/user/college");
    } catch (error: any) {
      console.error("Error creating college user:", error);
      toast.error(error.message || "Failed to create college user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get college name from ID
  const getCollegeNameById = (id: string) => {
    const college = collegesData.colleges.find(c => c.id === id);
    return college?.name || id;
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Add New College User</h1>
          <Button 
            variant="outline" 
            onClick={() => router.push("/admin/user/college")}
          >
            Cancel
          </Button>
        </div>

        <div className="grid gap-6 max-w-xl mx-auto">
          <Alert className="mb-4">
            <AlertDescription>
              College users can manage students and view reports for their institution.
            </AlertDescription>
          </Alert>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter college admin's full name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="college-admin@example.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="10-digit phone number"
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="college">College</Label>
              <Select
                onValueChange={(value) => form.setValue("college", value)}
              >
                <SelectTrigger id="college">
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  {collegesData.colleges.map((college) => (
                    <SelectItem key={college.id} value={college.id}>
                      {college.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.college && (
                <p className="text-sm text-destructive">{form.formState.errors.college.message}</p>
              )}
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
                )}
                Add College User
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
} 