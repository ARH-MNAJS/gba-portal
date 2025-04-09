// This file is a compatibility layer to ensure old imports continue to work
// It simply re-exports the Firebase configuration from lib/firebase.ts

import { app, auth, db, storage } from '@/lib/firebase';

export { app, auth, db, storage }; 