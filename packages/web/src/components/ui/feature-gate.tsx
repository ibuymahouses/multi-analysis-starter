import React from 'react';
import { useTierFeatures } from '@/hooks/useTierFeatures';
import { TierFeatures } from '@multi-analysis/shared/types/user';

interface FeatureGateProps {
  feature: keyof TierFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradeMessage?: boolean;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback = null,
  showUpgradeMessage = true 
}: FeatureGateProps) {
  const { canAccessFeature, getUpgradeMessage, getTierDisplayName, getNextTierWithFeature } = useTierFeatures();
  
  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (!showUpgradeMessage) {
    return null;
  }
  
  const upgradeMessage = getUpgradeMessage(feature);
  const nextTier = getNextTierWithFeature(feature);
  
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-center space-x-2 mb-2">
        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium text-gray-700">Premium Feature</span>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        {upgradeMessage || 'This feature requires a higher tier subscription.'}
      </p>
      {nextTier && (
        <button
          onClick={() => {
            // Navigate to upgrade page
            window.location.href = `/upgrade?tier=${nextTier}`;
          }}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Upgrade to {getTierDisplayName(nextTier)}
        </button>
      )}
    </div>
  );
}

interface UsageLimitProps {
  limitType: 'maxPropertiesPerAnalysis' | 'maxSavedAnalyses';
  currentUsage: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function UsageLimit({ 
  limitType, 
  currentUsage, 
  children, 
  fallback = null 
}: UsageLimitProps) {
  const { checkUsageLimit, getTierDisplayName, getNextTierWithFeature } = useTierFeatures();
  
  const { allowed, remaining, limit } = checkUsageLimit(limitType, currentUsage);
  
  if (allowed) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  const nextTier = getNextTierWithFeature(limitType);
  
  return (
    <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
      <div className="flex items-center space-x-2 mb-2">
        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium text-yellow-700">Usage Limit Reached</span>
      </div>
      <p className="text-sm text-yellow-600 mb-3">
        You've reached your limit of {limit} {limitType === 'maxPropertiesPerAnalysis' ? 'properties per analysis' : 'saved analyses'}.
      </p>
      {nextTier && (
        <button
          onClick={() => {
            window.location.href = `/upgrade?tier=${nextTier}`;
          }}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
        >
          Upgrade to {getTierDisplayName(nextTier)}
        </button>
      )}
    </div>
  );
}

