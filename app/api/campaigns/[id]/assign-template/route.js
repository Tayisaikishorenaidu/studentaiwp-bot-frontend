import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';

export async function POST(request, { params }) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { id } = params;
    const { day, templateId } = await request.json();

    if (!day || !templateId) {
      return NextResponse.json(
        { error: 'Day and templateId are required' },
        { status: 400 }
      );
    }

    // Get user data
    const userDoc = await db.collection('WhatsAppAutomation').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    if (!userData?.campaigns?.[id]) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (!userData?.templates?.[templateId]) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Update the campaign with the new template assignment
    await db.collection('WhatsAppAutomation').doc(userId).update({
      [`campaigns.${id}.dayTemplates.${day}`]: templateId,
      [`campaigns.${id}.updatedAt`]: Date.now()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Assign template error:', error);
    return NextResponse.json(
      { error: 'Failed to assign template' },
      { status: 500 }
    );
  }
} 