import type { Metadata } from "next";
import { Inter } from "next/font/google";
import MaybilityNav from "../../components/MaybilityNav";
import {SessionProvider} from 'next-auth/react'
import "./globals.css";
import SessionWrapper from "../../components/SessionWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionWrapper>
      <html lang="en" className="dark">
        <body className={inter.className}>
          <MaybilityNav/>
          {children}
          </body>
      </html>
    </SessionWrapper>
    
  );
}
