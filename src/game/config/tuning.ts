export interface Tuning {
  rhythmBpm: number;
  thrust: number;
  rocketMass: number;
  partnerMass: number;
  torsoWidth: number;
  torsoDepth: number;
  leaderTurnSpeed: number;
  leaderTravelFacingWeight: number;
  leaderTravelBlendStartSpeed: number;
  leaderTravelBlendFullSpeed: number;
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
  rhythmBpm: 120,
  thrust: 1185.6,
  rocketMass: 1.2,
  partnerMass: 1,
  torsoWidth: 50,
  torsoDepth: 16,
  leaderTurnSpeed: 4,
  leaderTravelFacingWeight: 0.3,
  leaderTravelBlendStartSpeed: 20,
  leaderTravelBlendFullSpeed: 160,
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
