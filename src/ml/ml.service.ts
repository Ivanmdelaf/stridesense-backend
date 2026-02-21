import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs';
import type { RiskLevel } from '../risk/risk.service';

export interface MlFeatures {
  /** Number of training sessions in the last 7 days */
  sessionsPerWeek: number;
  /** Average session duration in minutes (last 7 days) */
  avgDurationMinutes: number;
  /** Unique sports practiced in the last 14 days (1–5) */
  uniqueSports: number;
  /** Maximum consecutive days with at least one session */
  maxConsecutiveDays: number;
  /** This week's total minutes / last week's total minutes (load-spike indicator) */
  loadRatio: number;
}

export interface MlPrediction {
  score: number;
  level: RiskLevel;
}

/**
 * Injury-risk neural network: 5 inputs → 2 hidden (ReLU) → 1 output (sigmoid)
 *
 * Inputs (all normalised to [0, 1]):
 *   x0 = sessionsPerWeek    / 7
 *   x1 = avgDurationMinutes / 120
 *   x2 = uniqueSports       / 5    (more variety → lower risk, negative weights)
 *   x3 = maxConsecutiveDays / 7
 *   x4 = min(loadRatio, 3)  / 3    (sudden load spike, capped at 3×)
 *
 * Hidden neurons (injury-science domain-knowledge weights):
 *   H0 "overload detector"  – frequency, duration, consecutive days, load spike
 *   H1 "monotony detector"  – consecutive days and lack of sport variety
 *
 * Output thresholds (sigmoid → RiskLevel):
 *   ≥ 0.60 → high   ≥ 0.35 → medium   < 0.35 → low
 */
@Injectable()
export class MlService implements OnModuleInit {
  private readonly logger = new Logger(MlService.name);
  private model: tf.Sequential;

  async onModuleInit(): Promise<void> {
    this.model = this.buildModel();
    this.logger.log('Injury-risk model initialised (5-feature session-based)');
  }

  private buildModel(): tf.Sequential {
    const model = tf.sequential();

    const hidden = tf.layers.dense({
      units: 2,
      inputShape: [5],
      activation: 'relu',
      name: 'hidden',
    });

    const output = tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
      name: 'output',
    });

    model.add(hidden);
    model.add(output);

    // Hidden kernel shape [5, 2]  (rows = features, cols = neurons)
    //                                H0      H1
    hidden.setWeights([
      tf.tensor2d(
        [
           0.8,  0.5,  // sessionsPerWeek    – high freq  → overload & monotony
           0.7,  0.2,  // avgDurationMinutes – long sessions → overload
          -0.3, -0.8,  // uniqueSports       – more variety → LESS risk (negative)
           0.6,  0.7,  // maxConsecutiveDays – no rest    → both risk types
           0.7,  0.3,  // loadRatio          – sudden spike → overload
        ],
        [5, 2],
      ),
      tf.tensor1d([-0.7, -0.4]),
    ]);

    // Output kernel [2, 1]
    output.setWeights([
      tf.tensor2d([[1.2], [0.8]], [2, 1]),
      tf.tensor1d([-0.8]),
    ]);

    return model;
  }

  predict(features: MlFeatures): MlPrediction {
    const { sessionsPerWeek, avgDurationMinutes, uniqueSports, maxConsecutiveDays, loadRatio } =
      features;

    // Normalise to [0, 1]
    const inputData: [number, number, number, number, number] = [
      Math.min(sessionsPerWeek / 7, 1),
      Math.min(avgDurationMinutes / 120, 1),
      Math.min(uniqueSports / 5, 1),
      Math.min(maxConsecutiveDays / 7, 1),
      Math.min(loadRatio / 3, 1),
    ];

    const input = tf.tensor2d([inputData], [1, 5]);
    const rawScore: number = tf.tidy(() => {
      const out = this.model.predict(input) as tf.Tensor;
      return out.dataSync()[0];
    });
    input.dispose();

    const score = Math.round(rawScore * 100);
    return { score, level: this.scoreToLevel(rawScore) };
  }

  private scoreToLevel(sigmoidOutput: number): RiskLevel {
    if (sigmoidOutput >= 0.6) return 'high';
    if (sigmoidOutput >= 0.35) return 'medium';
    return 'low';
  }
}
