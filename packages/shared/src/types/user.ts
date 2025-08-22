export enum UserTier {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export interface TierFeatures {
  maxPropertiesPerAnalysis: number;
  maxSavedAnalyses: number;
  advancedAnalytics: boolean;
  compComparisons: boolean;
  exportCapabilities: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  teamCollaboration: boolean;
  historicalDataAccess: boolean;
  marketTrends: boolean;
  dealAlerts: boolean;
}

export const TIER_FEATURES: Record<UserTier, TierFeatures> = {
  [UserTier.FREE]: {
    maxPropertiesPerAnalysis: 5,
    maxSavedAnalyses: 3,
    advancedAnalytics: false,
    compComparisons: false,
    exportCapabilities: false,
    apiAccess: false,
    prioritySupport: false,
    customBranding: false,
    teamCollaboration: false,
    historicalDataAccess: false,
    marketTrends: false,
    dealAlerts: false
  },
  [UserTier.BASIC]: {
    maxPropertiesPerAnalysis: 25,
    maxSavedAnalyses: 20,
    advancedAnalytics: true,
    compComparisons: true,
    exportCapabilities: true,
    apiAccess: false,
    prioritySupport: false,
    customBranding: false,
    teamCollaboration: false,
    historicalDataAccess: false,
    marketTrends: false,
    dealAlerts: false
  },
  [UserTier.PROFESSIONAL]: {
    maxPropertiesPerAnalysis: 100,
    maxSavedAnalyses: 100,
    advancedAnalytics: true,
    compComparisons: true,
    exportCapabilities: true,
    apiAccess: true,
    prioritySupport: true,
    customBranding: false,
    teamCollaboration: false,
    historicalDataAccess: true,
    marketTrends: true,
    dealAlerts: true
  },
  [UserTier.ENTERPRISE]: {
    maxPropertiesPerAnalysis: -1, // Unlimited
    maxSavedAnalyses: -1, // Unlimited
    advancedAnalytics: true,
    compComparisons: true,
    exportCapabilities: true,
    apiAccess: true,
    prioritySupport: true,
    customBranding: true,
    teamCollaboration: true,
    historicalDataAccess: true,
    marketTrends: true,
    dealAlerts: true
  }
};

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: UserTier;
  experienceLevel: string;
  createdAt: Date;
  lastLoginAt?: Date;
  usageStats?: {
    propertiesAnalyzed: number;
    savedAnalyses: number;
    exportsGenerated: number;
  };
}

export interface TierUpgrade {
  fromTier: UserTier;
  toTier: UserTier;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
}

