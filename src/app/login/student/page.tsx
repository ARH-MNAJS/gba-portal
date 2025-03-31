"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { safeRedirect } from "@/lib/auth-utils";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

export default function StudentLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      console.log("Attempting to sign in as student:", values.email);
      
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        // Pass role for routing purposes after successful login
        role: "student",
        redirect: false,
      });

      console.log("Sign in result:", result ? JSON.stringify(result) : "no result");

      if (result?.error) {
        console.error("Login error:", result.error);
        setErrorMessage(result.error);
        toast.error(result.error || "Login failed");
        return;
      }

      if (!result?.ok) {
        console.error("Login not successful but no error provided");
        setErrorMessage("Login failed. Please try again.");
        toast.error("Login failed. Please try again.");
        return;
      }

      console.log("Login successful, redirecting to student dashboard");
      toast.success("Logged in successfully!");
      
      // Delay redirect slightly to allow toast to be seen
      setTimeout(() => {
        router.push("/student");
      }, 500);
    } catch (error) {
      console.error("Unexpected error during login:", error);
      setErrorMessage("An unexpected error occurred");
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 bg-background p-6 sm:p-8 sm:shadow-lg sm:rounded-lg">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Student Login</h1>
            <p className="text-muted-foreground">
              Enter your credentials to access your student portal
            </p>
          </div>
          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded">
              {errorMessage}
            </div>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="you@example.com"
                type="email"
                disabled={isLoading}
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
                disabled={isLoading}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
              )}
              Sign In
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground">
            <Link 
              href="/login/admin-college" 
              className="text-primary underline-offset-4 hover:underline"
            >
              Login as Admin or College?
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 