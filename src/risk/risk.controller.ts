import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RiskService } from './risk.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Risk')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: { id: string }) {
    return this.riskService.getSummary(user.id);
  }
}
