import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agent Office',
  description: 'Pixel art office dashboard for AI agents',
};

const NAV_ITEMS = [
  { href: '/', label: '🏠 Office' },
  { href: '/missions', label: '📋 Missions' },
  { href: '/agents', label: '🤖 Agents' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex">
        {/* Sidebar */}
        <nav className="w-48 bg-office-panel border-r border-office-border flex flex-col p-4 gap-2 shrink-0 max-md:hidden">
          <h1 className="font-pixel text-[10px] text-office-accent mb-4">AGENT OFFICE</h1>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs text-office-text hover:text-office-accent px-2 py-1.5 rounded hover:bg-office-bg/50 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-office-panel border-t border-office-border flex z-50">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex-1 text-center text-xs py-3 text-office-text hover:text-office-accent"
            >
              {item.label}
            </a>
          ))}
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
