import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { convertToWords } from "@/lib/numberToWords";
import { generatePdf } from "@/lib/pdfGenerator";
import { sendEmail as sendEmailService } from "../lib/emailService"; // Import with alias to avoid conflict
import anantamanLogo from "../assets/Anant-Aman_Logo-1.png";
import { useAuth } from "@/context/AuthContext";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  receiptNumber: z.string().min(1, "Receipt number is required"),
  date: z.string().min(1, "Date is required"),
  donorName: z.string().min(1, "Donor name is required"),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Invalid email address"),
  panNumber: z.string().optional(),
  paymentMode: z.enum(["cash", "online", "dd", "cheque"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  amountInWords: z.string().min(1, "Amount in words is required"),
  purpose: z.string().min(1, "Purpose is required"),
  instrumentDate: z.string().optional(),
  drawnOn: z.string().optional(),
  instrumentNumber: z.string().optional(),
  submittedBy: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DonationFormProps {
  onSubmissionSuccess: (email: string) => void;
}

export default function DonationForm({ onSubmissionSuccess }: DonationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showInstrumentFields, setShowInstrumentFields] = useState(false);

  // Fetch the next receipt number
  const { data: receiptData, isLoading: isLoadingReceipt, refetch: refetchReceiptNumber } = useQuery<{ receiptNumber: string }>({
    queryKey: ['/api/next-receipt-number'],
    queryFn: async (): Promise<{ receiptNumber: string }> => {
      try {
        console.log('Fetching next receipt number...');
        const response = await fetch('/api/next-receipt-number');
        if (!response.ok) {
          throw new Error('Failed to fetch receipt number');
        }
        const data = await response.json();
        console.log('Received receipt number:', data.receiptNumber);
        return { receiptNumber: data.receiptNumber };
      } catch (error) {
        console.error('Error fetching receipt number:', error);
        throw error;
      }
    },
    // Don't cache the receipt number to ensure we always get a fresh one
    staleTime: 0
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      receiptNumber: "",
      date: new Date().toISOString().split('T')[0],
      donorName: "",
      contactNumber: "",
      address: "",
      email: "",
      panNumber: "",
      paymentMode: "cash",
      amount: 0,
      amountInWords: "",
      purpose: "",
      instrumentDate: "",
      drawnOn: "",
      instrumentNumber: "",
      submittedBy: user ? user.username : "unknown",
    },
  });

  // Update the receipt number when data is loaded
  useEffect(() => {
    if (receiptData?.receiptNumber) {
      form.setValue("receiptNumber", receiptData.receiptNumber);
    }
  }, [receiptData, form]);

  // Update amount in words when amount changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "amount") {
        const amount = value.amount;
        if (amount && typeof amount === 'number' && amount > 0) {
          const words = convertToWords(amount);
          form.setValue("amountInWords", words + " Rupees Only");
        }
      }

      if (name === "paymentMode") {
        const mode = value.paymentMode;
        setShowInstrumentFields(mode === "dd" || mode === "cheque");
        
        // If switching to cash mode, check if amount is over 2000
        if (mode === "cash") {
          const currentAmount = form.getValues("amount");
          if (currentAmount > 2000) {
            toast({
              variant: "destructive",
              title: "Cash Payment Limit",
              description: "Cash payments cannot exceed ₹2000. Please reduce the amount or choose a different payment method.",
            });
            form.setValue("amount", 0);
            form.setValue("amountInWords", "");
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, toast]);

  // Handle form submission
  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      console.log('Submitting form with values:', values);
      // Add the current user's username to the donation data
      const donationData = {
        ...values,
        createdBy: user ? user.username : "unknown"
      };
      const response = await apiRequest("POST", "/api/donations", donationData);
      return response.json();
    },
    onSuccess: async (data, variables) => {
      try {
        console.log('Form submitted successfully, donation created:', data);
        
        // Generate PDF
        const pdfBlob = await generatePdf(variables);

        // Send email with PDF
        await sendEmail(variables.email, pdfBlob);

        // Show success message
        toast({
          title: "Success!",
          description: "Receipt has been generated and sent to the donor's email.",
        });

        // Explicitly invalidate the receipt number query to force a refetch
        queryClient.invalidateQueries({ queryKey: ['/api/next-receipt-number'] });
        
        // Refetch the receipt number to get the next one
        console.log('Refetching receipt number...');
        const newReceiptData = await refetchReceiptNumber();
        const newReceiptNumber = newReceiptData.data?.receiptNumber || '';
        console.log('New receipt number:', newReceiptNumber);

        // Reset form with the new receipt number
        form.reset({
          receiptNumber: newReceiptNumber,
          date: new Date().toISOString().split('T')[0],
          donorName: "",
          contactNumber: "",
          address: "",
          email: "",
          panNumber: "",
          paymentMode: "cash",
          amount: 0,
          amountInWords: "",
          purpose: "",
          instrumentDate: "",
          drawnOn: "",
          instrumentNumber: "",
          submittedBy: user ? user.username : "unknown",
        });

        // Notify parent component of successful submission
        onSubmissionSuccess(variables.email);
      } catch (error) {
        console.error('Error after form submission:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to generate or send receipt. Please try again.",
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit form",
      });
    },
  });

  function onSubmit(values: FormValues) {
    submitMutation.mutate(values);
  }

  return (
    <>
     <div className="container mx-auto max-w-8xl">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <img 
            src={anantamanLogo} 
            alt="Anantaman Logo" 
            className="w-full max-sm:w- h-24 mr-4 object-contain"
          />
        </div>
        
        <div className="text-right">
          <p className="text-sm">
            Reg. No. - 03/27/03/16480/13
          </p>
          <p className="text-sm">
            Reg. Address: 9, Naresh Apartment, Sadhu Vaswani Nagar, Indore
          </p>
          <p className="text-sm">
            (M.P.) 452 001
          </p>
          <p className="text-sm">
            Mob. 777-199-7475
          </p>
          <p className="text-sm text-blue-700">
            E-mail: anantaman.sws@gmail.com
          </p>
        </div>
      </div>
    </div>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="receiptNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receipt Number</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="bg-gray-100" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="donorName"
          render={({ field }) => (
              <FormItem>
                <FormLabel>Donor Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter donor's full name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="contactNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter contact number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="Enter email address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} placeholder="Enter complete address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="panNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PAN Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter PAN number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mode of Payment</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="dd">D.D</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter purpose of donation" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (Rupees)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    placeholder="Enter amount"
                    onChange={e => {
                      const amount = parseInt(e.target.value);
                      const paymentMode = form.getValues("paymentMode");
                      
                      // Check if payment mode is cash and amount exceeds 2000
                      if (paymentMode === "cash" && amount > 2000) {
                        toast({
                          variant: "destructive",
                          title: "Cash Payment Limit",
                          description: "Cash payments cannot exceed ₹2000. Please reduce the amount or choose a different payment method.",
                        });
                        // Reset to 2000 for cash payments
                        field.onChange("2000");
                        const words = convertToWords(2000);
                        form.setValue("amountInWords", words + " Rupees Only");
                      } else {
                        field.onChange(e);
                        if (!isNaN(amount)) {
                          const words = convertToWords(amount);
                          form.setValue("amountInWords", words + " Rupees Only");
                        }
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amountInWords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (In Words)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    disabled 
                    className="bg-gray-100" 
                    placeholder="Auto-generated from amount"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {showInstrumentFields && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="instrumentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="drawnOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Drawn On</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter bank name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instrumentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cheque/DD No.</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="mt-4">
          <Button 
            type="submit" 
            disabled={submitMutation.isPending || isLoadingReceipt}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </Form>
    </>
  );
}

const sendEmail = async (email: string, pdfBlob: Blob) => {
    try {
        // Use our updated email service that uses Nodemailer on the server
        await sendEmailService(email, pdfBlob);
    } catch (error) {
        console.error("Failed to send email:", error);
        throw error; // Re-throw the error to be handled by the calling function.
    }
};