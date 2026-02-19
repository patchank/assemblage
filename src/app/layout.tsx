import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Assemblage",
  description: "Online implementation of the Assemblage card game"
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-start overflow-y-auto">
        <div className="flex-1 w-full flex flex-col items-center">
          {props.children}
        </div>
        <Footer />
      </body>
    </html>
  );
}

