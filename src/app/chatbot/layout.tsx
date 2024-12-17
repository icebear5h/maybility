"use client";
import { Inter } from "next/font/google";
import ProtectedRoute from "../../../components/misc/ProtectedRoute"; // Assuming this is correct path

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ProtectedRoute>{children}</ProtectedRoute>
      </body>
    </html>
  );
}