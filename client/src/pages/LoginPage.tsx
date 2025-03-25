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
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [id === "email" ? "username" : id]: value
    }));
  };

  const handleLogin = async () => {
    // Validate inputs
    if (!credentials.username || !credentials.password) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Please enter both email and password"
      });
      return;
    }

    console.log('Attempting login with:', credentials);
    setLoading(true);
    
    // Set a timeout to automatically stop the loading state if it takes too long
    const loginTimeout = setTimeout(() => {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Login Timeout",
        description: "Login request is taking too long. Please try again later."
      });
    }, 10000); // 10 second backup timeout
    
    try {
      // Use a shorter timeout for the API request
      const response = await apiRequest("POST", "/api/login", credentials, 8000);
      console.log('Login response status:', response.status);
      const userData = await response.json();
      console.log('Login response data:', userData);
      
      // Call the login function from props
      onLoginSuccess();
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Login error:', error);
      
      // Provide more specific error messages
      let errorMessage = "Invalid email or password";
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          errorMessage = "Login request timed out. Please try again later.";
        } else if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
          errorMessage = "Network error. Please check your connection.";
        } else if (error.message.includes("401")) {
          errorMessage = "Invalid email or password.";
        } else if (error.message.includes("500")) {
          errorMessage = "Server error. Please try again later.";
        }
      }
      
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage
      });
    } finally {
      clearTimeout(loginTimeout);
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
                value={credentials.username}
                onChange={handleInputChange}
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={credentials.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
                disabled={loading}
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
