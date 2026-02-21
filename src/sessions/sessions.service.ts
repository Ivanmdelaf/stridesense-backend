import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async create(userId: string, dto: CreateSessionDto) {
    return this.prisma.session.create({
      data: { ...dto, date: new Date(dto.date), userId },
    });
  }

  async update(id: string, userId: string, dto: UpdateSessionDto) {
    const session = await this.prisma.session.findFirst({
      where: { id, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return this.prisma.session.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date ? { date: new Date(dto.date) } : {}),
      },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    await this.prisma.session.delete({ where: { id } });
  }
}
