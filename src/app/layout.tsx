import type { Metadata } from "next";
import "./globals.css";
import { ProjectProvider } from '@/context/ProjectContext';

export const metadata: Metadata = {
  title: "RASMSB Management Ecosystem",
  description: "Security operations management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ProjectProvider>
          {children}
        </ProjectProvider>
      </body>
    </html>
  );
}
