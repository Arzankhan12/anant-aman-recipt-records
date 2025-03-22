import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  onBackToForm: () => void;
  onLogout: () => void;
}

export default function AdminHeader({ onBackToForm, onLogout }: AdminHeaderProps) {
  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-medium">Admin Panel</h1>
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/20"
            onClick={onBackToForm}
          >
            <span className="mr-2">←</span> Back to Form
          </Button>
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/20"
            onClick={onLogout}
          >
            <span className="mr-2">🚪</span> Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
