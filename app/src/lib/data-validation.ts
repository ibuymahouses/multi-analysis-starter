// Data validation utilities for checking completeness and quality

export interface DataValidationResult {
  isValid: boolean;
  issues: DataIssue[];
  stats: ValidationStats;
  summary: string;
}

export interface DataIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  rowIndex?: number;
  listNo?: string;
  field?: string;
  value?: any;
}

export interface ValidationStats {
  total: number;
  valid: number;
  errors: number;
  warnings: number;
  missingRent: number;
  missingAnalysis: number;
  missingUnitMix: number;
  missingZip: number;
  zeroRent: number;
  invalidPrices: number;
  missingAddress: number;
  missingTown: number;
}

export interface PropertyRow {
  LIST_NO: string;
  ADDRESS: string;
  TOWN: string;
  STATE: string;
  ZIP_CODE: string;
  LIST_PRICE: number;
  UNITS_FINAL: number;
  NO_UNITS_MF: number;
  UNIT_MIX?: Array<{
    bedrooms: number;
    count: number;
  }>;
  analysis?: {
    rentMode: string;
    monthlyGross: number;
    annualGross: number;
    opex: number;
    noi: number;
    loanSized: number;
    annualDebtService: number;
    dscr: number;
    capAtAsk: number;
    marketTier: string;
    county: string;
    town: string;
  };
}

// Lightweight validation - runs quickly for large datasets
export function validateDataCompleteness(data: PropertyRow[]): DataValidationResult {
  const issues: DataIssue[] = [];
  const stats: ValidationStats = {
    total: data.length,
    valid: 0,
    errors: 0,
    warnings: 0,
    missingRent: 0,
    missingAnalysis: 0,
    missingUnitMix: 0,
    missingZip: 0,
    zeroRent: 0,
    invalidPrices: 0,
    missingAddress: 0,
    missingTown: 0
  };

  data.forEach((row, index) => {
    let rowValid = true;
    let rowErrors = 0;
    let rowWarnings = 0;

    // Critical errors (missing required fields)
    if (!row.LIST_NO) {
      issues.push({
        type: 'error',
        message: 'Missing MLS number',
        rowIndex: index,
        field: 'LIST_NO'
      });
      rowErrors++;
      rowValid = false;
    }

    if (!row.ZIP_CODE) {
      issues.push({
        type: 'error',
        message: 'Missing ZIP code',
        rowIndex: index,
        listNo: row.LIST_NO,
        field: 'ZIP_CODE'
      });
      rowErrors++;
      rowValid = false;
      stats.missingZip++;
    }

    if (!row.LIST_PRICE || row.LIST_PRICE <= 0) {
      issues.push({
        type: 'error',
        message: 'Invalid list price',
        rowIndex: index,
        listNo: row.LIST_NO,
        field: 'LIST_PRICE',
        value: row.LIST_PRICE
      });
      rowErrors++;
      rowValid = false;
      stats.invalidPrices++;
    }

    // Analysis validation
    if (!row.analysis) {
      issues.push({
        type: 'error',
        message: 'Missing analysis data',
        rowIndex: index,
        listNo: row.LIST_NO,
        field: 'analysis'
      });
      rowErrors++;
      rowValid = false;
      stats.missingAnalysis++;
    } else {
      // Rent validation
      if (row.analysis.monthlyGross === null || row.analysis.monthlyGross === undefined) {
        issues.push({
          type: 'error',
          message: 'Missing monthly rent',
          rowIndex: index,
          listNo: row.LIST_NO,
          field: 'monthlyGross'
        });
        rowErrors++;
        rowValid = false;
        stats.missingRent++;
      } else if (row.analysis.monthlyGross === 0) {
        issues.push({
          type: 'warning',
          message: 'Zero monthly rent - check rent data',
          rowIndex: index,
          listNo: row.LIST_NO,
          field: 'monthlyGross',
          value: row.analysis.monthlyGross
        });
        rowWarnings++;
        stats.zeroRent++;
      }

      // NOI validation
      if (row.analysis.noi === null || row.analysis.noi === undefined) {
        issues.push({
          type: 'error',
          message: 'Missing NOI calculation',
          rowIndex: index,
          listNo: row.LIST_NO,
          field: 'noi'
        });
        rowErrors++;
        rowValid = false;
      }
    }

    // Unit mix validation
    if (!row.UNIT_MIX || row.UNIT_MIX.length === 0) {
      issues.push({
        type: 'warning',
        message: 'Missing unit mix - using defaults',
        rowIndex: index,
        listNo: row.LIST_NO,
        field: 'UNIT_MIX'
      });
      rowWarnings++;
      stats.missingUnitMix++;
    }

    // Address validation
    if (!row.ADDRESS) {
      issues.push({
        type: 'warning',
        message: 'Missing address',
        rowIndex: index,
        listNo: row.LIST_NO,
        field: 'ADDRESS'
      });
      rowWarnings++;
      stats.missingAddress++;
    }

    if (!row.TOWN) {
      issues.push({
        type: 'warning',
        message: 'Missing town',
        rowIndex: index,
        listNo: row.LIST_NO,
        field: 'TOWN'
      });
      rowWarnings++;
      stats.missingTown++;
    }

    // Update stats
    if (rowValid) {
      stats.valid++;
    }
    stats.errors += rowErrors;
    stats.warnings += rowWarnings;
  });

  // Generate summary
  const errorRate = ((stats.errors / stats.total) * 100).toFixed(1);
  const warningRate = ((stats.warnings / stats.total) * 100).toFixed(1);
  const validRate = ((stats.valid / stats.total) * 100).toFixed(1);

  const summary = `Data validation complete: ${stats.valid}/${stats.total} valid (${validRate}%), ${stats.errors} errors (${errorRate}%), ${stats.warnings} warnings (${warningRate}%)`;

  return {
    isValid: stats.errors === 0,
    issues,
    stats,
    summary
  };
}

// Comprehensive validation with detailed analysis
export function validateDataQuality(data: PropertyRow[]): DataValidationResult {
  const basicValidation = validateDataCompleteness(data);
  
  // Add quality checks
  const qualityIssues: DataIssue[] = [...basicValidation.issues];
  
  data.forEach((row, index) => {
    // Check for unrealistic values
    if (row.analysis?.monthlyGross && row.analysis.monthlyGross > 50000) {
      qualityIssues.push({
        type: 'warning',
        message: 'Unusually high monthly rent',
        rowIndex: index,
        listNo: row.LIST_NO,
        field: 'monthlyGross',
        value: row.analysis.monthlyGross
      });
    }

    if (row.analysis?.capAtAsk && row.analysis.capAtAsk > 15) {
      qualityIssues.push({
        type: 'warning',
        message: 'Unusually high cap rate',
        rowIndex: index,
        listNo: row.LIST_NO,
        field: 'capAtAsk',
        value: row.analysis.capAtAsk
      });
    }

    if (row.analysis?.dscr && row.analysis.dscr > 3) {
      qualityIssues.push({
        type: 'warning',
        message: 'Unusually high DSCR',
        rowIndex: index,
        listNo: row.LIST_NO,
        field: 'dscr',
        value: row.analysis.dscr
      });
    }

    // Check for data consistency
    if (row.UNIT_MIX && row.UNIT_MIX.length > 0) {
      const totalUnits = row.UNIT_MIX.reduce((sum, unit) => sum + unit.count, 0);
      if (totalUnits !== row.UNITS_FINAL) {
        qualityIssues.push({
          type: 'warning',
          message: 'Unit mix count mismatch',
          rowIndex: index,
          listNo: row.LIST_NO,
          field: 'UNIT_MIX',
          value: `Mix: ${totalUnits}, Final: ${row.UNITS_FINAL}`
        });
      }
    }
  });

  return {
    ...basicValidation,
    issues: qualityIssues
  };
}

// Performance-optimized validation for real-time use
export function quickValidation(data: PropertyRow[]): { hasIssues: boolean; issueCount: number } {
  let issueCount = 0;
  
  for (let i = 0; i < Math.min(data.length, 100); i++) { // Check first 100 rows
    const row = data[i];
    if (!row.analysis?.monthlyGross || !row.ZIP_CODE || !row.LIST_PRICE) {
      issueCount++;
    }
  }
  
  return {
    hasIssues: issueCount > 0,
    issueCount
  };
}
