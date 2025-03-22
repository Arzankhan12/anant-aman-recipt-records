import emailjs from '@emailjs/browser';

// Initialize EmailJS with your user ID
// In a real app, this would come from environment variables
const EMAIL_JS_SERVICE_ID = import.meta.env.VITE_EMAIL_JS_SERVICE_ID || "default_service";
const EMAIL_JS_TEMPLATE_ID = import.meta.env.VITE_EMAIL_JS_TEMPLATE_ID || "template_default";
const EMAIL_JS_USER_ID = import.meta.env.VITE_EMAIL_JS_USER_ID || "user_default";

export async function sendEmail(toEmail: string, pdfBlob: Blob): Promise<void> {
  try {
    // For demonstration purposes, we'll log the email that would be sent
    // In a real implementation, we'd upload the PDF and send it via EmailJS
    console.log(`Email would be sent to ${toEmail} with the receipt PDF attached`);
    
    // In a real implementation with EmailJS:
    // 1. Convert PDF blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(pdfBlob);
    
    return new Promise((resolve, reject) => {
      reader.onloadend = function() {
        const base64data = reader.result;
        
        // 2. Send email with PDF attachment
        emailjs.send(
          EMAIL_JS_SERVICE_ID,
          EMAIL_JS_TEMPLATE_ID,
          {
            to_email: toEmail,
            message: "Thank you for your donation. Please find your receipt attached.",
            attachment: base64data,
          },
          EMAIL_JS_USER_ID
        )
        .then((response) => {
          console.log("Email sent successfully:", response);
          resolve();
        })
        .catch((error) => {
          console.error("Email sending failed:", error);
          reject(error);
        });
      };
    });
  } catch (error) {
    console.error("Error in sendEmail:", error);
    throw error;
  }
}
