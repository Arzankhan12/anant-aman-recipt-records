import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { convertToWords } from "@/lib/numberToWords";
import { generatePdf } from "@/lib/pdfGenerator";
import { sendEmail as sendEmailService } from "../lib/emailService"; // Import with alias to avoid conflict

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
  panNumber: z.string().min(1, "PAN number is required"),
  paymentMode: z.enum(["cash", "online", "dd", "cheque"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  amountInWords: z.string().min(1, "Amount in words is required"),
  purpose: z.string().min(1, "Purpose is required"),
  instrumentDate: z.string().optional(),
  drawnOn: z.string().optional(),
  instrumentNumber: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DonationFormProps {
  onSubmissionSuccess: (email: string) => void;
}

export default function DonationForm({ onSubmissionSuccess }: DonationFormProps) {
  const { toast } = useToast();
  const [showInstrumentFields, setShowInstrumentFields] = useState(false);

  // Fetch the next receipt number
  const { data: receiptData, isLoading: isLoadingReceipt, refetch: refetchReceiptNumber } = useQuery<{ receiptNumber: string }>({
    queryKey: ['/api/next-receipt-number'],
    queryFn: async (): Promise<{ receiptNumber: string }> => {
      const response = await fetch('/api/next-receipt-number');
      if (!response.ok) {
        throw new Error('Failed to fetch receipt number');
      }
      return response.json();
    }
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
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Handle form submission
  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("POST", "/api/donations", values);
      return response.json();
    },
    onSuccess: async (data, variables) => {
      try {
        // Generate PDF
        const pdfBlob = await generatePdf(variables);

        // Send email with PDF
        await sendEmail(variables.email, pdfBlob);

        // Show success message
        toast({
          title: "Success!",
          description: "Receipt has been generated and sent to the donor's email.",
        });

        // Reset form except for the receipt number field (which should be auto-incremented)
        form.reset({
          ...form.getValues(),
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
        });

        // Refetch the receipt number to get the next one
        refetchReceiptNumber();

        // Notify parent component of successful submission
        onSubmissionSuccess(variables.email);
      } catch (error) {
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="paymentMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mode of Payment</FormLabel>
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
                <FormMessage />
              </FormItem>
            )}
          />

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
        </div>

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
                      field.onChange(e);
                      const amount = parseInt(e.target.value);
                      if (!isNaN(amount)) {
                        const words = convertToWords(amount);
                        form.setValue("amountInWords", words + " Rupees Only");
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

        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={submitMutation.isPending || isLoadingReceipt}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </Form>
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