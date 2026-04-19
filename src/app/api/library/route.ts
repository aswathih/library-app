import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await prisma.libraryItem.findMany({
      include: {
        book: true,
        owner: true,
        borrowRecords: {
          where: { returnedAt: null },
          include: { borrower: true }
        }
      }
  });
  return NextResponse.json(items);
  } catch (err) {
    console.error("DEBUG LIBRARY ERROR:", err);
    return NextResponse.json({ error: 'Failed to load library' }, { status: 500 });
  }
}
