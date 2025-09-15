import MainHeader from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CategoryHeroSlider from "@/components/features/CategoryHeroSlider";
// removed ServiceCategories for modern layout
import TopRatedHeroStores from "@/components/features/TopRatedHeroStores";
import MensStoresModern from "@/components/features/MensStoresModern";
import SocialLinksBar from "@/components/features/SocialLinksBar";
import { useAuth } from "@/contexts/AuthContext";
// removed HomeAvailabilityPackages for modern layout

const Index = () => {
  const { role } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <main className="pt-16 space-y-10">
        <CategoryHeroSlider category="mens-hair" showTabs={false} />
        <TopRatedHeroStores />
        <MensStoresModern category="all" />
        <SocialLinksBar />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
