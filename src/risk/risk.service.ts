import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MlService, MlPrediction } from '../ml/ml.service';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskFactor {
  id: string;
  label: string;
  score: number;
  level: RiskLevel;
}

export interface RiskSummary {
  overallScore: number;
  overallLevel: RiskLevel;
  factors: RiskFactor[];
  mlPrediction: MlPrediction;
  generatedAt: string;
}

type SessionRow = {
  date: Date;
  durationMinutes: number;
  sport: string;
};

@Injectable()
export class RiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ml: MlService,
  ) {}

  async getSummary(userId: string): Promise<RiskSummary> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true, durationMinutes: true, sport: true },
    });

    const factors = this.computeFactors(sessions);
    const overallScore = this.computeOverallScore(factors);

    // factors order is guaranteed: [0]=frequency, [1]=load, [2]=variety, [3]=rest
    const mlPrediction = this.ml.predict(
      factors[0].score,
      factors[1].score,
      factors[2].score,
      factors[3].score,
    );

    return {
      overallScore,
      overallLevel: this.scoreToLevel(overallScore),
      factors,
      mlPrediction,
      generatedAt: new Date().toISOString(),
    };
  }

  private computeFactors(sessions: SessionRow[]): RiskFactor[] {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(
      now.getTime() - 14 * 24 * 60 * 60 * 1000,
    );

    const recentSessions = sessions.filter((s) => s.date >= sevenDaysAgo);
    const twoWeekSessions = sessions.filter((s) => s.date >= fourteenDaysAgo);

    return [
      this.trainingFrequency(recentSessions),
      this.trainingLoad(recentSessions),
      this.trainingVariety(twoWeekSessions),
      this.restPattern(sessions),
    ];
  }

  private trainingFrequency(recentSessions: SessionRow[]): RiskFactor {
    const count = recentSessions.length;
    let score: number;
    let label: string;

    if (count <= 1) {
      score = 80;
      label = 'Insufficient training frequency';
    } else if (count <= 4) {
      score = 20;
      label = 'Good training frequency';
    } else {
      score = 55;
      label = 'Possible overtraining frequency';
    }

    return {
      id: 'training-frequency',
      label,
      score,
      level: this.scoreToLevel(score),
    };
  }

  private trainingLoad(recentSessions: SessionRow[]): RiskFactor {
    if (recentSessions.length === 0) {
      return {
        id: 'training-load',
        label: 'No recent training data',
        score: 70,
        level: 'high',
      };
    }

    const avgDuration =
      recentSessions.reduce((sum, s) => sum + s.durationMinutes, 0) /
      recentSessions.length;

    let score: number;
    let label: string;

    if (avgDuration < 20) {
      score = 70;
      label = 'Low training volume';
    } else if (avgDuration <= 90) {
      score = 15;
      label = 'Balanced training volume';
    } else {
      score = 50;
      label = 'High volume strain';
    }

    return {
      id: 'training-load',
      label,
      score,
      level: this.scoreToLevel(score),
    };
  }

  private trainingVariety(twoWeekSessions: SessionRow[]): RiskFactor {
    const uniqueSports = new Set(twoWeekSessions.map((s) => s.sport));
    const count = uniqueSports.size;

    let score: number;
    let label: string;

    if (count === 0) {
      score = 45;
      label = 'No training variety data';
    } else if (count === 1) {
      score = 45;
      label = 'Limited cross-training';
    } else {
      score = 10;
      label = 'Good training variety';
    }

    return {
      id: 'training-variety',
      label,
      score,
      level: this.scoreToLevel(score),
    };
  }

  private restPattern(sessions: SessionRow[]): RiskFactor {
    if (sessions.length === 0) {
      return {
        id: 'rest-pattern',
        label: 'No training data for rest analysis',
        score: 40,
        level: 'medium',
      };
    }

    const dates = sessions
      .map((s) => s.date.getTime())
      .sort((a, b) => a - b);

    const uniqueDates = [...new Set(dates)];
    let maxConsecutive = 1;
    let currentStreak = 1;
    const oneDay = 24 * 60 * 60 * 1000;

    for (let i = 1; i < uniqueDates.length; i++) {
      if (uniqueDates[i] - uniqueDates[i - 1] <= oneDay) {
        currentStreak++;
        maxConsecutive = Math.max(maxConsecutive, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    let score: number;
    let label: string;

    if (maxConsecutive >= 5) {
      score = 75;
      label = 'Insufficient rest between sessions';
    } else if (maxConsecutive >= 3) {
      score = 40;
      label = 'Moderate rest pattern';
    } else {
      score = 10;
      label = 'Good rest pattern';
    }

    return {
      id: 'rest-pattern',
      label,
      score,
      level: this.scoreToLevel(score),
    };
  }

  private computeOverallScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0;
    return Math.round(
      factors.reduce((sum, f) => sum + f.score, 0) / factors.length,
    );
  }

  private scoreToLevel(score: number): RiskLevel {
    if (score >= 60) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  }
}
