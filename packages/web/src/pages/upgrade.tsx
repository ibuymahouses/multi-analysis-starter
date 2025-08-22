import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth-context';
import { useTierFeatures } from '@/hooks/useTierFeatures';
import { UserTier, TIER_FEATURES } from '@multi-analysis/shared/types/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TIER_PRICING = {
  [UserTier.FREE]: { monthly: 0, yearly: 0 },
  [UserTier.BASIC]: { monthly: 29, yearly: 290 },
  [UserTier.PROFESSIONAL]: { monthly: 79, yearly: 790 },
  [UserTier.ENTERPRISE]: { monthly: 199, yearly: 1990 }
};

const TIER_DESCRIPTIONS = {
  [UserTier.FREE]: 'Perfect for getting started with property analysis',
  [UserTier.BASIC]: 'Great for individual investors analyzing properties',
  [UserTier.PROFESSIONAL]: 'Advanced features for serious real estate professionals',
  [UserTier.ENTERPRISE]: 'Complete solution for teams and large-scale operations'
};

export default function UpgradePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentTier, getTierDisplayName, getTierColor } = useTierFeatures();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedTier, setSelectedTier] = useState<UserTier | null>(null);

  const handleUpgrade = async (tier: UserTier) => {
    // In a real implementation, this would integrate with a payment processor
    console.log(`Upgrading to ${tier} tier`);
    
    // For demo purposes, show a success message
    alert(`Upgrade to ${getTierDisplayName(tier)} initiated! This would redirect to payment processing in production.`);
  };

  const getSavings = (tier: UserTier) => {
    const monthly = TIER_PRICING[tier].monthly * 12;
    const yearly = TIER_PRICING[tier].yearly;
    return monthly - yearly;
  };

  const isCurrentTier = (tier: UserTier) => tier === currentTier;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your real estate investment needs. 
            All plans include our core analysis tools with different levels of advanced features.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {Object.values(UserTier).map((tier) => {
            const features = TIER_FEATURES[tier];
            const price = TIER_PRICING[tier][billingCycle];
            const savings = billingCycle === 'yearly' ? getSavings(tier) : 0;
            
            return (
              <Card 
                key={tier}
                className={`relative ${
                  isCurrentTier(tier) 
                    ? 'ring-2 ring-blue-500 shadow-lg' 
                    : 'hover:shadow-lg transition-shadow'
                }`}
              >
                {isCurrentTier(tier) && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-3 py-1">
                      Current Plan
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle 
                    className="text-xl font-bold"
                    style={{ color: getTierColor(tier) }}
                  >
                    {getTierDisplayName(tier)}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {TIER_DESCRIPTIONS[tier]}
                  </CardDescription>
                  
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-gray-900">
                      ${price}
                      <span className="text-lg font-normal text-gray-500">
                        /{billingCycle === 'monthly' ? 'mo' : 'year'}
                      </span>
                    </div>
                    {savings > 0 && (
                      <div className="text-sm text-green-600 mt-1">
                        Save ${savings} annually
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Feature List */}
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {features.maxPropertiesPerAnalysis === -1 
                        ? 'Unlimited properties per analysis'
                        : `${features.maxPropertiesPerAnalysis} properties per analysis`
                      }
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {features.maxSavedAnalyses === -1 
                        ? 'Unlimited saved analyses'
                        : `${features.maxSavedAnalyses} saved analyses`
                      }
                    </div>
                    
                    <div className="flex items-center text-sm">
                      {features.advancedAnalytics ? (
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      Advanced Analytics
                    </div>
                    
                    <div className="flex items-center text-sm">
                      {features.compComparisons ? (
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      Comp Comparisons
                    </div>
                    
                    <div className="flex items-center text-sm">
                      {features.exportCapabilities ? (
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      Export Capabilities
                    </div>
                    
                    <div className="flex items-center text-sm">
                      {features.apiAccess ? (
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      API Access
                    </div>
                    
                    <div className="flex items-center text-sm">
                      {features.prioritySupport ? (
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      Priority Support
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleUpgrade(tier)}
                    disabled={isCurrentTier(tier)}
                    className={`w-full ${
                      isCurrentTier(tier)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isCurrentTier(tier) ? 'Current Plan' : 'Get Started'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Can I change my plan later?</h3>
              <p className="text-gray-600 text-sm">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
              <p className="text-gray-600 text-sm">
                Yes, all paid plans come with a 14-day free trial. No credit card required to start.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600 text-sm">
                We accept all major credit cards, PayPal, and bank transfers for annual plans.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600 text-sm">
                Absolutely. You can cancel your subscription at any time with no cancellation fees.
              </p>
            </div>
          </div>
        </div>

        {/* Back to App */}
        <div className="text-center mt-12">
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to App
          </Button>
        </div>
      </div>
    </div>
  );
}

