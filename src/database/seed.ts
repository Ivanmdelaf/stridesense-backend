import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../auth/entities/user.entity';
import { Session } from '../sessions/entities/session.entity';
import { config } from 'dotenv';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'stridesense',
  entities: [User, Session],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('Database connected.');

  const userRepo = AppDataSource.getRepository(User);
  const sessionRepo = AppDataSource.getRepository(Session);

  // Clean existing data
  await sessionRepo.delete({});
  await userRepo.delete({});

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const athlete = userRepo.create({
    name: 'Carlos Martinez',
    email: 'athlete@stridesense.com',
    password: hashedPassword,
    role: 'athlete',
    avatarUrl: null,
  });

  const coach = userRepo.create({
    name: 'Laura Garcia',
    email: 'coach@stridesense.com',
    password: hashedPassword,
    role: 'coach',
    avatarUrl: null,
  });

  await userRepo.save([athlete, coach]);
  console.log('Users created.');

  // Create sessions for athlete (last 3 weeks)
  const sports = ['running', 'cycling', 'swimming', 'strength', 'other'] as const;
  const now = new Date();
  const sessions: Partial<Session>[] = [];

  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(Math.random() * 21); // 0-20 days ago
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().split('T')[0];

    const sport = sports[Math.floor(Math.random() * sports.length)];
    const durationMinutes = 20 + Math.floor(Math.random() * 80); // 20-100 min

    let distanceKm: number | null = null;
    if (sport === 'running') {
      distanceKm = parseFloat((3 + Math.random() * 12).toFixed(1));
    } else if (sport === 'cycling') {
      distanceKm = parseFloat((10 + Math.random() * 40).toFixed(1));
    } else if (sport === 'swimming') {
      distanceKm = parseFloat((0.5 + Math.random() * 2.5).toFixed(1));
    }

    const notes = [
      'Felt great, good pace.',
      'Tough session, pushed hard.',
      'Easy recovery session.',
      'Intervals training.',
      'Long steady effort.',
      null,
    ];

    sessions.push({
      date: dateStr,
      durationMinutes,
      sport,
      distanceKm,
      notes: notes[Math.floor(Math.random() * notes.length)],
      userId: athlete.id,
    });
  }

  await sessionRepo.save(sessions.map((s) => sessionRepo.create(s)));
  console.log(`${sessions.length} sessions created for athlete.`);

  await AppDataSource.destroy();
  console.log('Seed completed successfully.');
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
