import { Module } from '@nestjs/common';
import { MlModule } from '../ml/ml.module';
import { RiskService } from './risk.service';
import { RiskController } from './risk.controller';

@Module({
  imports: [MlModule],
  controllers: [RiskController],
  providers: [RiskService],
})
export class RiskModule {}
