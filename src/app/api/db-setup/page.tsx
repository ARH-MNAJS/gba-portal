"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CheckCircle, Copy, AlertCircle, Database, FileText, Shield, BarChart } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

// Simple inline Spinner component
const Spinner = () => (
  <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent text-primary rounded-full" aria-label="Loading"></div>
);

// Simple inline CodeBlock component
const CodeBlock = ({ language, code }: { language: string, code: string }) => (
  <div className="relative">
    <pre className={`language-${language} rounded-md bg-muted p-4 overflow-x-auto text-sm`}>
      <code>{code}</code>
    </pre>
  </div>
);

export default function DatabaseSetupPage() {
  const [setupKey, setSetupKey] = useState('dev-setup-key');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

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
    match /colleges/{collegeId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == collegeId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Access control for game stats
    match /gameStats/{statId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Access control for assessments
    match /assessments/{assessmentId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Access control for assessment attempts
    match /assessmentAttempts/{attemptId} {
      allow read: if request.auth != null;
      // Allow students to create their own attempts, admins to read all
      allow create: if request.auth != null && 
                    request.resource.data.studentId == request.auth.uid;
      allow update: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}`;

  const dbSchema = `# Database Schema for GBA Portal

## Collections

### users
Stores user authentication information.
\`\`\`
users/{userId}: {
  email: string,                  // User email
  role: 'admin' | 'student',      // User role (note: 'college' role removed)
  createdAt: timestamp,           // When user was created
  updatedAt: timestamp            // When user was last updated
}
\`\`\`

### students
Stores student profiles.
\`\`\`
students/{userId}: {
  name: string,                   // Student name
  email: string,                  // Student email
  phone: string,                  // Student phone number
  collegeId: string,              // College ID of the student
  branch: string,                 // Student branch/major
  year: string                    // Student year/grade
}
\`\`\`

### admins
Stores admin profiles.
\`\`\`
admins/{userId}: {
  name: string,                   // Admin name
  email: string,                  // Admin email
  phone: string                   // Admin phone number
}
\`\`\`

### colleges
Stores college profiles with embedded admin information.
\`\`\`
colleges/{collegeId}: {
  id: string,                     // College ID
  name: string,                   // College name
  branches: string[],             // Available branches/departments
  years: string[],                // Available academic years
  adminName: string,              // College admin name
  adminEmail: string,             // College admin email
  adminPhone: string,             // College admin phone
  adminId: string,                // Firebase Auth UID of the admin
  gamesAssigned: [                // Games assigned to this college
    {
      id: string,                 // Game ID
      gameId: string,             // Game ID (for consistency)
      assignedBy: string,         // User ID who assigned the game
      assignedAt: timestamp       // When the game was assigned
    }
  ],
  createdAt: timestamp,           // When college was created
  updatedAt: timestamp            // When college was last updated
}
\`\`\`

### gameStats
Stores statistics for game plays by students.
\`\`\`
gameStats/{statId}: {
  gameId: string,                 // Reference to the game
  userId: string,                 // User who played the game
  collegeId: string,              // College ID for direct college-based reporting
  studentName: string,            // Student name for easier reporting
  bestScore: number,              // Best original score achieved
  normalizedBestScore: number,    // Best normalized score (1-100)
  lastScore: number,              // Most recent original score
  normalizedLastScore: number,    // Most recent normalized score (1-100)
  plays: number,                  // Number of times played
  lastPlayed: timestamp,          // When last played
  timeTaken: number               // Time taken in seconds
}
\`\`\`

### assessments
Stores assessment configurations created by admins.
\`\`\`
assessments/{assessmentId}: {
  name: string,                   // Name of the assessment
  startDate: ISO string,          // Start date and time of the assessment
  endDate: ISO string,            // End date and time of the assessment
  duration: number,               // Total duration in minutes
  showReportAtEnd: boolean,       // Whether to show report to student after completion
  allowQuestionSwitch: boolean,   // Whether students can switch between games
  games: [                        // Array of games in this assessment
    {
      id: string,                 // Game ID
      name: string,               // Game name
      duration: number            // Game duration in minutes
    }
  ],
  assignedTo: string[],           // Array of college IDs this assessment is assigned to
  createdBy: string,              // Admin user ID who created this assessment
  createdAt: timestamp            // When this assessment was created
}
\`\`\`

### assessmentAttempts
Stores student attempts at assessments.
\`\`\`
assessmentAttempts/{attemptId}: {
  id: string,                     // Unique ID (usually studentId_assessmentId)
  assessmentId: string,           // Reference to the assessment
  studentId: string,              // Student who took the assessment
  completedAt: timestamp,         // When the assessment was completed
  totalScore: number,             // Overall normalized score (1-100)
  games: [                        // Results for each game
    {
      gameId: string,             // Game ID
      score: number,              // Original game score
      normalizedScore: number,    // Normalized score (1-100)
      timeTaken: number           // Time taken in seconds
    }
  ]
}
\`\`\`
`;

  const requiredIndexes = [
    {
      collection: 'gameStats',
      fields: ['collegeId', 'gameId'],
      description: 'Needed for efficient college-based game reports'
    },
    {
      collection: 'gameStats',
      fields: ['collegeId', 'lastPlayed'],
      description: 'For time-based college reports and analytics'
    },
    {
      collection: 'gameStats',
      fields: ['userId', 'gameId'],
      description: 'For student-specific game stats queries'
    },
    {
      collection: 'gameStats',
      fields: ['gameId', 'normalizedBestScore'],
      description: 'For leaderboards and ranking reports'
    },
    {
      collection: 'students',
      fields: ['collegeId', 'createdAt'],
      description: 'For listing students by college with sorting'
    },
    {
      collection: 'assessmentAttempts',
      fields: ['assessmentId', 'completedAt'],
      description: 'For assessment reports sorted by completion time'
    }
  ];

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
  
  const copyToClipboard = (text: string, type: 'rules' | 'schema') => {
    navigator.clipboard.writeText(text);
    if (type === 'rules') {
    setCopied(true);
    toast.success('Firebase rules copied to clipboard!');
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
    } else {
      setCopiedSchema(true);
      toast.success('Database schema copied to clipboard!');
      
      setTimeout(() => {
        setCopiedSchema(false);
      }, 2000);
    }
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
            This page provides tools to set up and verify your Firebase database configuration. 
            Click the buttons below to check and set up required collections, indexes, and rules.
            For security, certain actions require the setup secret key found in your .env.local file.
            Use with caution as these operations can modify your database structure.
          </AlertDescription>
        </Alert>
        
        <Tabs defaultValue="rules">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rules">Firebase Rules</TabsTrigger>
            <TabsTrigger value="schema">Database Schema</TabsTrigger>
            <TabsTrigger value="indexes">Required Indexes</TabsTrigger>
            <TabsTrigger value="check">Firebase Check</TabsTrigger>
          </TabsList>
          
          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>Firebase Security Rules</CardTitle>
                <CardDescription>
                  Copy these rules to your Firebase console under Firestore Database {'>'}Rules tab
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
                    onClick={() => copyToClipboard(firebaseRules, 'rules')}
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
              <CardFooter className="flex flex-col gap-4 items-start">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Security Rules Explanation:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>All authenticated users can read data</li>
                    <li>Users can update their own user profiles</li>
                    <li>Admin users can write to any collection</li>
                    <li>Students can create their own assessment attempts</li>
                    <li>Any authenticated user can write to gameStats (to record their scores)</li>
                    <li>College admins use the same auth as their adminId in college document</li>
                  </ul>
                </div>
              </CardFooter>
            </Card>
            
            <h3 className="text-lg font-semibold mt-8">Database Schema:</h3>
            <div className="mt-2 space-y-4">
              <CodeBlock
                language="json"
                code={`// gameStats/{statId}
{
  id: string,                  // Auto-generated document ID
  gameId: string,              // Reference to the game
  userId: string,              // User who played the game
  collegeId: string,           // College ID for direct college-based reporting
  studentName: string,         // Student name for easier reporting
  bestScore: number,           // Best original score achieved
  normalizedBestScore: number, // Best normalized score (1-100)
  lastScore: number,           // Most recent original score
  normalizedLastScore: number, // Most recent normalized score (1-100)
  plays: number,               // Number of times played
  lastPlayed: timestamp,       // When last played
  timeTaken: number            // Time taken in seconds
}`}
              />
              
              <CodeBlock
                language="json"
                code={`// colleges/{collegeId}
{
  id: string,                  // College ID
  name: string,                // College name
  branches: string[],          // Available branches/departments
  years: string[],             // Available academic years
  adminName: string,           // College admin name
  adminEmail: string,          // College admin email
  adminPhone: string,          // College admin phone
  adminId: string,             // Firebase Auth UID of the admin
  gamesAssigned: [             // Games assigned to this college
    {
      id: string,              // Game ID
      gameId: string,          // Game ID (for consistency)
      assignedBy: string,      // User ID who assigned the game
      assignedAt: timestamp    // When the game was assigned
    }
  ],
  createdAt: timestamp,        // When college was created
  updatedAt: timestamp         // When college was last updated
}`}
              />
              
              <CodeBlock
                language="json"
                code={`// assessments/{assessmentId}
{
  name: string,                // Name of the assessment
  startDate: ISO string,       // Start date and time
  endDate: ISO string,         // End date and time
  duration: number,            // Total duration in minutes
  showReportAtEnd: boolean,    // Show report to student after completion
  allowQuestionSwitch: boolean,// Can students switch between games
  games: [
    {
      id: string,              // Game ID
      name: string,            // Game name
      duration: number         // Game duration in minutes
    }
  ],
  assignedTo: string[],        // College IDs this assessment is assigned to
  createdBy: string,           // Admin user ID who created this
  createdAt: timestamp         // Creation timestamp
}`}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="schema">
            <Card>
              <CardHeader>
                <CardTitle>Database Schema</CardTitle>
                <CardDescription>
                  Complete database schema for your application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-muted overflow-auto text-sm max-h-[400px]">
                    {dbSchema}
                  </pre>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(dbSchema, 'schema')}
                  >
                    {copiedSchema ? (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copiedSchema ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 items-start">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Important Changes:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>College admin details are now embedded directly in the college document</li>
                    <li>The 'college' role has been removed from the users collection</li>
                    <li>Each college has an adminId field that references a Firebase Auth user</li>
                    <li>Games option has been removed from all sidebars for simplicity</li>
                  </ul>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="indexes">
            <Card>
              <CardHeader>
                <CardTitle>Required Firestore Indexes</CardTitle>
                <CardDescription>
                  These indexes should be created in your Firebase console to optimize queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Indexes are needed for compound queries where you filter by one field and order by another. Create these indexes in the Firebase console under Firestore Database {'>'}Indexes tab.
                  </p>
                  {requiredIndexes.map((index, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">Collection: <code>{index.collection}</code></h3>
                          <p className="text-sm text-muted-foreground mt-1">{index.description}</p>
                        </div>
                        <Badge variant="outline">
                          {index.fields.map((field) => (
                            <span key={field} className="mr-2">
                              {field}
                            </span>
                          ))}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="check">
            <Card>
              <CardHeader>
                <CardTitle>Firebase Database Check</CardTitle>
                <CardDescription>
                  Verify and configure your Firebase backend setup. Make sure all collections, indexes, and rules are properly set up.
                  The process follows this order: 1. Create Collections {'>'} 2. Set up Indexes {'>'} 3. Configure Rules
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
                  <div className="mt-6 space-y-6">
                      <div>
                      <h3 className="text-lg font-medium mb-3">Collections</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {results && results.collections && Object.entries(results.collections).map(([name, exists]) => (
                          <div key={name} className="border rounded-lg p-4 text-center">
                            <div className="text-2xl mb-2">
                              {exists ? (
                                <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                              ) : (
                                <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
                              )}
                      </div>
                            <h4 className="font-medium">{name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {exists ? 'Exists' : 'Missing'}
                            </p>
                        </div>
                        ))}
                      </div>
                    </div>
                    
                    {results.errors.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Errors</h3>
                        <div className="space-y-2">
                          {results.errors.map((error: string, i: number) => (
                            <Alert key={i} variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col items-start">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">Default Admin User:</p>
                  <div className="mt-1">Email: <strong>admin@example.com</strong></div>
                  <div>Password: <strong>admin123</strong></div>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        
        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="info">
            <AccordionTrigger className="text-base font-medium">
              How the Game Practice System Works
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3">
              <p>
                <span className="font-medium">Game Assignment:</span> Admins assign games to colleges, which are stored in the <code>gamesAssigned</code> field within each college document.
              </p>
              <p>
                <span className="font-medium">Student Practice:</span> When a student plays a game, their score and other metrics are stored in the <code>gameStats</code> collection, which now includes both <code>collegeId</code> and <code>studentName</code> fields for efficient reporting.
              </p>
              <p>
                <span className="font-medium">Score Normalization:</span> All raw game scores are normalized to a 1-100 scale to enable fair comparison across different game types. The normalization formula is: <code>((originalScore - minPossibleScore) / (maxPossibleScore - minPossibleScore)) * 99 + 1</code>
              </p>
              <p>
                <span className="font-medium">Report Efficiency:</span> Reports now query the <code>gameStats</code> collection directly by <code>collegeId</code> instead of having to join data from multiple collections, allowing the system to scale efficiently for colleges with many students.
              </p>
              <p>
                <span className="font-medium">Assessment System:</span> Admins can create timed assessments with multiple games, which are stored in the <code>assessments</code> collection. When students complete these assessments, their results are saved in the <code>assessmentAttempts</code> collection.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
} 