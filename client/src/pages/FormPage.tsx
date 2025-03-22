import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import DonationForm from "@/components/DonationForm";
import PaymentInfoSection from "@/components/PaymentInfoSection";
import SubmissionModal from "@/components/SubmissionModal";

interface FormPageProps {
  onLogout: () => void;
}

export default function FormPage({ onLogout }: FormPageProps) {
  const [, setLocation] = useLocation();
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const handleLogout = () => {
    onLogout();
    setLocation("/");
  };

  const handleSubmissionSuccess = (email: string) => {
    setSubmittedEmail(email);
    setShowSubmissionModal(true);
  };

  const handleCloseSubmissionModal = () => {
    setShowSubmissionModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-medium">Anant Aman Social Welfare Society</h1>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20"
              onClick={() => setLocation("/admin")}
            >
              <span className="mr-2">👤</span> Admin Panel
            </Button>
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20"
              onClick={handleLogout}
            >
              <span className="mr-2">🚪</span> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-medium text-gray-800 mb-6">Donation Receipt Form</h2>
          <DonationForm onSubmissionSuccess={handleSubmissionSuccess} />
        </div>
        
        <PaymentInfoSection />

        <SubmissionModal 
          isOpen={showSubmissionModal} 
          onClose={handleCloseSubmissionModal}
          email={submittedEmail}
        />
      </main>
    </div>
  );
}
