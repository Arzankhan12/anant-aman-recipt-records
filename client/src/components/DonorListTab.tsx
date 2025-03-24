import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download } from "lucide-react";
import * as XLSX from 'xlsx';

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
  createdAt: string;
}

export default function DonorListTab() {
  const [selectedDonor, setSelectedDonor] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Fetch all donations
  const { data: donations = [], isLoading } = useQuery<Donation[]>({
    queryKey: ['/api/donations'],
  });

  // Get unique donor names for dropdown
  const uniqueDonors = useMemo(() => {
    const uniqueNames = Array.from(new Set(donations.map(donation => donation.donorName)));
    return uniqueNames.sort();
  }, [donations]);

  // Filter donations based on selected donor and search query
  const filteredDonations = useMemo(() => {
    return donations.filter((donation) => {
      const matchesDonor = selectedDonor === 'all' || !selectedDonor ? true : donation.donorName === selectedDonor;
      const matchesSearch = searchQuery
        ? Object.values(donation).some(
            value => 
              value && 
              typeof value === 'string' && 
              value.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : true;
      return matchesDonor && matchesSearch;
    });
  }, [donations, selectedDonor, searchQuery]);

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
          <Select value={selectedDonor} onValueChange={setSelectedDonor}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by donor name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Donors</SelectItem>
              {uniqueDonors.map((donor) => (
                <SelectItem key={donor} value={donor}>
                  {donor}
                </SelectItem>
              ))}
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, index) => (
                <TableRow key={index}>
                  {Array(11).fill(0).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredDonations.length > 0 ? (
              filteredDonations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell>{donation.receiptNumber}</TableCell>
                  <TableCell>{donation.donorName}</TableCell>
                  <TableCell>{donation.date}</TableCell>
                  <TableCell>₹{donation.amount.toLocaleString()}</TableCell>
                  <TableCell>{donation.address}</TableCell>
                  <TableCell>{donation.panNumber}</TableCell>
                  <TableCell>{donation.paymentMode}</TableCell>
                  <TableCell>{donation.instrumentNumber || '-'}</TableCell>
                  <TableCell>{donation.instrumentDate || '-'}</TableCell>
                  <TableCell>{donation.drawnOn || '-'}</TableCell>
                  <TableCell>{donation.purpose}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                  No donations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}