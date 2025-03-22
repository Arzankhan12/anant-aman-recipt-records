import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import LoginSuccessModal from "@/components/LoginSuccessModal";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Fixed credentials as per the requirements
  const fixedCredentials = {
    username: "admin@example.com",
    password: "admin123"
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/login", fixedCredentials);
      const userData = await response.json();
      
      // Call the login function from props
      onLoginSuccess();
      setShowSuccessModal(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid credentials"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToIndex = () => {
    setShowSuccessModal(false);
    setLocation("/form");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-medium text-gray-800">Anant Aman Social Welfare Society</h1>
            <p className="text-gray-600 mt-2">Admin Login</p>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={fixedCredentials.username} 
                readOnly 
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={fixedCredentials.password} 
                readOnly 
                className="bg-gray-50"
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <LoginSuccessModal 
        isOpen={showSuccessModal} 
        onClose={handleGoToIndex}
      />
    </div>
  );
}
