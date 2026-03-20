import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, CheckCircle2, XCircle, Eye, Building2, Mail, Calendar, FileText,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface Seller {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  registrationNumber: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  products: string;
  notes: string;
}

const mockSellers: Seller[] = [
  { id: 1, name: "John Smith", email: "john@techwholesale.co.uk", phone: "+44 7911 123456", company: "TechWholesale UK", registrationNumber: "GB123456789", date: "2025-03-18", status: "pending", products: "Electronics, Phones, Tablets", notes: "Large UK distributor with 5 years experience." },
  { id: 2, name: "Sarah Johnson", email: "sarah@homegoods.com", phone: "+44 7922 987654", company: "HomeGoods Direct", registrationNumber: "GB987654321", date: "2025-03-17", status: "pending", products: "Home & Garden, Furniture", notes: "New business, first wholesale application." },
  { id: 3, name: "Mike Brown", email: "mike@sportmax.co.uk", phone: "+44 7933 456789", company: "SportMax Trade", registrationNumber: "GB456789123", date: "2025-03-17", status: "approved", products: "Sports Equipment, Clothing", notes: "Verified retailer with multiple locations." },
  { id: 4, name: "Emma Wilson", email: "emma@luxebeauty.com", phone: "+44 7944 321654", company: "LuxeBeauty Wholesale", registrationNumber: "GB321654987", date: "2025-03-16", status: "rejected", products: "Beauty, Skincare", notes: "Incomplete documentation provided." },
  { id: 5, name: "David Green", email: "david@greenplanet.co.uk", phone: "+44 7955 789123", company: "GreenPlanet Supplies", registrationNumber: "GB789123456", date: "2025-03-15", status: "approved", products: "Eco Products, Cleaning", notes: "Eco-certified supplier." },
  { id: 6, name: "Lisa Chen", email: "lisa@asiatrade.co.uk", phone: "+44 7966 654321", company: "AsiaTrade Direct", registrationNumber: "GB654321789", date: "2025-03-14", status: "pending", products: "Food & Drink, Snacks", notes: "Importing Asian goods to UK market." },
  { id: 7, name: "Tom Davies", email: "tom@toolkinguk.com", phone: "+44 7977 111222", company: "ToolKing UK", registrationNumber: "GB111222333", date: "2025-03-13", status: "pending", products: "Tools, Hardware", notes: "Established hardware distributor." },
];

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-200",
  approved: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  rejected: "bg-destructive/15 text-destructive border-destructive/20",
};

const AdminApprovals = () => {
  const [sellers, setSellers] = useState(mockSellers);
  const [search, setSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);

  const handleApprove = (id: number) => {
    setSellers((prev) => prev.map((s) => (s.id === id ? { ...s, status: "approved" as const } : s)));
    setSelectedSeller(null);
  };

  const handleReject = (id: number) => {
    setSellers((prev) => prev.map((s) => (s.id === id ? { ...s, status: "rejected" as const } : s)));
    setSelectedSeller(null);
  };

  const filtered = sellers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.company.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((s) => s.status === status);

  const renderTable = (data: Seller[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead className="hidden md:table-cell">Contact</TableHead>
          <TableHead className="hidden sm:table-cell">Products</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No applications found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <p className="font-medium text-sm">{s.company}</p>
                <p className="text-xs text-muted-foreground">{s.name}</p>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{s.email}</TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[150px] truncate">{s.products}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.date}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor[s.status]}>{s.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedSeller(s)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {s.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={() => handleApprove(s.id)}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleReject(s.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Seller Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and manage seller registration requests.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending <Badge variant="secondary" className="ml-2 text-xs">{byStatus("pending").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-4">{renderTable(byStatus("pending"))}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="approved">
          <Card>
            <CardContent className="pt-4">{renderTable(byStatus("approved"))}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rejected">
          <Card>
            <CardContent className="pt-4">{renderTable(byStatus("rejected"))}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all">
          <Card>
            <CardContent className="pt-4">{renderTable(filtered)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSeller} onOpenChange={() => setSelectedSeller(null)}>
        {selectedSeller && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedSeller.company}</DialogTitle>
              <DialogDescription>Seller application details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm font-medium">{selectedSeller.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{selectedSeller.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Reg. Number</p>
                    <p className="text-sm font-medium">{selectedSeller.registrationNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Applied</p>
                    <p className="text-sm font-medium">{selectedSeller.date}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Products / Categories</p>
                <p className="text-sm">{selectedSeller.products}</p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{selectedSeller.notes}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Current Status:</span>
                <Badge variant="outline" className={statusColor[selectedSeller.status]}>
                  {selectedSeller.status}
                </Badge>
              </div>
            </div>

            {selectedSeller.status === "pending" && (
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => handleReject(selectedSeller.id)}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => handleApprove(selectedSeller.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminApprovals;
