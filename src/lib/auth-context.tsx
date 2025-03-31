"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, User, UserRole, AUTH_ERROR_MESSAGES } from './supabase';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { handleAuthError, safeRedirect, getRoleRedirectPath } from './auth-utils';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; success?: boolean }>;
  signUp: (email: string, password: string, role: UserRole, userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  getUserRole: () => UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const router = useRouter();

  // Function to fetch user role by ID
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data.role as UserRole;
    } catch (error) {
      // Silent fail but return null to indicate no role found
      return null;
    }
  };

  useEffect(() => {
    // Initial session check
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Get session
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          setSession(data.session);
          
          // Get user role
          const role = await fetchUserRole(data.session.user.id);
          
          if (role) {
            setUser({
              id: data.session.user.id,
              email: data.session.user.email!,
              role: role
            });
          }
        }
      } catch (error) {
        // Silent fail in initialization
      } finally {
        setLoading(false);
        setIsAuthReady(true);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      try {
        if (newSession) {
          setSession(newSession);
          
          // Get user role on auth change
          const role = await fetchUserRole(newSession.user.id);
          
          if (role) {
            const userData = {
              id: newSession.user.id,
              email: newSession.user.email!,
              role: role
            };
            
            setUser(userData);
            
            // Navigate to dashboard based on role
            if (event === 'SIGNED_IN') {
              // Use utility to safely redirect
              safeRedirect(router, getRoleRedirectPath(role), { refresh: true, delay: 500 });
            }
          } else {
            // We have a session but couldn't fetch the role
            toast.error("Failed to retrieve user role. Please try signing in again.");
            // Just to be safe, sign out to avoid an invalid state
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            safeRedirect(router, '/login');
          }
        } else {
          // No session, clear user data
          setSession(null);
          setUser(null);
          
          if (event === 'SIGNED_OUT') {
            safeRedirect(router, '/', { refresh: true });
          }
        }
      } catch (error) {
        // On error, reset state and redirect to login
        setSession(null);
        setUser(null);
        toast.error("Authentication error. Please try signing in again.");
        safeRedirect(router, '/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        const errorMessage = handleAuthError(error);
        toast.error(errorMessage);
        return { error };
      }

      // Return success without triggering redirect here
      // Let the auth state change listener handle the redirection
      return { success: true, error: null };
    } catch (error) {
      const errorMessage = handleAuthError(error);
      toast.error(errorMessage);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, role: UserRole, userData: any) => {
    try {
      // Step 1: Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        const errorMessage = handleAuthError(error);
        toast.error(errorMessage);
        return { error };
      }
      
      if (!data.user) {
        toast.error("User creation failed. Please try again.");
        return { error: new Error('User creation failed') };
      }
      
      // Step 2: Add user to role table
      const userId = data.user.id;
      
      // Create entry in users table
      const { error: userError } = await supabase
        .from('users')
        .insert({ id: userId, email, role });
      
      if (userError) {
        const errorMessage = handleAuthError(userError);
        toast.error(errorMessage);
        return { error: userError };
      }
      
      // Create role-specific entry
      const { error: roleError } = await supabase
        .from(`${role}s`)
        .insert({
          id: userId,
          email,
          ...userData
        });
      
      if (roleError) {
        toast.error(`Error creating user profile. Please contact support.`);
      }
      
      return { error: null };
    } catch (error) {
      const errorMessage = handleAuthError(error);
      toast.error(errorMessage);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Clear local state first to prevent flash of protected content
      setUser(null);
      setSession(null);
      
      // Then sign out from Supabase
      await supabase.auth.signOut();
      
      // Use utility to safely redirect to home
      // The auth state listener will also receive the signout event
      // but our path check in safeRedirect will prevent duplicate redirects
      safeRedirect(router, '/', { refresh: true });
    } catch (error) {
      const errorMessage = handleAuthError(error);
      toast.error(errorMessage);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        const errorMessage = handleAuthError(error);
        toast.error(errorMessage);
      } else {
        toast.success("Password reset instructions sent to your email");
      }
      return { error };
    } catch (error) {
      const errorMessage = handleAuthError(error);
      toast.error(errorMessage);
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const errorMessage = handleAuthError(error);
        toast.error(errorMessage);
      } else {
        toast.success("Password updated successfully");
      }
      return { error };
    } catch (error) {
      const errorMessage = handleAuthError(error);
      toast.error(errorMessage);
      return { error };
    }
  };

  const getUserRole = (): UserRole | null => {
    return user ? user.role : null;
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    getUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 