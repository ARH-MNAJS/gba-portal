"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getCollegeById, getCollegeByAdminId } from '@/lib/utils/colleges';
import type { College } from '@/lib/utils/colleges';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { ArrowLeft, Download, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getGameById } from '@/games';

interface PracticeParams {
  collegeId?: string;
  gameId?: string;
}

interface StudentData {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

export default function GamePracticeReportPage({ 
  params 
}: { 
  params?: { collegeId?: string; gameId?: string } 
}) {
  const router = useRouter();

  // Handle case when params are undefined or not properly provided
  const unwrappedParams = params ? (use(params as any) as PracticeParams) : ({} as PracticeParams);
  const initialCollegeId = unwrappedParams.collegeId || '';
  const initialGameId = unwrappedParams.gameId || '';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collegeName, setCollegeName] = useState<string>('College');
  const [gameName, setGameName] = useState<string>('Game');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const [collegeId, setCollegeId] = useState<string>(initialCollegeId);
  const [gameId, setGameId] = useState<string>(initialGameId);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Check if collegeId and gameId are provided
        if (!initialCollegeId || !initialGameId) {
          setError('College ID and Game ID are required');
          setLoading(false);
          return; // Early return prevents further execution
        }

        // Get college details
        let college: College | null = null;
        try {
          college = await getCollegeById(initialCollegeId);
          
          if (!college) {
            // Try to get college by admin ID instead
            college = await getCollegeByAdminId(initialCollegeId);
            
            if (!college) {
              setError('College not found');
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error('Error fetching college:', e);
          setError('Error fetching college data');
          setLoading(false);
          return;
        }

        setCollegeId(college.id);
        setCollegeName(college.name);

        // Get game details
        const gameInfo = getGameById(initialGameId);
        setGameName(gameInfo?.name || 'Game');
        setGameId(initialGameId);

        // Get all students for this college
        const studentsSnapshot = await getDocs(
          query(collection(db, 'students'), where('collegeId', '==', college.id))
        );

        const totalStudents = studentsSnapshot.docs.length;
        const studentsList = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StudentData[];

        // Get game stats for these students
        const gameStatsQuery = query(
          collection(db, 'gameStats'),
          where('collegeId', '==', college.id),
          where('gameId', '==', initialGameId)
        );

        const gameStatsSnapshot = await getDocs(gameStatsQuery);
        
        // Process students with game stats
        const studentsWithStats = gameStatsSnapshot.docs.map(doc => {
          const data = doc.data();
          const studentId = data.userId;
          const student = studentsList.find(s => s.id === studentId) || {} as StudentData;
          
          // Create display name with proper type safety
          let displayName = 'Unknown Student';
          if (student.name) {
            displayName = student.name;
          } else if (student.firstName && student.lastName) {
            displayName = `${student.firstName} ${student.lastName}`;
          }
          
          return {
            id: doc.id,
            userId: studentId,
            name: displayName,
            email: student.email || '',
            phone: student.phone || '',
            totalScore: data.totalScore || 0,
            bestScore: data.normalizedBestScore || 0,
            plays: data.plays || 0,
            lastPlayed: data.lastPlayed || '',
          };
        });
        
        // Sort students by total score
        studentsWithStats.sort((a, b) => b.totalScore - a.totalScore);
        setStudents(studentsWithStats);

        // Prepare pie chart data
        const studentsWithPractice = studentsWithStats.length;
        const studentsWithoutPractice = totalStudents - studentsWithPractice;
        
        setPieChartData([
          { name: 'Practiced', value: studentsWithPractice, color: '#0088FE' },
          { name: 'Not Practiced', value: studentsWithoutPractice, color: '#FFBB28' }
        ]);

        // Get games played by all students in this college
        const allGamesStatsQuery = query(
          collection(db, 'gameStats'),
          where('collegeId', '==', college.id)
        );

        const allGamesSnapshot = await getDocs(allGamesStatsQuery);
        
        // Count plays by game
        const gamePlayCounts: {[key: string]: {plays: number, name: string}} = {};
        
        await Promise.all(allGamesSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const gameId = data.gameId;
          
          if (!gamePlayCounts[gameId]) {
            const gameInfo = getGameById(gameId);
            const gameName = gameInfo?.name || gameId;
            
            gamePlayCounts[gameId] = {
              plays: 0,
              name: gameName
            };
          }
          
          gamePlayCounts[gameId].plays += (data.plays || 0);
        }));
        
        // Sort and get top 5 games
        const topGames = Object.entries(gamePlayCounts)
          .map(([id, data]) => ({
            gameId: id,
            name: data.name,
            plays: data.plays
          }))
          .sort((a, b) => b.plays - a.plays)
          .slice(0, 5);
        
        setBarChartData(topGames);
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load report data');
        setLoading(false);
      }
    }

    loadData();
  }, [initialCollegeId, initialGameId]);

  const handleViewDetailedReport = (studentId: string) => {
    router.push(`/admin/reports/practice/${collegeId}/game/${gameId}/student/${studentId}`);
  };

  const navigateBack = () => {
    router.push(`/admin/reports/practice/${collegeId}`);
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Email', 'Phone', 'Total Score', 'Best Score', 'Plays', 'Last Played'];
    const csvData = students.map(student => [
      student.name,
      student.email,
      student.phone,
      student.totalScore.toString(),
      student.bestScore.toString(),
      student.plays.toString(),
      new Date(student.lastPlayed).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${gameName}_${collegeName}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="space-y-4">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-[400px] w-full" />
    </div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={navigateBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{gameName} Practice Report - {collegeName}</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student Participation</CardTitle>
            <CardDescription>
              Students who have practiced this game
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Practiced Games</CardTitle>
            <CardDescription>
              Top games practiced by students
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis label={{ value: 'Total Plays', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="plays" name="Plays" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
                </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Student Performance</CardTitle>
            <CardDescription>
              Students who have practiced this game
            </CardDescription>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Total Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    No students have practiced this game yet
                  </TableCell>
                </TableRow>
              ) : (
                students.map(student => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.phone}</TableCell>
                    <TableCell>{student.totalScore.toFixed(0)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewDetailedReport(student.userId)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Detailed Report
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 