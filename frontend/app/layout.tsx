import Script from 'next/script';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white">
        {/* Load Razorpay SDK */}
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
        {children}
      </body>
    </html>
  );
}