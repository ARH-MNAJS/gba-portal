import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from '@supabase/supabase-js';
import { UserRole } from "@/lib/supabase";

// Create a server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: false, // Don't persist session on server
      autoRefreshToken: false,
    },
  }
);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" } // Used for UI routing, not for validation
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing email or password");
          return null;
        }

        try {
          console.log(`Attempting to authenticate ${credentials.email}`);
          
          // Authenticate with Supabase
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error) {
            console.error("Supabase authentication error:", error.message);
            return null;
          }

          if (!data.user) {
            console.error("No user returned from Supabase");
            return null;
          }

          console.log(`User authenticated successfully: ${data.user.id}`);
          console.log(`Session data available: ${!!data.session}`);

          // Get user role from database
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, email')
            .eq('id', data.user.id)
            .single();

          if (userError) {
            console.error("Error fetching user role:", userError.message);
            return null;
          }

          if (!userData) {
            console.error("No user data found in users table");
            return null;
          }

          console.log(`User role retrieved: ${userData.role}`);
          
          // IMPORTANT: No longer validating the role here to avoid blocking legitimate logins
          // The role-based access control will happen at the component level with AuthGuard
          
          // Return the user object that will be passed to the jwt callback
          const userObject = {
            id: data.user.id,
            email: userData.email,
            role: userData.role as UserRole,
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
          };
          
          console.log("Authentication successful, returning user object");
          return userObject;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        console.log("JWT callback: Setting user data in token");
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        console.log("Session callback: Setting token data in session");
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        // Include Supabase tokens to use for client-side requests
        session.supabaseAccessToken = token.accessToken as string;
        session.supabaseRefreshToken = token.refreshToken as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
    signOut: '/'
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 