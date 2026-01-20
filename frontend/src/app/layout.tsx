import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/Providers";
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DeData - Community Reputation System",
  description: "Transparent, decentralized reputation tracking for Web3 communities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#000',
                color: '#00ff41',
                border: '1px solid #00ff41',
                borderRadius: '8px',
                fontFamily: 'monospace',
              },
              success: {
                iconTheme: {
                  primary: '#00ff41',
                  secondary: '#000',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ff4141',
                  secondary: '#000',
                },
                style: {
                  borderColor: '#ff4141',
                  color: '#ff4141',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}