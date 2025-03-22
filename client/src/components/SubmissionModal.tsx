import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export default function SubmissionModal({ isOpen, onClose, email }: SubmissionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <DialogTitle className="text-xl">Form Submitted Successfully!</DialogTitle>
        </DialogHeader>
        <div className="text-center py-4">
          <p className="text-gray-600">
            A receipt has been sent to{" "}
            <span className="font-medium">{email}</span>
          </p>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
