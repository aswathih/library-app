import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { userId, subscription } = await req.json();
    
    if (!userId || !subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Missing logic' }, { status: 400 });
    }

    // Map the unique subscription object from the browser explicitly into Postgres keys
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to register subscription", err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
