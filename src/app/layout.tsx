import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next API",
  description: "REST API Server",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
