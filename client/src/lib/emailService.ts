import emailjs from '@emailjs/browser';

// Initialize EmailJS with your user ID
// In a real app, this would come from environment variables
const EMAIL_JS_SERVICE_ID = import.meta.env.VITE_EMAIL_JS_SERVICE_ID || "default_service";
const EMAIL_JS_TEMPLATE_ID = import.meta.env.VITE_EMAIL_JS_TEMPLATE_ID || "template_default";
const EMAIL_JS_USER_ID = import.meta.env.VITE_EMAIL_JS_USER_ID || "user_default";

// Email service using server-side Nodemailer instead of EmailJS
// This client-side service will make API calls to the server's Nodemailer implementation

export async function sendEmail(toEmail: string, pdfBlob: Blob): Promise<void> {
  try {
    // Convert PDF blob to base64
    const base64data = await blobToBase64(pdfBlob);
    
    // Call the server API to send email
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toEmail,
        subject: 'Your Donation Receipt',
        text: 'Thank you for your donation. Please find your receipt attached.',
        pdfBase64: base64data,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send email');
    }
    
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw error;
  }
}

// Helper function to convert Blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
