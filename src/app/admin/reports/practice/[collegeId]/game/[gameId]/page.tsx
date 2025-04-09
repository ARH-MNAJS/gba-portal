"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCollegeById, getCollegeByAdminId } from '@/lib/utils/colleges';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart } from '@/components/charts/PieChart';

interface PracticeStats {
  totalPlays: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  completionRate: number;
}

interface Student {
  id: string;
  name: string;
  bestScore: number;
  plays: number;
  lastPlayed: string;
}

export default function GamePracticeReportPage({ 
  params 
}: { 
  params: { collegeId: string; gameId: string } 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collegeName, setCollegeName] = useState<string>('College');
  const [gameName, setGameName] = useState<string>('Game');
  const [students, setStudents] = useState<Student[]>([]);
  const [practiceStats, setPracticeStats] = useState<PracticeStats>({
    totalPlays: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    completionRate: 0,
  });
  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] }>({
    labels: [],
    data: [],
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // First try to get college directly
        let college = await getCollegeById(params.collegeId);
        
        // If not found, check if it's an admin ID
        if (!college) {
          college = await getCollegeByAdminId(params.collegeId);
        }

        if (!college) {
          setError('College not found');
          return;
        }

        setCollegeName(college.name);

        // Get game details
        const gameDoc = await getDocs(query(collection(db, 'games'), where('id', '==', params.gameId)));
        if (!gameDoc.empty) {
          setGameName(gameDoc.docs[0].data().name || params.gameId);
        }

        // Get all students for this college
        const studentsSnapshot = await getDocs(
          query(collection(db, 'students'), where('collegeId', '==', college.id))
        );

        const studentIds = studentsSnapshot.docs.map(doc => doc.id);
        const studentsMap = new Map(
          studentsSnapshot.docs.map(doc => [doc.id, doc.data().name])
        );

        // Get game stats for these students
        const gameStatsQuery = query(
          collection(db, 'gameStats'),
          where('userId', 'in', studentIds),
          where('gameId', '==', params.gameId)
        );

        const gameStatsSnapshot = await getDocs(gameStatsQuery);
        
        const studentsData: Student[] = [];
        let totalScore = 0;
        let highestScore = 0;
        let lowestScore = Infinity;
        let totalPlays = 0;
        let completedGames = 0;

        gameStatsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const score = data.normalizedBestScore || 0;
          
          studentsData.push({
            id: doc.id,
            name: studentsMap.get(data.userId) || 'Unknown Student',
            bestScore: score,
            plays: data.plays || 0,
            lastPlayed: data.lastPlayed || '',
          });

          totalScore += score;
          highestScore = Math.max(highestScore, score);
          lowestScore = Math.min(lowestScore, score);
          totalPlays += data.plays || 0;
          if (score > 0) completedGames++;
        });

        // Sort students by best score
        studentsData.sort((a, b) => b.bestScore - a.bestScore);

        setStudents(studentsData);
        setPracticeStats({
          totalPlays,
          averageScore: studentsData.length ? totalScore / studentsData.length : 0,
          highestScore,
          lowestScore: lowestScore === Infinity ? 0 : lowestScore,
          completionRate: studentsData.length ? (completedGames / studentsData.length) * 100 : 0,
        });

        // Prepare chart data
        const scoreRanges = ['0-20', '21-40', '41-60', '61-80', '81-100'];
        const scoreDistribution = new Array(5).fill(0);

        studentsData.forEach(student => {
          const score = student.bestScore;
          const rangeIndex = Math.min(Math.floor(score / 20), 4);
          scoreDistribution[rangeIndex]++;
        });

        setChartData({
          labels: scoreRanges,
          data: scoreDistribution,
        });

      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load report data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.collegeId, params.gameId]);

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
      <h1 className="text-2xl font-bold">{gameName} Practice Report - {collegeName}</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Practice Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Plays:</span>
                <span>{practiceStats.totalPlays}</span>
              </div>
              <div className="flex justify-between">
                <span>Average Score:</span>
                <span>{practiceStats.averageScore.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Highest Score:</span>
                <span>{practiceStats.highestScore.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Lowest Score:</span>
                <span>{practiceStats.lowestScore.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Completion Rate:</span>
                <span>{practiceStats.completionRate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart labels={chartData.labels} data={chartData.data} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students.map(student => (
              <div key={student.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Last played: {new Date(student.lastPlayed).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div>Score: {student.bestScore.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">
                    Plays: {student.plays}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 