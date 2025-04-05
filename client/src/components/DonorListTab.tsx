import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download } from "lucide-react";
import * as XLSX from 'xlsx';

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

interface Donation {
  id: number;
  donorName: string;
  contactNumber: string;
  email: string;
  panNumber: string;
  amount: number;
  paymentMode: string;
  date: string;
  receiptNumber: string;
  address: string;
  amountInWords: string;
  purpose: string;
  drawnOn?: string;
  instrumentDate?: string | null;
  instrumentNumber?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export default function DonorListTab() {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Fetch all donations
  const { data: donations = [], isLoading: isLoadingDonations } = useQuery<Donation[]>({
    queryKey: ['/api/donations'],
  });

  // Fetch all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Filter donations based on selected user and search query
  const filteredDonations = useMemo(() => {
    // For debugging
    if (selectedUser && selectedUser !== 'all') {
      console.log("Filtering for user:", selectedUser);
    }
    
    return donations.filter((donation) => {
      // Match by selected user (using username for exact matching)
      let matchesUser = selectedUser === 'all' || !selectedUser;
      
      if (!matchesUser && selectedUser) {
        // Try exact match first
        if (donation.createdBy === selectedUser) {
          matchesUser = true;
        } 
        // If no exact match, try case-insensitive match
        else if (donation.createdBy && selectedUser && 
                donation.createdBy.toLowerCase() === selectedUser.toLowerCase()) {
          matchesUser = true;
        }
        // If still no match and createdBy is empty/null, check if we're filtering for "System"
        else if ((!donation.createdBy || donation.createdBy === "") && selectedUser === "system") {
          matchesUser = true;
        }
      }
        
      // Match by search query (across all text fields)
      const matchesSearch = searchQuery
        ? Object.values(donation).some(
            value => 
              value && 
              typeof value === 'string' && 
              value.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : true;
      
      return matchesUser && matchesSearch;
    });
  }, [donations, selectedUser, searchQuery, users]);

  // Get user full name from username
  const getUserFullName = (username: string | null | undefined): string => {
    if (!username) return 'System';
    const user = users.find(u => u.username === username);
    return user ? user.fullName : username;
  };

  // Export data to Excel
  const handleExport = () => {
    const dataToExport = filteredDonations.map(donation => ({
      'Receipt Number': donation.receiptNumber,
      'Donor Name': donation.donorName,
      'Date': donation.date,
      'Address': donation.address,
      'Contact Number': donation.contactNumber,
      'Email': donation.email,
      'PAN Number': donation.panNumber,
      'Amount': donation.amount,
      'Amount in Words': donation.amountInWords,
      'Payment Mode': donation.paymentMode,
      'Purpose': donation.purpose,
      'Bank/Drawn On': donation.drawnOn || 'N/A',
      'Instrument Date': donation.instrumentDate || 'N/A',
      'Instrument Number': donation.instrumentNumber || 'N/A',
      'Created By': getUserFullName(donation.createdBy),
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Donations');
    
    // Set column widths
    const maxWidth = 20;
    const colWidth = Object.keys(dataToExport[0] || {}).reduce((acc, key) => {
      acc[key] = { width: maxWidth };
      return acc;
    }, {} as { [key: string]: { width: number } });
    worksheet['!cols'] = Object.keys(dataToExport[0] || {}).map(() => ({ width: maxWidth }));
    
    // Generate & download the Excel file
    XLSX.writeFile(workbook, 'donations.xlsx');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:w-auto flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-8"
              placeholder="Search donations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="w-full sm:w-auto flex-1">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="system">System (Unassigned)</SelectItem>
              {isLoadingUsers ? (
                <SelectItem value="loading" disabled>Loading users...</SelectItem>
              ) : (
                users
                  .filter(user => user.isActive)
                  .map((user) => (
                    <SelectItem key={user.id} value={user.username}>
                      {user.fullName} ({user.username})
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleExport}
          disabled={filteredDonations.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt No.</TableHead>
              <TableHead>Donor Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>PAN No.</TableHead>
              <TableHead>Mode of Payment</TableHead>
              <TableHead>Cheque/D.D./Txn No.</TableHead>
              <TableHead>Cheque/D.D./Txn Date</TableHead>
              <TableHead>Drawn On</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Created By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingDonations ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 12 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredDonations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center">
                  No donations found.
                </TableCell>
              </TableRow>
            ) : (
              filteredDonations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell className="font-medium">{donation.receiptNumber}</TableCell>
                  <TableCell>{donation.donorName}</TableCell>
                  <TableCell>{donation.date}</TableCell>
                  <TableCell>₹{donation.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>{donation.address}</TableCell>
                  <TableCell>{donation.panNumber || 'N/A'}</TableCell>
                  <TableCell>{donation.paymentMode}</TableCell>
                  <TableCell>{donation.instrumentNumber || 'N/A'}</TableCell>
                  <TableCell>{donation.instrumentDate || 'N/A'}</TableCell>
                  <TableCell>{donation.drawnOn || 'N/A'}</TableCell>
                  <TableCell>{donation.purpose}</TableCell>
                  <TableCell>{getUserFullName(donation.createdBy)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}