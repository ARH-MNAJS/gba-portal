import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    // Basic validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }
    
    try {
      // Check if user exists in Firebase Auth
      const userRecord = await adminAuth.getUserByEmail(email.toLowerCase());
      
      if (!userRecord) {
        // Don't reveal whether user exists or not for security
        console.log(`Password reset requested for non-existent email: ${email}`);
        
        // Pretend we sent a reset link anyway
        return NextResponse.json({ success: true });
      }
      
      // Generate password reset link
      const resetLink = await adminAuth.generatePasswordResetLink(email.toLowerCase());
      
      // In a production environment, you would send this link via email
      console.log(`Password reset link for ${email}: ${resetLink}`);
      
      // For now, we'll just return success
      // In a real application, you would send the reset link via email
      return NextResponse.json({ success: true });
    } catch (error: any) {
      // Don't reveal whether user exists or not for security
      console.error(`Error processing password reset for ${email}:`, error);
      
      // Return success anyway to prevent user enumeration
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error('Error in password reset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 