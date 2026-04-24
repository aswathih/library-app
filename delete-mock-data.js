const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("Finding mock users...");
  const users = await prisma.user.findMany({
    where: { name: { in: ['Aswathi H', 'Ranju Mamachan'] } }
  });
  const userIds = users.map(u => u.id);

  if (userIds.length === 0) {
    console.log("No mock users found in database!");
    return;
  }

  console.log(`Found ${userIds.length} mock users. Dropping their records...`);

  // Drop their borrow history to clear constraints
  await prisma.borrowRecord.deleteMany({
    where: {
      OR: [
        { borrowerId: { in: userIds } },
        { item: { ownerId: { in: userIds } } }
      ]
    }
  });

  // Drop all of their books/items from the library
  await prisma.libraryItem.deleteMany({
    where: { ownerId: { in: userIds } }
  });

  // Finally safely drop the user profiles themselves
  await prisma.user.deleteMany({
    where: { id: { in: userIds } }
  });

  console.log("Successfully wiped all mock database entries!");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
