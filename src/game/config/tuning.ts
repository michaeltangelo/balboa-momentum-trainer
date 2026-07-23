export interface Tuning {
  thrust: number;
  rocketMass: number;
  rocketRadius: number;
  partnerMass: number;
  partnerRadius: number;
  restLength: number;
  slack: number;
  springStiffness: number;
  springDamping: number;
  generalDrag: number;
  targetStopRadius: number;
  targetSlowRadius: number;
  targetMaxSpeed: number;
  targetVelocityResponse: number;
  healthyExtension: number;
  overstretchFactor: number;
}

export const tuning: Tuning = {
  thrust: 1185.6,
  rocketMass: 1.2,
  rocketRadius: 22.1,
  partnerMass: 1,
  partnerRadius: 20.8,
  restLength: 67.6,
  slack: 7.8,
  springStiffness: 1.8,
  springDamping: 2.4,
  generalDrag: 0.32,
  targetStopRadius: 13,
  targetSlowRadius: 143,
  targetMaxSpeed: 325,
  targetVelocityResponse: 84.5,
  healthyExtension: 78,
  overstretchFactor: 0.029585798816568046,
};

export const WORLD_WIDTH = 390;
export const WORLD_HEIGHT = 780;
