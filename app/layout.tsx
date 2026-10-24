import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AC Agnirasa | Bull Ride Tickets",
  description: "Book your Bull Ride ticket for Udyami Bazaar at GD Goenka University.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
