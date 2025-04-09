"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { safeRedirect } from "@/lib/auth-utils";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  role: z.enum(["admin", "college"], {
    message: "Please select your role.",
  }),
});

export default function AdminCollegeLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "",
    },
  });

  // Watch for role changes to enable/disable fields
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "role") {
        setSelectedRole(value.role as string);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setErrorMessage("");
    let userCredential;
    
    try {
      console.log(`Attempting to sign in as ${values.role}:`, values.email);
      
      // Sign in with Firebase
      try {
        userCredential = await signInWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );
      } catch (authError: any) {
        // Handle Firebase Auth errors immediately
        console.error("Firebase Auth error:", authError);
        
        let errorMsg = "Login failed. Please check your credentials.";
        
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
          errorMsg = "Invalid email or password";
        } else if (authError.code === 'auth/too-many-requests') {
          errorMsg = "Too many failed login attempts. Please try again later.";
        } else if (authError.code === 'auth/user-disabled') {
          errorMsg = "This account has been disabled. Please contact support.";
        }
        
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }
      
      // If we reach here, authentication was successful
      
      // Check if user exists in the appropriate collection based on role
      try {
        if (values.role === "admin") {
          // Check admin collection
          const adminDoc = await getDoc(doc(db, 'admins', userCredential.user.uid));
          
          if (!adminDoc.exists()) {
            console.log("Admin record not found for authenticated user");
            await auth.signOut();
            setErrorMessage("Your account is not registered as an admin. Please use the correct login portal.");
            return;
          }
          
          console.log("Admin login successful, redirecting");
          toast.success("Logged in as Admin successfully!");
          
          // Redirect to admin dashboard
          setTimeout(() => {
            router.push('/admin');
          }, 500);
        } 
        else if (values.role === "college") {
          // Check colleges collection - first by adminId (UID)
          const collegeByIdQuery = query(
            collection(db, 'colleges'), 
            where('adminId', '==', userCredential.user.uid)
          );
          const collegeByIdSnapshot = await getDocs(collegeByIdQuery);
          
          // If not found by ID, try finding by adminEmail
          if (collegeByIdSnapshot.empty) {
            const collegeByEmailQuery = query(
              collection(db, 'colleges'), 
              where('adminEmail', '==', values.email)
            );
            const collegeByEmailSnapshot = await getDocs(collegeByEmailQuery);
            
            if (collegeByEmailSnapshot.empty) {
              console.log("College admin record not found for authenticated user");
              await auth.signOut();
              setErrorMessage("College admin record not found. Please contact your administrator.");
              return;
            }
          }
          
          console.log("College login successful, redirecting");
          toast.success("Logged in as College Admin successfully!");
          
          // Redirect to admin dashboard with limited access
          setTimeout(() => {
            router.push('/admin');
          }, 500);
        }
      } catch (firestoreError: any) {
        console.error("Firestore error:", firestoreError);
        
        // Handle Firestore permission errors
        let errorMsg = "Unable to verify account permissions.";
        
        if (firestoreError.code === "permission-denied" || firestoreError.message.includes("Missing or insufficient permissions")) {
          errorMsg = "You don't have access to the requested role. Please select the correct role.";
        }
        
        // Sign out since we couldn't verify role
        await auth.signOut();
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        return;
      }
    } catch (error: any) {
      console.error("Unhandled login error:", error);
      
      // Generic error handling for any other errors
      const errorMsg = "An unexpected error occurred. Please try again later.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      
      // Make sure user is signed out on any error
      try {
        await auth.signOut();
      } catch (e) {
        // Silently handle sign out errors
        console.error("Error signing out:", e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if form fields should be disabled
  const areFieldsDisabled = isLoading || !selectedRole;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 bg-background p-6 sm:p-8 sm:shadow-lg sm:rounded-lg">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Admin/College Login</h1>
            <p className="text-muted-foreground">
              Enter your credentials to access your dashboard
            </p>
          </div>
          {errorMessage && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
              <p className="font-medium mb-1">Login Error</p>
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Select your role</Label>
              <RadioGroup 
                value={form.watch("role")}
                onValueChange={(value) => form.setValue("role", value as "admin" | "college")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="admin" />
                  <Label htmlFor="admin">Admin</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="college" id="college" />
                  <Label htmlFor="college">College</Label>
                </div>
              </RadioGroup>
              {form.formState.errors.role && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.role.message}
                </p>
              )}
              {!selectedRole && (
                <p className="text-sm text-amber-500">
                  Please select a role to continue
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="you@example.com"
                type="email"
                disabled={areFieldsDisabled}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/reset-password"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                disabled={areFieldsDisabled}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={areFieldsDisabled || !form.formState.isValid}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground">
            <Link 
              href="/login/student" 
              className="text-primary underline-offset-4 hover:underline"
            >
              Login as Student?
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 