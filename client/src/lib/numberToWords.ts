export function convertToWords(num: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  function convertLessThanThousand(n: number): string {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const unit = n % 10;
      const ten = Math.floor(n / 10);
      return tens[ten] + (unit > 0 ? ' ' + units[unit] : '');
    }
    
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return units[hundred] + ' Hundred' + (remainder > 0 ? ' and ' + convertLessThanThousand(remainder) : '');
  }
  
  function convert(n: number): string {
    if (n < 1000) return convertLessThanThousand(n);
    
    if (n < 100000) { // less than 1 lakh
      const thousand = Math.floor(n / 1000);
      const remainder = n % 1000;
      return convertLessThanThousand(thousand) + ' Thousand' + (remainder > 0 ? ' ' + convert(remainder) : '');
    }
    
    if (n < 10000000) { // less than 1 crore
      const lakh = Math.floor(n / 100000);
      const remainder = n % 100000;
      return convertLessThanThousand(lakh) + ' Lakh' + (remainder > 0 ? ' ' + convert(remainder) : '');
    }
    
    const crore = Math.floor(n / 10000000);
    const remainder = n % 10000000;
    return convertLessThanThousand(crore) + ' Crore' + (remainder > 0 ? ' ' + convert(remainder) : '');
  }
  
  return convert(num);
}
