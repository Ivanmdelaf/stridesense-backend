import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  async findAll(userId: string): Promise<Session[]> {
    return this.sessionRepo.find({
      where: { userId },
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Session> {
    const session = await this.sessionRepo.findOne({
      where: { id, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async create(userId: string, dto: CreateSessionDto): Promise<Session> {
    const session = this.sessionRepo.create({ ...dto, userId });
    return this.sessionRepo.save(session);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.sessionRepo.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException('Session not found');
    }
  }
}
