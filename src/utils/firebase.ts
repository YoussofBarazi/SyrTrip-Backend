import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { prisma } from './prisma.js'; // Make sure to import prisma for the helper!

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production: Read from Vercel Environment Variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Local Development: Read from file
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
}