import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import UserListTab from "@/components/UserListTab";
import RegisterUserTab from "@/components/RegisterUserTab";
import AdminHeader from "@/components/AdminHeader";

type TabType = "users" | "register";

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("users");

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleBackToForm = () => {
    setLocation("/form");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader 
        onBackToForm={handleBackToForm} 
        onLogout={handleLogout} 
      />

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <Button
                variant={activeTab === "users" ? "default" : "ghost"}
                className={activeTab === "users" 
                  ? "rounded-none border-b-2 border-primary" 
                  : "rounded-none border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
                onClick={() => setActiveTab("users")}
              >
                User List
              </Button>
              <Button
                variant={activeTab === "register" ? "default" : "ghost"}
                className={activeTab === "register" 
                  ? "rounded-none border-b-2 border-primary" 
                  : "rounded-none border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
                onClick={() => setActiveTab("register")}
              >
                Register User
              </Button>
            </nav>
          </div>

          {activeTab === "users" && <UserListTab />}
          {activeTab === "register" && <RegisterUserTab />}
        </div>
      </div>
    </div>
  );
}
