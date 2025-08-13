import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Shadcn/ui Components Test</h1>
      
      {/* Button Component */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Button Component</h2>
        <Button>Click me!</Button>
      </div>

      {/* Card Component */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Card Component</h2>
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Property Analysis</CardTitle>
            <CardDescription>Sample property data card</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This is a sample card showing how you can display property information in your multi-analysis project.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Input Component */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Input Component</h2>
        <Input placeholder="Enter property address..." className="w-[350px]" />
      </div>

      {/* Select Component */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Select Component</h2>
        <Select>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select county" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="middlesex">Middlesex</SelectItem>
            <SelectItem value="suffolk">Suffolk</SelectItem>
            <SelectItem value="norfolk">Norfolk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Badge Component */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Badge Component</h2>
        <div className="flex gap-2">
          <Badge>Available</Badge>
          <Badge variant="secondary">Under Contract</Badge>
          <Badge variant="destructive">Sold</Badge>
          <Badge variant="outline">New Listing</Badge>
        </div>
      </div>

      {/* Table Component */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Table Component</h2>
        <Table className="w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>MLS-123456</TableCell>
              <TableCell>123 Main St, Boston</TableCell>
              <TableCell>$450,000</TableCell>
              <TableCell><Badge>Available</Badge></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>MLS-789012</TableCell>
              <TableCell>456 Oak Ave, Cambridge</TableCell>
              <TableCell>$520,000</TableCell>
              <TableCell><Badge variant="secondary">Under Contract</Badge></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Tabs Component */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Tabs Component</h2>
        <Tabs defaultValue="listings" className="w-[600px]">
          <TabsList>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>
          <TabsContent value="listings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Property Listings</CardTitle>
                <CardDescription>View and manage your property listings</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Your listings will appear here...</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analytics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>View market trends and analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Analytics data will appear here...</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="favorites" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Favorite Properties</CardTitle>
                <CardDescription>Your saved properties</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Your favorite properties will appear here...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
