import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { itemId } = await req.json();
    
    // Set status to AVAILABLE and close off the active borrow record history
    await prisma.$transaction([
      prisma.borrowRecord.updateMany({
        where: { itemId, returnedAt: null },
        data: { returnedAt: new Date() }
      }),
      prisma.libraryItem.update({
        where: { id: itemId },
        data: { status: 'AVAILABLE' }
      })
    ]);
  
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to return book' }, { status: 500 });
  }
}
