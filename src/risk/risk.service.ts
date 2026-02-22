import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MlService, MlPrediction, MlFeatures } from '../ml/ml.service';

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

    if (sessions.length === 0) {
      return {
        overallScore: 0,
        overallLevel: 'low',
        factors: [],
        mlPrediction: { score: 0, level: 'low' },
        generatedAt: new Date().toISOString(),
      };
    }

    const factors = this.computeFactors(sessions);
    const overallScore = this.computeOverallScore(factors);

    const mlFeatures = this.extractMlFeatures(sessions);
    const mlPrediction = this.ml.predict(mlFeatures);

    return {
      overallScore,
      overallLevel: this.scoreToLevel(overallScore),
      factors,
      mlPrediction,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Extracts the 5 raw session metrics used directly by the TensorFlow model.
   * These reflect the athlete's actual training pattern, not pre-computed scores.
   */
  private extractMlFeatures(sessions: SessionRow[]): MlFeatures {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentSessions = sessions.filter((s) => s.date >= sevenDaysAgo);
    const prevWeekSessions = sessions.filter(
      (s) => s.date >= fourteenDaysAgo && s.date < sevenDaysAgo,
    );

    // Number of sessions in the last 7 days
    const sessionsPerWeek = recentSessions.length;

    // Average session duration in the last 7 days
    const avgDurationMinutes =
      recentSessions.length > 0
        ? recentSessions.reduce((sum, s) => sum + s.durationMinutes, 0) /
          recentSessions.length
        : 0;

    // Unique sports practised in the last 14 days
    const allRecent = [...recentSessions, ...prevWeekSessions];
    const uniqueSports = new Set(allRecent.map((s) => s.sport)).size;

    // Maximum consecutive training days (across all sessions)
    const maxConsecutiveDays = this.computeMaxConsecutive(sessions);

    // Acute:chronic load ratio — this week's minutes vs last week's minutes
    const thisWeekMinutes = recentSessions.reduce(
      (sum, s) => sum + s.durationMinutes,
      0,
    );
    const lastWeekMinutes = prevWeekSessions.reduce(
      (sum, s) => sum + s.durationMinutes,
      0,
    );
    // +1 avoids division by zero; ratio > 1 means load increased this week
    const loadRatio = thisWeekMinutes / (lastWeekMinutes + 1);

    return {
      sessionsPerWeek,
      avgDurationMinutes,
      uniqueSports,
      maxConsecutiveDays,
      loadRatio,
    };
  }

  /** Returns the longest streak of consecutive calendar days with at least one session. */
  private computeMaxConsecutive(sessions: SessionRow[]): number {
    if (sessions.length === 0) return 0;

    // Collect unique training days (milliseconds at midnight UTC)
    const dayMs = 24 * 60 * 60 * 1000;
    const uniqueDays = [
      ...new Set(
        sessions.map((s) => Math.floor(s.date.getTime() / dayMs) * dayMs),
      ),
    ].sort((a, b) => a - b);

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < uniqueDays.length; i++) {
      if (uniqueDays[i] - uniqueDays[i - 1] === dayMs) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return maxStreak;
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
      label = 'Frecuencia de entrenamiento insuficiente';
    } else if (count <= 4) {
      score = 20;
      label = 'Frecuencia de entrenamiento adecuada';
    } else {
      score = 55;
      label = 'Posible sobreentrenamiento por frecuencia';
    }

    return {
      id: 'training-frequency',
      label,
      score,
      level: this.scoreToLevel(score),
    };
  }

  private trainingLoad(recentSessions: SessionRow[]): RiskFactor {
    const avgDuration =
      recentSessions.reduce((sum, s) => sum + s.durationMinutes, 0) /
      recentSessions.length;

    let score: number;
    let label: string;

    if (avgDuration < 20) {
      score = 70;
      label = 'Volumen de entrenamiento bajo';
    } else if (avgDuration <= 90) {
      score = 15;
      label = 'Volumen de entrenamiento equilibrado';
    } else {
      score = 50;
      label = 'Volumen de entrenamiento elevado';
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

    if (count <= 1) {
      score = 45;
      label = 'Variedad de entrenamiento limitada';
    } else {
      score = 10;
      label = 'Buena variedad de entrenamiento';
    }

    return {
      id: 'training-variety',
      label,
      score,
      level: this.scoreToLevel(score),
    };
  }

  private restPattern(sessions: SessionRow[]): RiskFactor {
    const maxConsecutive = this.computeMaxConsecutive(sessions);

    let score: number;
    let label: string;

    if (maxConsecutive >= 5) {
      score = 75;
      label = 'Descanso insuficiente entre sesiones';
    } else if (maxConsecutive >= 3) {
      score = 40;
      label = 'Patrón de descanso moderado';
    } else {
      score = 10;
      label = 'Buen patrón de descanso';
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
