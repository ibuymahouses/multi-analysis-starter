import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

interface AssumptionsDialogProps {
  assumptions: {
    ltv: number;
    interestRate: number;
    loanTerm: number;
    dscrFloor: number;
  };
  onAssumptionsChange: (assumptions: any) => void;
}

export function AssumptionsDialog({ assumptions, onAssumptionsChange }: AssumptionsDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [localAssumptions, setLocalAssumptions] = React.useState(assumptions)

  // Format LTV percentage - no decimals
  const formatLTV = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  // Format interest rate - 2 decimal places
  const formatInterestRate = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const handleSave = () => {
    onAssumptionsChange(localAssumptions)
    setOpen(false)
  }

  const handleCancel = () => {
    setLocalAssumptions(assumptions)
    setOpen(false)
  }

  const handleReset = () => {
    const defaultAssumptions = {
      ltv: 0.80,
      interestRate: 0.065,
      loanTerm: 30,
      dscrFloor: 1.20
    }
    setLocalAssumptions(defaultAssumptions)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Assumptions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Financing Assumptions</DialogTitle>
          <DialogDescription>
            Customize the financing parameters used to calculate DSCR and other metrics in the listings table.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Loan Parameters</CardTitle>
              <CardDescription>
                These settings affect how DSCR is calculated for all properties
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ltv">Loan-to-Value (LTV)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="ltv"
                      type="number"
                      value={Math.round(localAssumptions.ltv * 100)}
                      onChange={(e) => setLocalAssumptions(prev => ({
                        ...prev,
                        ltv: Number(e.target.value) / 100
                      }))}
                      className="w-20"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Maximum loan amount as % of property value
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest Rate</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="interestRate"
                      type="number"
                      value={(localAssumptions.interestRate * 100).toFixed(2)}
                      onChange={(e) => setLocalAssumptions(prev => ({
                        ...prev,
                        interestRate: Number(e.target.value) / 100
                      }))}
                      className="w-20"
                      min="0"
                      max="20"
                      step="0.01"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Annual interest rate
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loanTerm">Loan Term</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="loanTerm"
                      type="number"
                      value={localAssumptions.loanTerm}
                      onChange={(e) => setLocalAssumptions(prev => ({
                        ...prev,
                        loanTerm: Number(e.target.value)
                      }))}
                      className="w-20"
                      min="5"
                      max="40"
                      step="1"
                    />
                    <span className="text-sm text-muted-foreground">Years</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Loan amortization period
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dscrFloor">DSCR Floor</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="dscrFloor"
                      type="number"
                      value={localAssumptions.dscrFloor}
                      onChange={(e) => setLocalAssumptions(prev => ({
                        ...prev,
                        dscrFloor: Number(e.target.value)
                      }))}
                      className="w-20"
                      min="1.0"
                      max="2.0"
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum DSCR requirement
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Values</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">LTV:</span>
                  <span className="ml-2 font-medium">{formatLTV(localAssumptions.ltv)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Interest Rate:</span>
                  <span className="ml-2 font-medium">{formatInterestRate(localAssumptions.interestRate)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Loan Term:</span>
                  <span className="ml-2 font-medium">{localAssumptions.loanTerm} Years</span>
                </div>
                <div>
                  <span className="text-muted-foreground">DSCR Floor:</span>
                  <span className="ml-2 font-medium">{localAssumptions.dscrFloor}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
