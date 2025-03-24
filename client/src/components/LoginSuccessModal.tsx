import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface LoginSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginSuccessModal({ isOpen, onClose }: LoginSuccessModalProps) {
  // Using controlled state inside the component to manage dialog state
  const [open, setOpen] = useState(false);

  // Sync the internal state with the prop
  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  // Handle the close event
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <DialogTitle className="text-xl">Login Successful!</DialogTitle>
        </DialogHeader>
        <div className="text-center py-4">
          <p className="text-gray-600">Welcome, Admin!</p>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={() => handleOpenChange(false)}>
            Go to Index
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
