import './globals.css';
import { Providers } from './providers.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';

export const metadata = {
  title: 'Refinery PO System',
  description: 'Purchase order management for refinery equipment',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64 p-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
