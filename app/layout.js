import { Montserrat } from "next/font/google";
import "./globals.css";
import { GrowthzoneProfileProvider } from "./providers/GrowthzoneProfileContext";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Paperboard Packaging Council",
  description: "The trade association for the North American paperboard packaging industry.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <GrowthzoneProfileProvider>{children}</GrowthzoneProfileProvider>
      </body>
    </html>
  );
}
