export const APP_NAME = "Queue Up";
export const APP_TAGLINE = "The Valorant scheduler.";

export const SQUAD_SIZE = 6;
export const STACK_SIZE = 5;

export interface FairnessWeights {
  monthlyParticipation: number;
  playRateWhenAvailable: number;
  upcomingOpportunities: number;
  recentSitOuts: number;
}

export const FAIRNESS_WEIGHTS: FairnessWeights = {
  monthlyParticipation: 0.4,
  playRateWhenAvailable: 0.25,
  upcomingOpportunities: 0.25,
  recentSitOuts: 0.1,
};

export const DEFAULT_TIME_ZONE = "America/Los_Angeles";

export const TIME_ZONE_OPTIONS: readonly string[] = ["America/Los_Angeles", "America/Denver", "America/New_York"];
