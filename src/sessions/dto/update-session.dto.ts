import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SportEnum } from './create-session.dto';

export class UpdateSessionDto {
  @ApiPropertyOptional({ example: '2026-02-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ enum: SportEnum, example: 'running' })
  @IsOptional()
  @IsEnum(SportEnum)
  sport?: SportEnum;

  @ApiPropertyOptional({ example: 5.2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @ApiPropertyOptional({ example: 155 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  avgHeartRate?: number;

  @ApiPropertyOptional({ example: 170 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cadenceSpm?: number;

  @ApiPropertyOptional({ example: 'Easy morning run' })
  @IsOptional()
  @IsString()
  notes?: string;
}
