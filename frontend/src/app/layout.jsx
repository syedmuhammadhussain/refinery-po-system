import "./globals.css";
import { Providers } from "./providers.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";

export const metadata = {
  title: "Refinery PO System",
  description: "Purchase order management for refinery equipment",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            {/* ml-64 only on lg+ where sidebar is always visible */}
            <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
