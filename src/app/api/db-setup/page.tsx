"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CheckCircle, Copy, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner';

export default function DatabaseSetupPage() {
  const [setupKey, setSetupKey] = useState('dev-setup-key');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  
  const sqlScript = `
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student', 'college')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  college TEXT,
  branch TEXT,
  year TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create colleges table
CREATE TABLE IF NOT EXISTS public.colleges (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  college TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Create admin user (password: admin123)
INSERT INTO public.users (id, email, role, password_hash)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'admin@example.com', 
  'admin', 
  '$2a$10$8RUfGcfQRryiOxsrST5.4OUxmUrj1YGUQvyb1xLmHsW9X8kgwKlde'
) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admins (id, name, email, phone)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'Admin User', 
  'admin@example.com', 
  '1234567890'
)
ON CONFLICT (id) DO NOTHING;
`;

  const firebaseRules = `// Firestore rules for security
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authenticated users can read public data
    match /{document=**} {
      allow read: if request.auth != null;
    }
    
    // User can read and update their own user document
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId;
    }
    
    // Access control for student profiles
    match /students/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Access control for admin profiles
    match /admins/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Access control for college profiles
    match /colleges/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}`;

  const checkDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: setupKey }),
      });
      
      const data = await response.json();
      setResults(data);
      
      if (response.ok) {
        toast.success('Firebase setup check completed!');
      } else {
        toast.error('Firebase setup check failed!');
      }
    } catch (error) {
      console.error('Error checking database:', error);
      toast.error('Error checking database');
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(firebaseRules);
    setCopied(true);
    toast.success('Firebase rules copied to clipboard!');
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  
  return (
    <div className="container max-w-5xl py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Firebase Setup</h1>
        <p className="text-muted-foreground">
          Configure Firebase Cloud Firestore and Authentication for your application
        </p>
      </div>
      
      <div className="grid gap-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important!</AlertTitle>
          <AlertDescription>
            This page contains Firestore security rules to set up your Firebase. Copy the rules and paste them into your 
            Firebase console under Firestore Database > Rules tab.
          </AlertDescription>
        </Alert>
        
        <Tabs defaultValue="sql">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sql">Firebase Rules</TabsTrigger>
            <TabsTrigger value="check">Firebase Check</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sql">
            <Card>
              <CardHeader>
                <CardTitle>Firebase Security Rules</CardTitle>
                <CardDescription>
                  Copy these rules to your Firebase console under Firestore Database > Rules tab
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-muted overflow-auto text-sm max-h-[400px]">
                    {firebaseRules}
                  </pre>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="absolute top-2 right-2"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  After applying these rules, the admin user will be created with:
                  <div className="mt-1">Email: <strong>admin@example.com</strong></div>
                  <div>Password: <strong>admin123</strong></div>
                </div>
                <Button variant="default" onClick={copyToClipboard}>
                  {copied ? 'Copied!' : 'Copy Rules'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="check">
            <Card>
              <CardHeader>
                <CardTitle>Firebase Database Check</CardTitle>
                <CardDescription>
                  Check if the Firebase collections exist and are properly configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Setup Key"
                    value={setupKey}
                    onChange={(e) => setSetupKey(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button onClick={checkDatabase} disabled={loading}>
                    {loading ? 'Checking...' : 'Check Firebase'}
                  </Button>
                </div>
                
                {results && (
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2">Collections Status</h3>
                        <ul className="space-y-1">
                          {Object.entries(results.results.collections).map(([collection, exists]) => (
                            <li key={collection} className="flex items-center text-sm">
                              {exists ? (
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                              )}
                              <span className="capitalize">{collection}</span>: {exists ? 'Exists' : 'Missing'}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-medium mb-2">Admin User</h3>
                        <div className="flex items-center text-sm">
                          {results.results.admin ? (
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                          )}
                          <span>Admin User: {results.results.admin ? 'Exists' : 'Missing'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {results.results.errors.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Errors</h3>
                        <div className="rounded-lg bg-red-50 p-3 text-red-900 text-sm">
                          <ul className="list-disc pl-4 space-y-1">
                            {results.results.errors.map((error: string, i: number) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="outline" onClick={() => window.open('https://console.firebase.google.com', '_blank')}>
                  <Database className="h-4 w-4 mr-2" />
                  Open Firebase Console
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>
            After setting up the database, restart the server and try logging in with the admin credentials.
          </p>
        </div>
      </div>
    </div>
  );
} 