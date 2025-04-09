# Database Schema for GBA Portal

This document outlines the database schema for the GBA Portal, including collections and their fields.

## Collections

### assessments

Stores assessment configurations created by admins.

```
assessments/{assessmentId}: {
  name: string,                     // Name of the assessment
  startDate: ISO string,            // Start date and time of the assessment
  endDate: ISO string,              // End date and time of the assessment
  duration: number,                 // Total duration in minutes
  showReportAtEnd: boolean,         // Whether to show report to student after completion
  allowQuestionSwitch: boolean,     // Whether students can switch between games
  games: [                          // Array of games in this assessment
    {
      id: string,                   // Game ID
      name: string,                 // Game name
      duration: number              // Game duration in minutes
    }
  ],
  assignedTo: string[],             // Array of college IDs this assessment is assigned to
  createdBy: string,                // Admin user ID who created this assessment
  createdAt: timestamp              // When this assessment was created
}
```

### assessmentAttempts

Stores student attempts at assessments.

```
assessmentAttempts/{attemptId}: {
  id: string,                       // Unique ID (usually studentId_assessmentId)
  assessmentId: string,             // Reference to the assessment
  studentId: string,                // Student who took the assessment
  completedAt: timestamp,           // When the assessment was completed
  totalScore: number,               // Overall normalized score (1-100)
  games: [                          // Results for each game
    {
      gameId: string,               // Game ID
      score: number,                // Original game score
      normalizedScore: number,      // Normalized score (1-100)
      timeTaken: number             // Time taken in seconds
    }
  ]
}
```

### gameStats

Stores statistics for game plays. Schema updated to include college information for efficient reporting.

```
gameStats/{statId}: {
  id: string,                       // Auto-generated document ID
  gameId: string,                   // Reference to the game
  userId: string,                   // User who played the game
  collegeId: string,                // College ID for direct college-based reporting
  studentName: string,              // Student name for easier reporting
  bestScore: number,                // Best original score achieved
  normalizedBestScore: number,      // Best normalized score (1-100)
  lastScore: number,                // Most recent original score
  normalizedLastScore: number,      // Most recent normalized score (1-100)
  plays: number,                    // Number of times played
  lastPlayed: timestamp,            // When last played
  timeTaken: number                 // Time taken in seconds
}
```

## Normalized Scoring System

For consistency across all games, scores are normalized to a 1-100 scale using the following formula:

```
normalizedScore = ((originalScore - minPossibleScore) / (maxPossibleScore - minPossibleScore)) * 99 + 1
```

Where:
- `originalScore` is the score achieved in the game
- `minPossibleScore` is the minimum possible score (usually 0)
- `maxPossibleScore` is the maximum possible score (varies by game)

Game maximum scores:
- Switch: 1000
- GeoSudo: 1000
- Memory Match: 10
- Word Scramble: 10
- Math Quiz: 10

The normalized score ensures that all games report scores on the same 1-100 scale, making it easier to compare performance across different games.

## Required Indexes

For optimal performance with large datasets (10k+ students per college), the following indexes should be created:

```
// Collection: gameStats
// Fields: [collegeId, gameId] - For college game reports
// Fields: [collegeId, lastPlayed] - For time-based college reports
// Fields: [userId, gameId] - For student-specific game stats
// Fields: [gameId, normalizedBestScore] - For leaderboards
```

These indexes allow efficient querying for various reporting scenarios without hitting performance limitations. 