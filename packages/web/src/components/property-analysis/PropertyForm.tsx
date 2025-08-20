/**
 * Reusable property form component
 * Extracted from analyze-unlisted.tsx to improve modularity
 */

import React from 'react';
import { Property } from '@multi-analysis/shared';
import { useFormInput, useCurrencyInput, useTextInput } from '../../hooks';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface PropertyFormProps {
  property: Property;
  onPropertyChange: (updates: Partial<Property>) => void;
  disabled?: boolean;
}

export function PropertyForm({ property, onPropertyChange, disabled = false }: PropertyFormProps) {
  // Form inputs
  const addressInput = useTextInput(property.ADDRESS, true);
  const townInput = useTextInput(property.TOWN, true);
  const zipCodeInput = useTextInput(property.ZIP_CODE, true);
  const listPriceInput = useCurrencyInput(property.LIST_PRICE);
  const taxesInput = useCurrencyInput(property.TAXES);
  const unitsInput = useFormInput({
    initialValue: property.UNITS_FINAL,
    parser: (value) => parseInt(value) || 0,
    validator: (value) => value < 0 ? 'Units must be positive' : null,
  });

  // Handle input changes
  const handleAddressChange = (value: string) => {
    addressInput.handleStringInput(value);
    onPropertyChange({ ADDRESS: value });
  };

  const handleTownChange = (value: string) => {
    townInput.handleStringInput(value);
    onPropertyChange({ TOWN: value });
  };

  const handleZipCodeChange = (value: string) => {
    zipCodeInput.handleStringInput(value);
    onPropertyChange({ ZIP_CODE: value });
  };

  const handleListPriceChange = (value: string) => {
    listPriceInput.handleStringInput(value);
    onPropertyChange({ LIST_PRICE: listPriceInput.value });
  };

  const handleTaxesChange = (value: string) => {
    taxesInput.handleStringInput(value);
    onPropertyChange({ TAXES: taxesInput.value });
  };

  const handleUnitsChange = (value: string) => {
    unitsInput.handleStringInput(value);
    onPropertyChange({ UNITS_FINAL: unitsInput.value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={addressInput.value}
              onChange={(e) => handleAddressChange(e.target.value)}
              onBlur={addressInput.handleBlur}
              placeholder="Enter property address"
              disabled={disabled}
            />
            {addressInput.error && (
              <p className="text-sm text-red-500">{addressInput.error}</p>
            )}
          </div>

          {/* Town */}
          <div className="space-y-2">
            <Label htmlFor="town">Town</Label>
            <Input
              id="town"
              value={townInput.value}
              onChange={(e) => handleTownChange(e.target.value)}
              onBlur={townInput.handleBlur}
              placeholder="Enter town"
              disabled={disabled}
            />
            {townInput.error && (
              <p className="text-sm text-red-500">{townInput.error}</p>
            )}
          </div>

          {/* ZIP Code */}
          <div className="space-y-2">
            <Label htmlFor="zipCode">ZIP Code</Label>
            <Input
              id="zipCode"
              value={zipCodeInput.value}
              onChange={(e) => handleZipCodeChange(e.target.value)}
              onBlur={zipCodeInput.handleBlur}
              placeholder="Enter ZIP code"
              disabled={disabled}
            />
            {zipCodeInput.error && (
              <p className="text-sm text-red-500">{zipCodeInput.error}</p>
            )}
          </div>

          {/* List Price */}
          <div className="space-y-2">
            <Label htmlFor="listPrice">List Price</Label>
            <Input
              id="listPrice"
              value={listPriceInput.formattedValue}
              onChange={(e) => handleListPriceChange(e.target.value)}
              onBlur={listPriceInput.handleBlur}
              placeholder="$0"
              disabled={disabled}
            />
            {listPriceInput.error && (
              <p className="text-sm text-red-500">{listPriceInput.error}</p>
            )}
          </div>

          {/* Taxes */}
          <div className="space-y-2">
            <Label htmlFor="taxes">Annual Taxes</Label>
            <Input
              id="taxes"
              value={taxesInput.formattedValue}
              onChange={(e) => handleTaxesChange(e.target.value)}
              onBlur={taxesInput.handleBlur}
              placeholder="$0"
              disabled={disabled}
            />
            {taxesInput.error && (
              <p className="text-sm text-red-500">{taxesInput.error}</p>
            )}
          </div>

          {/* Units */}
          <div className="space-y-2">
            <Label htmlFor="units">Number of Units</Label>
            <Input
              id="units"
              type="number"
              value={unitsInput.value}
              onChange={(e) => handleUnitsChange(e.target.value)}
              onBlur={unitsInput.handleBlur}
              placeholder="0"
              min="0"
              disabled={disabled}
            />
            {unitsInput.error && (
              <p className="text-sm text-red-500">{unitsInput.error}</p>
            )}
          </div>
        </div>

        {/* Property Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Property Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Address:</span>
              <p className="font-medium">{property.ADDRESS || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-gray-600">Location:</span>
              <p className="font-medium">{property.TOWN}, {property.STATE} {property.ZIP_CODE}</p>
            </div>
            <div>
              <span className="text-gray-600">List Price:</span>
              <p className="font-medium">{listPriceInput.formattedValue}</p>
            </div>
            <div>
              <span className="text-gray-600">Units:</span>
              <p className="font-medium">{property.UNITS_FINAL}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
