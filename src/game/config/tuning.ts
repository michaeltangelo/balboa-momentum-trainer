export interface Tuning {
  thrust: number;
  rocketMass: number;
  partnerMass: number;
  restLength: number;
  slack: number;
  springStiffness: number;
  springDamping: number;
  generalDrag: number;
  maxInputRadius: number;
  healthyExtension: number;
  overstretchFactor: number;
}

export const tuning: Tuning = {
  thrust: 760,
  rocketMass: 1,
  partnerMass: 4.5,
  restLength: 205,
  slack: 24,
  springStiffness: 5.2,
  springDamping: 2.1,
  generalDrag: 0.32,
  maxInputRadius: 82,
  healthyExtension: 85,
  overstretchFactor: 0.018,
};

export const WORLD_WIDTH = 390;
export const WORLD_HEIGHT = 780;
