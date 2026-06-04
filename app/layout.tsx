import "./globals.css";

import AppShell from "@/app/components/AppShell";

export const metadata = {
  title: "Inquire",
  description: "AI Workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
