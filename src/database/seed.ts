import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

async function seed() {
  console.log('Cleaning existing data...');
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const athlete = await prisma.user.create({
    data: {
      name: 'Carlos Martinez',
      email: 'athlete@stridesense.com',
      password: hashedPassword,
      role: 'athlete',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Laura Garcia',
      email: 'coach@stridesense.com',
      password: hashedPassword,
      role: 'coach',
    },
  });

  console.log('Creating sessions for athlete...');
  const sports = ['running', 'cycling', 'swimming', 'strength', 'other'] as const;
  const now = new Date();

  const sessionsData = Array.from({ length: 15 }, () => {
    const daysAgo = Math.floor(Math.random() * 21);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const sport = sports[Math.floor(Math.random() * sports.length)];
    const durationMinutes = 20 + Math.floor(Math.random() * 80);

    let distanceKm: number | null = null;
    let avgHeartRate: number | null = null;
    let cadenceSpm: number | null = null;

    if (sport === 'running') {
      distanceKm = parseFloat((3 + Math.random() * 12).toFixed(1));
      avgHeartRate = 130 + Math.floor(Math.random() * 50);
      cadenceSpm = 155 + Math.floor(Math.random() * 35);
    } else if (sport === 'cycling') {
      distanceKm = parseFloat((10 + Math.random() * 40).toFixed(1));
      avgHeartRate = 120 + Math.floor(Math.random() * 40);
      cadenceSpm = 70 + Math.floor(Math.random() * 30);
    } else if (sport === 'swimming') {
      distanceKm = parseFloat((0.5 + Math.random() * 2.5).toFixed(1));
      avgHeartRate = 125 + Math.floor(Math.random() * 45);
    } else if (sport === 'strength') {
      avgHeartRate = 110 + Math.floor(Math.random() * 40);
    }

    const noteOptions = [
      'Felt great, good pace.',
      'Tough session, pushed hard.',
      'Easy recovery session.',
      'Intervals training.',
      'Long steady effort.',
      null,
    ];

    return {
      date,
      durationMinutes,
      sport,
      distanceKm,
      avgHeartRate,
      cadenceSpm,
      notes: noteOptions[Math.floor(Math.random() * noteOptions.length)],
      userId: athlete.id,
    };
  });

  await prisma.session.createMany({ data: sessionsData });
  console.log(`${sessionsData.length} sessions created for athlete.`);

  await prisma.$disconnect();
  console.log('Seed completed successfully.');
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
