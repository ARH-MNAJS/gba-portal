import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  getGameById, 
  GAMES_METADATA, 
  GAME_CATEGORIES, 
  GAME_COLORS
} from '@/games/index';
import { serializeFirestoreData } from '@/lib/utils';
import { normalizeScore, getGameMaxScore } from './score-normalization';

/**
 * Client-side version of serializeFirestoreData - similar to our server-side
 * implementation but for use in client components
 */
const serializeFirestoreDataLocal = (data: any): any => {
  if (!data) return data;
  
  // Handle different data types
  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreDataLocal(item));
  }
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  // Handle Firestore timestamp
  if (typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }
  
  // Handle Firestore timestamp that has been partially serialized
  if (data._seconds !== undefined && data._nanoseconds !== undefined) {
    return new Date(data._seconds * 1000).toISOString();
  }
  
  // Handle normal objects by recursively processing each property
  const serialized: Record<string, any> = {};
  Object.keys(data).forEach(key => {
    serialized[key] = serializeFirestoreDataLocal(data[key]);
  });
  
  return serialized;
};

// Game interfaces
export interface Game {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  component: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: any;
  updatedAt: any;
}

export interface GameWithMetadata extends Game {
  categoryName?: string;
  thumbnailEmoji?: string;
  stats?: {
    bestScore: number;
    normalizedBestScore?: number;
    lastScore: number;
    normalizedLastScore?: number;
    plays: number;
  };
  assignmentId?: string;
  gameName?: string;
}

export interface GameAssignment {
  id: string; // This will be the gameId for direct assignments in college docs
  gameId: string;
  assignedBy: string;
  assignedAt: any;
  gameName?: string;
}

export interface GameStats {
  id?: string;
  gameId: string;
  userId: string;
  collegeId: string;
  studentName: string;
  bestScore: number;
  normalizedBestScore: number;
  lastScore: number;
  normalizedLastScore: number;
  plays: number;
  lastPlayed: any;
  timeTaken?: number;
}

// Get a game category by ID
export function getGameCategory(categoryId: string) {
  return GAME_CATEGORIES.find(c => c.id === categoryId) || {
    id: "default",
    name: "Other Games",
    description: "Miscellaneous games"
  };
}

// Get thumbnail emoji for a game
export function getGameThumbnail(gameId: string): string {
  const game = getGameById(gameId);
  return game?.thumbnailEmoji || '🎮';
}

// Get colors for a game category
export function getGameColors(categoryId: string) {
  return GAME_COLORS[categoryId as keyof typeof GAME_COLORS] || GAME_COLORS.memory;
}

// Fetch a specific game by ID
export async function fetchGame(gameId: string): Promise<Game | null> {
  try {
    // First check if it's in our predefined games
    const predefinedGame = getGameById(gameId);
    if (predefinedGame) {
      // Convert predefined game to our Game interface
      return {
        id: predefinedGame.id,
        name: predefinedGame.name,
        description: predefinedGame.description,
        categoryId: predefinedGame.categoryId,
        component: predefinedGame.id, // Component name is same as ID for predefined games
        difficulty: predefinedGame.difficulty as 'easy' | 'medium' | 'hard',
        createdAt: null,
        updatedAt: null
      };
    }
    
    // If not predefined, check the database
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (gameSnap.exists()) {
      // Serialize the data to handle any Firestore timestamps
      const gameData = serializeFirestoreDataLocal(gameSnap.data());
      
      return {
        id: gameSnap.id,
        ...gameData
      } as Game;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching game:', error);
    throw error;
  }
}

// Fetch all games
export async function fetchGames(): Promise<Game[]> {
  try {
    // Start with predefined games
    const predefinedGames = GAMES_METADATA.map(game => ({
      id: game.id,
      name: game.name,
      description: game.description,
      categoryId: game.categoryId,
      component: game.id, // Component name is same as ID for predefined games
      difficulty: game.difficulty as 'easy' | 'medium' | 'hard',
      createdAt: null,
      updatedAt: null
    }));
    
    // Then get custom games from the database
    const gamesRef = collection(db, 'games');
    const gamesSnap = await getDocs(gamesRef);
    
    // Serialize the data from Firestore to handle timestamps
    const customGames = gamesSnap.docs.map(doc => ({
      id: doc.id,
      ...serializeFirestoreDataLocal(doc.data())
    })) as Game[];
    
    // Combine predefined and custom games
    return [...predefinedGames, ...customGames];
  } catch (error) {
    console.error('Error fetching games:', error);
    throw error;
  }
}

// Update an existing game
export async function updateGame(gameId: string, gameData: Partial<Omit<Game, 'id' | 'createdAt' | 'updatedAt'>>) {
  try {
    // Check if it's a predefined game
    const isPredefined = GAMES_METADATA.some(game => game.id === gameId);
    if (isPredefined) {
      throw new Error("Cannot update predefined games");
    }
    
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
      ...gameData,
      updatedAt: serverTimestamp()
    });
    
    return { id: gameId, ...gameData };
  } catch (error) {
    console.error('Error updating game:', error);
    throw error;
  }
}

// Delete a game
export async function deleteGame(gameId: string) {
  try {
    // Check if it's a predefined game
    const isPredefined = GAMES_METADATA.some(game => game.id === gameId);
    if (isPredefined) {
      throw new Error("Cannot delete predefined games");
    }
    
    const gameRef = doc(db, 'games', gameId);
    await deleteDoc(gameRef);
    
    // Also clean up any assignments for this game
    const assignmentsRef = collection(db, 'gameAssignments');
    const q = query(assignmentsRef, where('gameId', '==', gameId));
    const assignmentsSnap = await getDocs(q);
    
    const deletePromises = assignmentsSnap.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    return { id: gameId };
  } catch (error) {
    console.error('Error deleting game:', error);
    throw error;
  }
}

// Enrich game with category name and other metadata
export async function enrichGame(game: Game): Promise<GameWithMetadata> {
  try {
    // First check predefined games
    const predefinedGame = getGameById(game.id);
    if (predefinedGame) {
      return {
        ...game,
        categoryName: predefinedGame.categoryId 
      };
    }
    
    return {
      ...game,
      categoryName: game.categoryId
    };
  } catch (error) {
    console.error('Error enriching game:', error);
    return game;
  }
}

// Enrich multiple games with metadata
export async function enrichGames(games: Game[]): Promise<GameWithMetadata[]> {
  const enrichedGames = await Promise.all(games.map(game => enrichGame(game)));
  return enrichedGames;
}

// Assign a game to a college
export async function assignGameToCollege(gameId: string, collegeId: string, assignedBy: string = 'admin') {
  try {
    // Create a timestamp as ISO string for consistency
    const now = new Date().toISOString();
    
    // First check if it's a predefined game from GAMES_METADATA
    const isPredefinedGame = GAMES_METADATA.some(game => game.id === gameId);
    
    // Only check Firestore if it's not a predefined game
    if (!isPredefinedGame) {
      // Check if the game exists in Firestore
      const gameRef = doc(db, 'games', gameId);
      const gameDoc = await getDoc(gameRef);
      
      if (!gameDoc.exists()) {
        console.error("Game doesn't exist:", gameId);
        return null;
      }
    }
    
    // Check if the college exists
    const collegeRef = doc(db, 'colleges', collegeId);
    const collegeDoc = await getDoc(collegeRef);
    
    if (!collegeDoc.exists()) {
      console.error("College doesn't exist:", collegeId);
      return null;
    }
    
    // Get existing college data
    const collegeData = serializeFirestoreDataLocal(collegeDoc.data());
    
    // Get or create gamesAssigned array
    const gamesAssigned = collegeData.gamesAssigned || [];
    
    // Check if the game is already assigned
    const isAlreadyAssigned = gamesAssigned.some((assignment: any) => 
      assignment.gameId === gameId || assignment.id === gameId
    );
    
    if (isAlreadyAssigned) {
      console.log("Game is already assigned to this college");
      return null;
    }
    
    // Create the new assignment object with the timestamp as ISO string
    const newAssignment = {
      id: gameId,      // For backward compatibility 
      gameId: gameId,  // Explicitly set gameId for clarity
      assignedBy,
      assignedAt: now  // Using ISO string instead of Firestore timestamp
    };
    
    // Update the college document with the new assignment
    await updateDoc(collegeRef, {
      gamesAssigned: [...gamesAssigned, newAssignment]
    });
    
    console.log(`Game ${gameId} assigned to college ${collegeId}`);
    
    return newAssignment;
  } catch (error) {
    console.error('Error assigning game to college:', error);
    throw error;
  }
}

// Remove a game assignment
export async function removeGameAssignment(collegeId: string, gameId: string) {
  try {
    // Get the college document
    const collegeRef = doc(db, 'colleges', collegeId);
    const collegeDoc = await getDoc(collegeRef);
    
    if (!collegeDoc.exists()) {
      throw new Error('College not found');
    }
    
    const collegeData = serializeFirestoreDataLocal(collegeDoc.data());
    
    // Filter out the assignment to remove
    const gamesAssigned = collegeData.gamesAssigned || [];
    const updatedAssignments = gamesAssigned.filter((assignment: any) => assignment.gameId !== gameId);
    
    // Update the college document
    await updateDoc(collegeRef, {
      gamesAssigned: updatedAssignments
    });
    
    return { id: gameId };
  } catch (error) {
    console.error('Error removing game assignment:', error);
    throw error;
  }
}

// Get all game assignments (across all colleges)
export async function getAllGameAssignments(): Promise<GameAssignment[]> {
  try {
    const collegesRef = collection(db, 'colleges');
    const collegesSnap = await getDocs(collegesRef);
    
    let allAssignments: GameAssignment[] = [];
    
    // Iterate through each college to collect assignments
    for (const collegeDoc of collegesSnap.docs) {
      const collegeData = collegeDoc.data();
      const collegeId = collegeDoc.id;
      const gamesAssigned = collegeData.gamesAssigned || [];
      
      // Add college ID to each assignment for reference
      const collegeAssignments = gamesAssigned.map((assignment: any) => ({
        ...assignment,
        collegeId
      }));
      
      allAssignments = [...allAssignments, ...collegeAssignments];
    }
    
    return allAssignments;
  } catch (error) {
    console.error('Error fetching all game assignments:', error);
    throw error;
  }
}

// Get game assignments for a specific college
export async function getCollegeGameAssignments(collegeId: string): Promise<GameAssignment[]> {
  try {
    console.log("Getting assignments for college:", collegeId);
    
    // First find if collegeId is from a user document (admin) or actual college
    const collegeRef = doc(db, 'colleges', collegeId);
    let collegeDoc = await getDoc(collegeRef);
    
    // If not found as direct college document, check if this is an admin user ID
    if (!collegeDoc.exists()) {
      console.log("College document not found by direct ID, checking if this is an admin user ID");
      
      // Get the admin user document
      const userRef = doc(db, 'users', collegeId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // If this is a college admin, get their actual college ID
        if (userData.role === 'college' && userData.college) {
          // Look up the actual college document
          const actualCollegeId = userData.college;
          console.log("Found actual college ID from admin user:", actualCollegeId);
          
          // Get the college document by the actual ID
          const actualCollegeRef = doc(db, 'colleges', actualCollegeId);
          collegeDoc = await getDoc(actualCollegeRef);
          
          if (collegeDoc.exists()) {
            console.log("Found college document from admin's college ID");
          } else {
            // Try to find the college document based on the college field value
            console.log("College document not found by ID from admin, searching by college field");
            const collegesRef = collection(db, 'colleges');
            const q = query(collegesRef, where('college', '==', actualCollegeId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              collegeDoc = querySnapshot.docs[0];
              console.log("Found college document by field value:", collegeDoc.id);
            }
          }
        }
      }
      
      // If still not found, search for colleges by college field value
      if (!collegeDoc || !collegeDoc.exists()) {
        console.log("College document not found by admin lookup, searching by college field");
        const collegesRef = collection(db, 'colleges');
        const q = query(collegesRef, where('college', '==', collegeId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.warn("No college document found for college ID:", collegeId);
          return [];
        }
        
        // Use the first matching document (there should only be one)
        collegeDoc = querySnapshot.docs[0];
        console.log("Found college document by field value:", collegeDoc.id);
      }
    }
    
    if (!collegeDoc || !collegeDoc.exists()) {
      console.warn("Could not find college document after all attempts");
      return [];
    }
    
    // Get the college data and serialize it to ensure it's safe for client components
    const collegeData = serializeFirestoreDataLocal(collegeDoc.data());
    console.log("College data:", collegeData);
    
    // Get the gamesAssigned array or default to empty array
    const gamesAssigned = collegeData.gamesAssigned || [];
    console.log("Serialized gamesAssigned array:", gamesAssigned);
    
    // Now that the data is serialized, we can simply map it to our expected structure
    return gamesAssigned.map((assignment: any) => {
      // Ensure both id and gameId are set correctly
      const gameId = assignment.gameId || assignment.id;
      
      return {
        id: gameId,
        gameId: gameId,
        assignedBy: assignment.assignedBy || 'admin',
        assignedAt: assignment.assignedAt || new Date().toISOString(),
        collegeId: collegeDoc.id // Always use the actual college document ID
      };
    });
  } catch (error) {
    console.error('Error fetching college game assignments:', error);
    throw error;
  }
}

// Update or create game stats for a user
export async function updateGameStats(gameId: string, userId: string, score: number, timeTaken: number) {
  try {
    // Get student data to retrieve collegeId and name
    const studentDoc = await getDoc(doc(db, 'students', userId));
    
    // Default values in case student data is incomplete
    let collegeId = null;
    let studentName = 'Unknown Student';
    
    if (studentDoc.exists()) {
      const studentData = studentDoc.data();
      // Add null check for collegeId
      collegeId = studentData.collegeId || null;
      studentName = studentData.name || 'Unknown Student';
      
      // If collegeId is still null, try to find it from users collection
      if (!collegeId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Check if user has college field
            collegeId = userData.college || null;
          }
        } catch (userError) {
          console.error('Error fetching user data:', userError);
          // Continue with null collegeId
        }
      }
    } else {
      console.warn(`Student document not found for userId: ${userId}`);
      // Try to get data from users collection as fallback
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          collegeId = userData.college || null;
          studentName = userData.name || userData.email || 'Unknown Student';
        }
      } catch (userError) {
        console.error('Error fetching user data:', userError);
        // Continue with default values
      }
    }
    
    const statsRef = collection(db, 'gameStats');
    const q = query(
      statsRef,
      where('gameId', '==', gameId),
      where('userId', '==', userId)
    );
    
    const statsSnap = await getDocs(q);
    
    // Get the maximum possible score for this game
    const maxScore = getGameMaxScore(gameId);
    
    // Calculate the normalized score (1-100)
    const normalizedScore = normalizeScore(score, maxScore);
    
    if (statsSnap.empty) {
      // Create new stats
      const newStatsRef = await addDoc(statsRef, {
        gameId,
        userId,
        collegeId, // This might be null but that's better than undefined
        studentName,
        bestScore: score,
        normalizedBestScore: normalizedScore,
        lastScore: score,
        normalizedLastScore: normalizedScore,
        plays: 1,
        lastPlayed: serverTimestamp(),
        timeTaken
      });
      
      return {
        id: newStatsRef.id,
        gameId,
        userId,
        collegeId,
        studentName,
        bestScore: score,
        normalizedBestScore: normalizedScore,
        lastScore: score,
        normalizedLastScore: normalizedScore,
        plays: 1,
        lastPlayed: new Date(),
        timeTaken
      };
    } else {
      // Update existing stats
      const statDoc = statsSnap.docs[0];
      const existingStats = serializeFirestoreDataLocal(statDoc.data()) as GameStats;
      
      // Determine if this is a new best score
      const isBestScore = score > (existingStats.bestScore || 0);
      
      // Only include collegeId in update if it's not null
      const updatedStats: any = {
        studentName,
        bestScore: isBestScore ? score : existingStats.bestScore,
        normalizedBestScore: isBestScore ? normalizedScore : existingStats.normalizedBestScore,
        lastScore: score,
        normalizedLastScore: normalizedScore,
        plays: (existingStats.plays || 0) + 1,
        lastPlayed: serverTimestamp(),
        timeTaken
      };
      
      // Only add collegeId if it's not null
      if (collegeId !== null) {
        updatedStats.collegeId = collegeId;
      }
      
      await updateDoc(statDoc.ref, updatedStats);
      
      return {
        id: statDoc.id,
        gameId,
        userId,
        collegeId, // Might be null
        studentName,
        ...updatedStats,
        lastPlayed: new Date()
      };
    }
  } catch (error) {
    console.error('Error updating game stats:', error);
    throw error;
  }
}

// Get game stats for a user
export async function getUserGameStats(userId: string): Promise<GameStats[]> {
  try {
    const statsRef = collection(db, 'gameStats');
    const q = query(statsRef, where('userId', '==', userId));
    const statsSnap = await getDocs(q);
    
    return statsSnap.docs.map(doc => ({
      id: doc.id,
      ...serializeFirestoreDataLocal(doc.data())
    })) as GameStats[];
  } catch (error) {
    console.error('Error fetching user game stats:', error);
    throw error;
  }
}

// Get stats for a specific game and user
export async function getGameStats(gameId: string, userId: string): Promise<GameStats | null> {
  try {
    const statsRef = collection(db, 'gameStats');
    const q = query(
      statsRef,
      where('gameId', '==', gameId),
      where('userId', '==', userId)
    );
    
    const statsSnap = await getDocs(q);
    
    if (statsSnap.empty) {
      return null;
    }
    
    const statDoc = statsSnap.docs[0];
    return {
      id: statDoc.id,
      ...serializeFirestoreDataLocal(statDoc.data())
    } as GameStats;
  } catch (error) {
    console.error('Error fetching game stats:', error);
    throw error;
  }
}

// Get top performers for a game
export async function getGameTopPerformers(gameId: string, limit = 10): Promise<GameStats[]> {
  try {
    const statsRef = collection(db, 'gameStats');
    const q = query(
      statsRef,
      where('gameId', '==', gameId),
      orderBy('bestScore', 'desc'),
      limit(limit)
    );
    
    const statsSnap = await getDocs(q);
    
    return statsSnap.docs.map(doc => ({
      id: doc.id,
      ...serializeFirestoreDataLocal(doc.data())
    })) as GameStats[];
  } catch (error) {
    console.error('Error fetching top performers:', error);
    throw error;
  }
} 