import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assemblage",
  description: "Online implementation of the Assemblage card game"
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-start overflow-y-auto">
        {props.children}
      </body>
    </html>
  );
}

