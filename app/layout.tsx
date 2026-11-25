import "./globals.css";
import { ProtectMedia } from "./components/protect-media";

export const metadata = { title: "Booking" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ProtectMedia />
        {children}
      </body>
    </html>
  );
}