import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import anantamanLogo from "../assets/Anant-Aman_Logo-1.png";

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
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminLoginPageProps {
  onAdminLoginSuccess: () => void;
}

export default function AdminLoginPage({ onAdminLoginSuccess }: AdminLoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      // Call the admin login API endpoint
      const response = await apiRequest("POST", "/api/admin/login", values);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Invalid admin credentials");
      }
      
      // Store admin authentication in localStorage
      localStorage.setItem('isAdminAuthenticated', 'true');
      
      // Notify parent component of successful login
      onAdminLoginSuccess();
      
      // Show success message
      toast({
        title: "Success",
        description: "Admin login successful",
      });
      
      // Navigate to admin panel
      setLocation("/admin");
    } catch (error) {
      console.error("Admin login error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to login as admin",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToForm = () => {
    setLocation("/form");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center mb-6">
          <img src={anantamanLogo} alt="Anantaman Logo" className="h-20 object-contain" />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter admin username" 
                      autoComplete="username"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="password" 
                      placeholder="Enter admin password" 
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-4 flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBackToForm}
              >
                Back to Form
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
