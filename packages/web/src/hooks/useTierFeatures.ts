import { useAuth } from '@/lib/auth-context';
import { UserTier, TIER_FEATURES, TierFeatures } from '@multi-analysis/shared/types/user';

export function useTierFeatures() {
  const { user } = useAuth();
  
  const currentTier = user?.subscriptionTier || UserTier.FREE;
  const features = TIER_FEATURES[currentTier];
  
  const canAccessFeature = (feature: keyof TierFeatures): boolean => {
    return features[feature] === true;
  };
  
  const getLimit = (limitType: 'maxPropertiesPerAnalysis' | 'maxSavedAnalyses'): number => {
    return features[limitType];
  };
  
  const isUnlimited = (limitType: 'maxPropertiesPerAnalysis' | 'maxSavedAnalyses'): boolean => {
    return features[limitType] === -1;
  };
  
  const checkUsageLimit = (
    limitType: 'maxPropertiesPerAnalysis' | 'maxSavedAnalyses',
    currentUsage: number
  ): { allowed: boolean; remaining: number; limit: number } => {
    const limit = features[limitType];
    
    if (limit === -1) {
      return { allowed: true, remaining: -1, limit: -1 }; // Unlimited
    }
    
    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage < limit;
    
    return { allowed, remaining, limit };
  };
  
  const getUpgradeMessage = (feature: keyof TierFeatures): string | null => {
    if (canAccessFeature(feature)) return null;
    
    const upgradeTier = getNextTierWithFeature(currentTier, feature);
    if (!upgradeTier) return null;
    
    return `Upgrade to ${upgradeTier} to access this feature`;
  };
  
  const getNextTierWithFeature = (currentTier: UserTier, feature: keyof TierFeatures): UserTier | null => {
    const tiers = Object.values(UserTier);
    const currentIndex = tiers.indexOf(currentTier);
    
    for (let i = currentIndex + 1; i < tiers.length; i++) {
      if (TIER_FEATURES[tiers[i]][feature]) {
        return tiers[i];
      }
    }
    
    return null;
  };
  
  const getTierDisplayName = (tier: UserTier): string => {
    switch (tier) {
      case UserTier.FREE: return 'Free';
      case UserTier.BASIC: return 'Basic';
      case UserTier.PROFESSIONAL: return 'Professional';
      case UserTier.ENTERPRISE: return 'Enterprise';
      default: return tier;
    }
  };
  
  const getTierColor = (tier: UserTier): string => {
    switch (tier) {
      case UserTier.FREE: return '#6c757d';
      case UserTier.BASIC: return '#007bff';
      case UserTier.PROFESSIONAL: return '#28a745';
      case UserTier.ENTERPRISE: return '#dc3545';
      default: return '#6c757d';
    }
  };
  
  return {
    currentTier,
    features,
    canAccessFeature,
    getLimit,
    isUnlimited,
    checkUsageLimit,
    getUpgradeMessage,
    getNextTierWithFeature,
    getTierDisplayName,
    getTierColor
  };
}

