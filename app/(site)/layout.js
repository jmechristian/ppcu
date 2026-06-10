import Header from "../components/Header";
import Footer from "../components/Footer";
import PageFadeTransition from "../components/PageFadeTransition";

export default function SiteLayout({ children }) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <PageFadeTransition>{children}</PageFadeTransition>
      </main>
      <Footer />
    </>
  );
}
