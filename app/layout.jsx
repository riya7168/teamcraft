import "./globals.css";
import SessionTimeout from "../components/SessionTimeout";
import MouseInteraction from "../components/MouseInteraction";

export const metadata = {
  title: "Teamcraft — Build better teams",
  description: "Match project teams around skills, interests, and availability, then make contributions visible.",
};

export default function RootLayout({ children }) {
  return <html lang="en" data-scroll-behavior="smooth"><body><SessionTimeout /><MouseInteraction />{children}</body></html>;
}
