import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SportEnum {
  RUNNING = 'running',
  CYCLING = 'cycling',
  SWIMMING = 'swimming',
  STRENGTH = 'strength',
  OTHER = 'other',
}

export class CreateSessionDto {
  @ApiProperty({ example: '2026-02-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 45 })
  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @ApiProperty({ enum: SportEnum, example: 'running' })
  @IsEnum(SportEnum)
  sport: SportEnum;

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
