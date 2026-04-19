import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { itemId, borrowerId } = await req.json();
    
    await prisma.$transaction([
      prisma.borrowRecord.updateMany({
        where: { itemId, returnedAt: null },
        data: { returnedAt: new Date() }
      }),
      prisma.libraryItem.update({
        where: { id: itemId },
        data: { status: 'BORROWED' }
      }),
      prisma.borrowRecord.create({
        data: {
          itemId,
          borrowerId
        }
      })
    ]);
  
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to borrow' }, { status: 500 });
  }
}
