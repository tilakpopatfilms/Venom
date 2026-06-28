/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

let app;
let db: any;
let auth: any;

try {
  app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true
  }, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(app);
} catch (error) {
  console.error("Failed to initialize Firebase", error);
}

export { app, db, auth };

// Connection test helper from skill guidelines
export async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}

// Automatically test connection on boot
testConnection();

// Define OperationType and handleFirestoreError for diagnosing rules issues (Mandatory per Skill guidelines)
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);

  // Suppress and ignore harmless idle stream/connection cancellations by Firestore
  if (
    errStr.includes('Disconnecting idle stream') ||
    errStr.includes('Timed out waiting for new targets') ||
    errStr.includes('CANCELLED') ||
    (error && typeof error === 'object' && 'code' in error && (error as any).code === 'cancelled')
  ) {
    console.warn('Firestore stream idle disconnect (safe auto-reconnect):', errStr);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
