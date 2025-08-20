/**
 * Reusable analysis results component
 * Displays financial analysis data in a clean, organized format
 */

import React from 'react';
import { PropertyAnalysis } from '@multi-analysis/shared';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface AnalysisResultsProps {
  analysis: PropertyAnalysis;
  viewMode: 'annual' | 'monthly';
  onViewModeChange: (mode: 'annual' | 'monthly') => void;
  className?: string;
}

export function AnalysisResults({ 
  analysis, 
  viewMode, 
  onViewModeChange, 
  className = '' 
}: AnalysisResultsProps) {
  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  };

  // Format percentage values
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Get DSCR status
  const getDSCRStatus = (dscr: number) => {
    if (dscr >= 1.25) return { status: 'excellent', color: 'bg-green-100 text-green-800' };
    if (dscr >= 1.20) return { status: 'good', color: 'bg-blue-100 text-blue-800' };
    if (dscr >= 1.15) return { status: 'fair', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'poor', color: 'bg-red-100 text-red-800' };
  };

  // Get cap rate status
  const getCapRateStatus = (capRate: number) => {
    if (capRate >= 8) return { status: 'high', color: 'bg-green-100 text-green-800' };
    if (capRate >= 6) return { status: 'good', color: 'bg-blue-100 text-blue-800' };
    if (capRate >= 4) return { status: 'fair', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'low', color: 'bg-red-100 text-red-800' };
  };

  const dscrStatus = getDSCRStatus(analysis.dscr);
  const capRateStatus = getCapRateStatus(analysis.capAtAsk);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Financial Analysis</CardTitle>
          <div className="flex space-x-2">
            <button
              onClick={() => onViewModeChange('monthly')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'monthly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => onViewModeChange('annual')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'annual'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Annual
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gross Income */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Gross Income</h4>
            <p className="text-2xl font-bold text-green-600">
              {viewMode === 'monthly' 
                ? formatCurrency(analysis.monthlyGross)
                : formatCurrency(analysis.annualGross)
              }
            </p>
            <p className="text-xs text-gray-500">
              {viewMode === 'monthly' ? 'Monthly' : 'Annual'}
            </p>
          </div>

          {/* Operating Expenses */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Operating Expenses</h4>
            <p className="text-2xl font-bold text-red-600">
              {viewMode === 'monthly' 
                ? formatCurrency(analysis.opex / 12)
                : formatCurrency(analysis.opex)
              }
            </p>
            <p className="text-xs text-gray-500">
              {viewMode === 'monthly' ? 'Monthly' : 'Annual'}
            </p>
          </div>

          {/* Net Operating Income */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Net Operating Income</h4>
            <p className="text-2xl font-bold text-blue-600">
              {viewMode === 'monthly' 
                ? formatCurrency(analysis.noi / 12)
                : formatCurrency(analysis.noi)
              }
            </p>
            <p className="text-xs text-gray-500">
              {viewMode === 'monthly' ? 'Monthly' : 'Annual'}
            </p>
          </div>

          {/* Loan Amount */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Loan Amount</h4>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(analysis.loanSized)}
            </p>
            <p className="text-xs text-gray-500">Maximum</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* DSCR */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">DSCR</h4>
            <div className="flex items-center space-x-2">
              <p className="text-xl font-bold">{analysis.dscr.toFixed(2)}</p>
              <Badge className={dscrStatus.color}>
                {dscrStatus.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">Debt Service Coverage Ratio</p>
          </div>

          {/* Cap Rate */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Cap Rate</h4>
            <div className="flex items-center space-x-2">
              <p className="text-xl font-bold">{formatPercentage(analysis.capAtAsk)}</p>
              <Badge className={capRateStatus.color}>
                {capRateStatus.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">Capitalization Rate</p>
          </div>

          {/* Annual Debt Service */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Annual Debt Service</h4>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(analysis.annualDebtService)}
            </p>
            <p className="text-xs text-gray-500">Based on current terms</p>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Analysis Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Gross Income:</span>
              <span className="font-medium">
                {viewMode === 'monthly' 
                  ? formatCurrency(analysis.monthlyGross)
                  : formatCurrency(analysis.annualGross)
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Operating Expenses:</span>
              <span className="font-medium">
                {viewMode === 'monthly' 
                  ? formatCurrency(analysis.opex / 12)
                  : formatCurrency(analysis.opex)
                }
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-medium">Net Operating Income:</span>
              <span className="font-bold text-blue-600">
                {viewMode === 'monthly' 
                  ? formatCurrency(analysis.noi / 12)
                  : formatCurrency(analysis.noi)
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Debt Service:</span>
              <span className="font-medium">
                {viewMode === 'monthly' 
                  ? formatCurrency(analysis.annualDebtService / 12)
                  : formatCurrency(analysis.annualDebtService)
                }
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-medium">Cash Flow:</span>
              <span className={`font-bold ${
                (viewMode === 'monthly' ? analysis.noi / 12 : analysis.noi) - 
                (viewMode === 'monthly' ? analysis.annualDebtService / 12 : analysis.annualDebtService) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {formatCurrency(
                  (viewMode === 'monthly' ? analysis.noi / 12 : analysis.noi) - 
                  (viewMode === 'monthly' ? analysis.annualDebtService / 12 : analysis.annualDebtService)
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
