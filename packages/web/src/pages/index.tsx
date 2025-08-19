import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import Header from '@/components/header'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Multi Analysis App</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive property analysis and investment evaluation platform for Massachusetts real estate
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-blue-600">📊</span>
                Property Listings
              </CardTitle>
              <CardDescription>
                Browse and analyze MLS listings with comprehensive financial metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Total Properties:</span>
                  <Badge variant="secondary">1,000+</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Coverage:</span>
                  <Badge>MA Statewide</Badge>
                </div>
                <Link href="/listings">
                  <Button className="w-full mt-4">View Listings</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-green-600">🏠</span>
                Custom Property Analysis
              </CardTitle>
              <CardDescription>
                Analyze any property with the same comprehensive financial metrics as MLS listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Analysis:</span>
                  <Badge variant="outline">Same Metrics</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Auto-populate:</span>
                  <Badge variant="outline">Market Rents</Badge>
                </div>
                <Link href="/analyze-unlisted">
                  <Button className="w-full mt-4">Analyze Property</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-purple-600">💰</span>
                Financial Analysis
              </CardTitle>
              <CardDescription>
                Advanced ROI calculations, DSCR analysis, and cash flow projections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Analysis Modes:</span>
                  <Badge variant="outline">3 Types</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Metrics:</span>
                  <Badge variant="outline">10+ KPIs</Badge>
                </div>
                <Link href="/listings">
                  <Button className="w-full mt-4">Start Analysis</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-orange-600">🏘️</span>
                Market Insights
              </CardTitle>
              <CardDescription>
                County and town-level market data with rental analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Counties:</span>
                  <Badge variant="secondary">14 Counties</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Data Source:</span>
                  <Badge>MLS + Rent Data</Badge>
                </div>
                <Link href="/listings">
                  <Button className="w-full mt-4">Explore Markets</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">1,000+</div>
              <div className="text-sm text-gray-600">Active Listings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">∞</div>
              <div className="text-sm text-gray-600">Custom Properties</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">14</div>
              <div className="text-sm text-gray-600">Counties</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">3</div>
              <div className="text-sm text-gray-600">Analysis Modes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">10+</div>
              <div className="text-sm text-gray-600">Key Metrics</div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Ready to Start Analyzing Properties?</CardTitle>
              <CardDescription>
                Access comprehensive property data, financial analysis, and market insights to make informed investment decisions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/listings">
                  <Button size="lg" className="w-full sm:w-auto">
                    Browse Properties
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
