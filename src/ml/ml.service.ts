import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs';
import type { RiskLevel } from '../risk/risk.service';

export interface MlPrediction {
  score: number;
  level: RiskLevel;
}

@Injectable()
export class MlService implements OnModuleInit {
  private readonly logger = new Logger(MlService.name);
  private model: tf.Sequential;

  async onModuleInit(): Promise<void> {
    this.model = this.buildModel();
    this.logger.log('Injury risk model initialized');
  }

  private buildModel(): tf.Sequential {
    const model = tf.sequential();

    // Hidden layer: 4 inputs -> 2 neurons, ReLU
    // Neuron 0: frequency + load detector (primary injury risk drivers)
    // Neuron 1: rest + variety detector (secondary injury risk drivers)
    const hidden = tf.layers.dense({
      units: 2,
      inputShape: [4],
      activation: 'relu',
      name: 'hidden',
    });

    // Output layer: 2 neurons -> 1 probability [0,1], sigmoid
    const output = tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
      name: 'output',
    });

    model.add(hidden);
    model.add(output);

    // Layer 1 weights: kernel shape [4, 2], bias shape [2]
    // Rows = features: [frequency, load, variety, rest]
    // Cols = neurons: [neuron_0, neuron_1]
    hidden.setWeights([
      tf.tensor2d(
        [
          0.7, 0.4, // frequency weights
          0.8, 0.3, // load weights
          0.2, 0.5, // variety weights
          0.5, 0.7, // rest weights
        ],
        [4, 2],
      ),
      tf.tensor1d([-0.3, -0.3]),
    ]);

    // Layer 2 weights: kernel shape [2, 1], bias shape [1]
    output.setWeights([
      tf.tensor2d([[1.0], [0.8]], [2, 1]),
      tf.tensor1d([-0.9]),
    ]);

    return model;
  }

  predict(
    frequencyScore: number,
    loadScore: number,
    varietyScore: number,
    restScore: number,
  ): MlPrediction {
    // Normalize factor scores from [0,100] to [0,1]
    const inputData: [number, number, number, number] = [
      frequencyScore / 100,
      loadScore / 100,
      varietyScore / 100,
      restScore / 100,
    ];

    let rawScore: number;

    // tf.tidy() disposes all intermediate tensors automatically, preventing memory leaks
    const input = tf.tensor2d([inputData], [1, 4]);
    rawScore = tf.tidy(() => {
      const outputTensor = this.model.predict(input) as tf.Tensor;
      return outputTensor.dataSync()[0];
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
