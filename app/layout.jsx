import "./globals.css";

export const metadata = {
  title: "Teamcraft — Build better teams",
  description: "Match project teams around skills, interests, and availability, then make contributions visible.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
