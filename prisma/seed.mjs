import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const aswathi = await prisma.user.create({
    data: { name: 'Aswathi H' },
  })
  const mithun = await prisma.user.create({
    data: { name: 'Mithun S' },
  })
  const ranju = await prisma.user.create({
    data: { name: 'Ranju Mamachan' },
  })
  console.log("Seeded default users:", { aswathi, mithun, ranju });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
