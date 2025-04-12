import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Environment variables
const setupKey = process.env.SETUP_SECRET_KEY || 'dev-setup-key'; // Add to .env.local

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json();
    
    // Verify setup key for security
    if (key !== setupKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Status tracking
    const results = {
      collections: {
        users: false,
        students: false,
        admins: false,
        colleges: false,
        games: false,
        gameStats: false,
        assessments: false,
        assessmentAttempts: false
      },
      errors: [] as string[]
    };
    
    // Check if collections exist by querying them
    try {
      // No need to check users collection as it's no longer used
      results.collections.users = false; // Mark as false since we don't use this collection
      
      // Check students collection
      const studentsSnapshot = await adminDb.collection('students').limit(1).get();
      results.collections.students = !studentsSnapshot.empty;
      
      // Check admins collection
      const adminsSnapshot = await adminDb.collection('admins').limit(1).get();
      results.collections.admins = !adminsSnapshot.empty;
      
      // Check colleges collection
      const collegesSnapshot = await adminDb.collection('colleges').limit(1).get();
      results.collections.colleges = !collegesSnapshot.empty;
      
      // Check games collection
      const gamesSnapshot = await adminDb.collection('games').limit(1).get();
      results.collections.games = !gamesSnapshot.empty;
      
      // Check gameStats collection
      const gameStatsSnapshot = await adminDb.collection('gameStats').limit(1).get();
      results.collections.gameStats = !gameStatsSnapshot.empty;
      
      // Check assessments collection
      const assessmentsSnapshot = await adminDb.collection('assessments').limit(1).get();
      results.collections.assessments = !assessmentsSnapshot.empty;
      
      // Check assessmentAttempts collection
      const attemptsSnapshot = await adminDb.collection('assessmentAttempts').limit(1).get();
      results.collections.assessmentAttempts = !attemptsSnapshot.empty;
      
    } catch (error: any) {
      results.errors.push(`Error checking collections: ${error.message}`);
    }
    
    // Check for required indexes
    try {
      // This would require the Firebase Admin SDK with full admin privileges
      // For simplicity, we're just returning a list of required indexes in the UI
      
      // const indexes = await adminDb.listIndexes();
      // Checking indexes is complex and typically requires high privileges
    } catch (error: any) {
      results.errors.push(`Error checking indexes: ${error.message}`);
    }
    
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 