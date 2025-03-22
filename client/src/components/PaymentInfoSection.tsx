import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const QrCodeSvg = () => (
  <svg
    width="192"
    height="192"
    viewBox="0 0 192 192"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="bg-gray-100 p-4 rounded-lg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M42 42H78V78H42V42ZM54 54H66V66H54V54Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M114 42H150V78H114V42ZM126 54H138V66H126V54Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M42 114H78V150H42V114ZM54 126H66V138H54V126Z"
      fill="currentColor"
    />
    <path
      d="M114 114H126V126H114V114ZM126 126H138V138H126V126ZM138 114H150V126H138V114ZM114 138H126V150H114V138ZM138 138H150V150H138V138Z"
      fill="currentColor"
    />
    <path
      d="M42 90H54V102H42V90ZM66 90H78V102H66V90ZM90 42H102V54H90V54ZM90 66H102V78H90V78ZM90 90H102V102H90V102ZM90 114H102V126H90V126ZM90 138H102V150H90V150ZM114 90H126V102H114V102ZM138 90H150V102H138V102ZM42 30H54V42H42V30ZM66 30H78V42H66V30ZM90 30H102V42H90V30ZM114 30H126V42H114V30ZM138 30H150V42H138V30ZM162 42H174V54H162V42ZM162 66H174V78H162V66ZM162 90H174V102H162V90ZM162 114H174V126H162V114ZM162 138H174V150H162V138ZM42 162H54V174H42V162ZM66 162H78V174H66V162ZM90 162H102V174H90V162ZM114 162H126V174H114V162ZM138 162H150V174H138V162ZM162 162H174V174H162V162Z"
      fill="currentColor"
    />
  </svg>
);

export default function PaymentInfoSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-medium text-gray-800">Payment Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col items-center">
            <h4 className="text-lg font-medium text-gray-700 mb-4">Scan QR to Pay</h4>
            <QrCodeSvg />
            <p className="text-sm text-gray-600 mt-2">Scan with any UPI app</p>
          </div>
          
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-4">Bank Details</h4>
            <ul className="space-y-3">
              <li className="flex flex-col sm:flex-row">
                <span className="text-gray-600 w-40">Account Name:</span>
                <span className="font-medium">Anantaman Social Welfare Society</span>
              </li>
              <Separator className="my-1 sm:hidden" />
              <li className="flex flex-col sm:flex-row">
                <span className="text-gray-600 w-40">Account Number:</span>
                <span className="font-medium">123456789012</span>
              </li>
              <Separator className="my-1 sm:hidden" />
              <li className="flex flex-col sm:flex-row">
                <span className="text-gray-600 w-40">IFSC Code:</span>
                <span className="font-medium">SBIN0001234</span>
              </li>
              <Separator className="my-1 sm:hidden" />
              <li className="flex flex-col sm:flex-row">
                <span className="text-gray-600 w-40">Bank Name:</span>
                <span className="font-medium">State Bank of India</span>
              </li>
              <Separator className="my-1 sm:hidden" />
              <li className="flex flex-col sm:flex-row">
                <span className="text-gray-600 w-40">UPI ID:</span>
                <span className="font-medium">123456789012</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
