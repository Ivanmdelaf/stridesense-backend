import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../sessions/entities/session.entity';
import { RiskService } from './risk.service';
import { RiskController } from './risk.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Session])],
  controllers: [RiskController],
  providers: [RiskService],
})
export class RiskModule {}
