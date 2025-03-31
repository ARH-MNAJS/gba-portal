# Firebase Setup Guide

This guide will help you set up Firebase for the GBA Portal application.

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the steps to create a new project
3. Once your project is created, you'll be taken to the project dashboard

## 2. Set Up Firebase Authentication

1. In your Firebase project dashboard, click on "Authentication" in the left sidebar
2. Click "Get started"
3. Enable the "Email/Password" sign-in method
4. Save the changes

## 3. Set Up Firestore Database

1. In your Firebase project dashboard, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in production mode" when prompted
4. Choose a location for your database that's closest to your users
5. Once the database is created, navigate to the "Rules" tab
6. Copy the Firestore rules from the Firebase Setup page in your GBA Portal app
7. Paste the rules in the Rules editor and click "Publish"

## 4. Generate Firebase Configuration

1. In your Firebase project dashboard, click on the gear icon (⚙️) next to "Project Overview" and select "Project settings"
2. Scroll down to the "Your apps" section
3. Click on the Web icon (`</>`) to add a web app
4. Register your app with a nickname (e.g., "GBA Portal")
5. Copy the Firebase configuration object (it looks like this):
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 5. Generate Service Account Key

1. In your Firebase project dashboard, click on the gear icon (⚙️) and select "Project settings"
2. Go to the "Service accounts" tab
3. Click "Generate new private key" under the "Firebase Admin SDK" section
4. Save the JSON file securely - this will be used for server-side operations

## 6. Configure Environment Variables

1. Create a `.env.local` file in the root of your project (copy from `.env.local.example`)
2. Fill in the Firebase configuration variables from step 4:
```
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://YOUR_PROJECT_ID.firebaseio.com
```
3. For the service account key, stringify the JSON file you downloaded in step 5 and set it as:
```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

## 7. Initialize the Database

1. Start your application
2. Navigate to the Firebase Setup page (/api/db-setup)
3. Enter the setup key (default is "dev-setup-key" or what you set in SETUP_SECRET_KEY)
4. Click "Check Firebase" to initialize the database and create the admin user

## 8. Test the Setup

1. Try to log in with the default admin credentials:
   - Email: admin@example.com
   - Password: admin123
2. If the login is successful, your Firebase setup is complete!

## Firebase Collection Structure

The application uses the following collections:

- `users`: Contains user authentication information
- `admins`: Contains admin user profiles
- `students`: Contains student profiles
- `colleges`: Contains college profiles

## Troubleshooting

- If you encounter authentication errors, check that your Firebase configuration variables are correct
- If you encounter Firebase Admin SDK errors, verify that your service account key is valid and properly formatted
- If collections aren't being created, check the Firestore rules to ensure they allow the necessary operations