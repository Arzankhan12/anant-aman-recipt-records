import { jsPDF } from "jspdf";
import "jspdf-autotable";

export async function generatePdf(data: any): Promise<Blob> {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(18);
  doc.setTextColor(63, 81, 181); // Primary color
  doc.text("Anant Aman Social Welfare Society", 105, 20, { align: "center" });
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("Donation Receipt", 105, 30, { align: "center" });
  
  // Add receipt details
  doc.setFontSize(10);
  doc.setTextColor(0);
  
  // Two columns on top: Receipt Number and Date
  doc.text(`Receipt No: ${data.receiptNumber}`, 20, 45);
  doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 150, 45);
  
  // Add a line separator
  doc.setDrawColor(200);
  doc.line(20, 50, 190, 50);
  
  // Donor information
  doc.setFontSize(12);
  doc.text("Donor Information", 20, 60);
  
  doc.setFontSize(10);
  doc.text(`Name: ${data.donorName}`, 20, 70);
  doc.text(`Contact: ${data.contactNumber}`, 20, 80);
  doc.text(`Email: ${data.email}`, 20, 90);
  doc.text(`PAN: ${data.panNumber}`, 20, 100);
  doc.text(`Address: ${data.address}`, 20, 110);
  
  // Add a line separator
  doc.line(20, 120, 190, 120);
  
  // Donation details
  doc.setFontSize(12);
  doc.text("Donation Details", 20, 130);
  
  doc.setFontSize(10);
  doc.text(`Purpose: ${data.purpose}`, 20, 140);
  doc.text(`Amount: ₹ ${data.amount}`, 20, 150);
  doc.text(`Amount in Words: ${data.amountInWords}`, 20, 160);
  doc.text(`Payment Mode: ${data.paymentMode.toUpperCase()}`, 20, 170);
  
  // If payment mode is cheque or DD, add instrument details
  if (data.paymentMode === 'cheque' || data.paymentMode === 'dd') {
    doc.text(`${data.paymentMode === 'cheque' ? 'Cheque' : 'DD'} No: ${data.instrumentNumber || 'N/A'}`, 20, 180);
    doc.text(`Date: ${data.instrumentDate ? new Date(data.instrumentDate).toLocaleDateString() : 'N/A'}`, 20, 190);
    doc.text(`Drawn On: ${data.drawnOn || 'N/A'}`, 20, 200);
  }
  
  // Add a line separator
  const yPos = data.paymentMode === 'cheque' || data.paymentMode === 'dd' ? 210 : 180;
  doc.line(20, yPos, 190, yPos);
  
  // Add footer with bank details
  doc.setFontSize(8);
  doc.text("Bank Details: Anantaman Social Welfare Society | Acc No: 123456789012 | IFSC: SBIN0001234 | Bank: State Bank of India", 105, 230, { align: "center" });
  doc.text("Thank you for your generous contribution!", 105, 240, { align: "center" });
  
  // Return the PDF as a blob
  return doc.output("blob");
}
