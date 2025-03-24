import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import UserListTab from "@/components/UserListTab";
import RegisterUserTab from "@/components/RegisterUserTab";
import DonorListTab from "@/components/DonorListTab";
import AdminHeader from "@/components/AdminHeader";

type TabType = "users" | "register" | "donors";

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("users");

  const handleLogout = () => {
    onLogout();
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
            <nav className="flex flex-wrap -mb-px">
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
              <Button
                variant={activeTab === "donors" ? "default" : "ghost"}
                className={activeTab === "donors" 
                  ? "rounded-none border-b-2 border-primary" 
                  : "rounded-none border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
                onClick={() => setActiveTab("donors")}
              >
                Donor List
              </Button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "users" && <UserListTab />}
            {activeTab === "register" && <RegisterUserTab />}
            {activeTab === "donors" && <DonorListTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
