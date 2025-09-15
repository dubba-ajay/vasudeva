import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Star, MapPin, Filter, Search, Phone, Award, Verified } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import salon1 from "@/assets/salon-1.jpg";
import salon2 from "@/assets/salon-2.jpg";
import salon3 from "@/assets/salon-3.jpg";
import mensHero from "@/assets/mens-hair-hero.jpg";
import womensHero from "@/assets/womens-beauty-hero.jpg";
import nailsHero from "@/assets/nail-studio-hero.jpg";
import makeupHero from "@/assets/makeup-artist-hero.jpg";

export const allStores = [
  // Men's Hair Stores
  {
    id: 101,
    name: "Elite Men's Grooming",
    category: "mens-hair",
    rating: 4.9,
    reviews: 245,
    distance: "0.5 mi",
    address: "123 Main Street, Downtown",
    phone: "(555) 123-4567",
    image: mensHero,
    priceRange: "₹₹",
    openHours: "9:00 AM - 8:00 PM",
    specialties: ["Premium Cuts", "Beard Styling", "Hot Towel Service"],
    description: "Upscale men's grooming with traditional barbershop atmosphere",
    isVerified: true,
    isTopRated: true
  },
  {
    id: 102,
    name: "Classic Barbershop",
    category: "mens-hair",
    rating: 4.7,
    reviews: 189,
    distance: "1.2 mi",
    address: "456 Oak Avenue, Midtown",
    phone: "(555) 234-5678",
    image: mensHero,
    priceRange: "₹",
    openHours: "8:00 AM - 7:00 PM",
    specialties: ["Traditional Cuts", "Straight Razor Shaves", "Walk-ins Welcome"],
    description: "Traditional barbershop experience with skilled craftsmen",
    isVerified: true
  },
  {
    id: 103,
    name: "Premium Men's Studio",
    category: "mens-hair",
    rating: 4.8,
    reviews: 312,
    distance: "2.1 mi",
    address: "789 Pine Street, Uptown",
    phone: "(555) 345-6789",
    image: mensHero,
    priceRange: "₹₹₹",
    openHours: "10:00 AM - 9:00 PM",
    specialties: ["Designer Cuts", "Hair Treatments", "VIP Service"],
    description: "Modern luxury grooming experience for the discerning gentleman",
    isVerified: true,
    isTopRated: true
  },

  // Women's Beauty Stores
  {
    id: 201,
    name: "Elegance Beauty Studio",
    category: "womens-beauty",
    rating: 4.9,
    reviews: 312,
    distance: "0.8 km",
    address: "567 Beauty Avenue, Downtown",
    phone: "(555) 111-2222",
    image: womensHero,
    priceRange: "₹₹₹",
    openHours: "9:00 AM - 8:00 PM",
    specialties: ["Hair Styling", "Facials", "Beauty Packages", "Bridal Services"],
    description: "Premium beauty treatments with expert stylists and relaxing atmosphere",
    isVerified: true,
    isTopRated: true
  },
  {
    id: 202,
    name: "Glamour Hair & Beauty",
    category: "womens-beauty",
    rating: 4.7,
    reviews: 245,
    distance: "1.5 km",
    address: "890 Style Street, City Center",
    phone: "(555) 222-3333",
    image: womensHero,
    priceRange: "₹₹",
    openHours: "8:00 AM - 9:00 PM",
    specialties: ["Hair Coloring", "Treatments", "Bridal Packages", "Extensions"],
    description: "Complete beauty transformation services with modern techniques",
    isVerified: true
  },
  {
    id: 203,
    name: "Divine Beauty Lounge",
    category: "womens-beauty",
    rating: 4.8,
    reviews: 189,
    distance: "2.2 km",
    address: "234 Luxury Lane, Uptown",
    phone: "(555) 333-4444",
    image: womensHero,
    priceRange: "₹₹₹",
    openHours: "10:00 AM - 7:00 PM",
    specialties: ["Luxury Treatments", "Hair Care", "Wellness", "Anti-Aging"],
    description: "Luxury beauty experience with personalized care and wellness focus",
    isVerified: true,
    isTopRated: true
  },

  // Nail Studios
  {
    id: 301,
    name: "Nail Art Studio",
    category: "nail-studios",
    rating: 4.8,
    reviews: 234,
    distance: "0.6 km",
    address: "123 Nail Street, Downtown",
    phone: "(555) 111-2233",
    image: nailsHero,
    priceRange: "₹₹",
    openHours: "9:00 AM - 8:00 PM",
    specialties: ["Nail Art", "Gel Extensions", "Classic Manicure", "3D Designs"],
    description: "Creative nail art and premium manicure services with artistic flair",
    isVerified: true,
    isTopRated: true
  },
  {
    id: 302,
    name: "Polish Perfect",
    category: "nail-studios",
    rating: 4.9,
    reviews: 312,
    distance: "1.3 km",
    address: "456 Beauty Blvd, City Center",
    phone: "(555) 222-3344",
    image: nailsHero,
    priceRange: "₹₹₹",
    openHours: "8:00 AM - 9:00 PM",
    specialties: ["Luxury Pedicure", "Spa Treatments", "Nail Care", "Hand Treatments"],
    description: "Luxury nail care with relaxing spa experience and premium products",
    isVerified: true,
    isTopRated: true
  },

  // Makeup Artists
  {
    id: 401,
    name: "Glamour Makeup Studio",
    category: "makeup-artists",
    rating: 4.9,
    reviews: 298,
    distance: "0.7 km",
    address: "345 Glam Street, Downtown",
    phone: "(555) 111-2244",
    image: makeupHero,
    priceRange: "₹₹₹",
    openHours: "8:00 AM - 10:00 PM",
    specialties: ["Bridal Makeup", "Party Makeup", "Photography", "Special Events"],
    description: "Professional makeup artists for all occasions with celebrity-level expertise",
    isVerified: true,
    isTopRated: true
  },
  {
    id: 402,
    name: "Beauty Canvas",
    category: "makeup-artists",
    rating: 4.8,
    reviews: 234,
    distance: "1.4 km",
    address: "678 Artist Avenue, City Center",
    phone: "(555) 222-3355",
    image: makeupHero,
    priceRange: "₹₹",
    openHours: "9:00 AM - 9:00 PM",
    specialties: ["Event Makeup", "Creative Looks", "Professional Styling", "Fashion Shows"],
    description: "Creative makeup artistry and beauty transformations for fashion and events",
    isVerified: true
  }
,
  // Additional Men's Hair Stores
  {
    id: 104,
    name: "Urban Fade Lab",
    category: "mens-hair",
    rating: 4.6,
    reviews: 156,
    distance: "1.0 mi",
    address: "12 Market Road, Riverside",
    phone: "(555) 444-5566",
    image: salon1,
    priceRange: "₹₹",
    openHours: "9:00 AM - 8:30 PM",
    specialties: ["Skin Fades", "Beard Trim", "Line Ups"],
    description: "Contemporary barbers with precision fades and beard craftsmanship",
    isVerified: true
  },
  {
    id: 105,
    name: "King's Cut Lounge",
    category: "mens-hair",
    rating: 4.8,
    reviews: 278,
    distance: "2.4 mi",
    address: "88 Regent Circle, Midtown",
    phone: "(555) 777-8899",
    image: salon2,
    priceRange: "₹₹₹",
    openHours: "10:00 AM - 9:30 PM",
    specialties: ["Hot Towel Shave", "Classic Pompadour", "Head Massage"],
    description: "Premium lounge experience with classic and modern styling",
    isVerified: true,
    isTopRated: true
  },

  // Additional Women's Beauty Stores
  {
    id: 204,
    name: "Radiance Salon & Spa",
    category: "womens-beauty",
    rating: 4.7,
    reviews: 198,
    distance: "2.0 km",
    address: "21 Blossom Lane, Garden District",
    phone: "(555) 444-6677",
    image: salon3,
    priceRange: "₹₹",
    openHours: "9:30 AM - 8:30 PM",
    specialties: ["Spa Facials", "Keratin", "Waxing", "Threading"],
    description: "Relaxing full-service salon with expert stylists and estheticians",
    isVerified: true
  },
  {
    id: 205,
    name: "Blossom Beauty Bar",
    category: "womens-beauty",
    rating: 4.8,
    reviews: 264,
    distance: "3.1 km",
    address: "9 Pearl Street, Uptown",
    phone: "(555) 555-1212",
    image: womensHero,
    priceRange: "₹₹₹",
    openHours: "10:00 AM - 9:00 PM",
    specialties: ["Balayage", "Makeovers", "Nail Spa", "Bridal Packages"],
    description: "Modern beauty bar specializing in color and premium treatments",
    isVerified: true,
    isTopRated: true
  },

  // Additional Nail Studios
  {
    id: 303,
    name: "Chrome & Co.",
    category: "nail-studios",
    rating: 4.7,
    reviews: 172,
    distance: "0.9 km",
    address: "66 Varnish Ave, Arts District",
    phone: "(555) 999-1010",
    image: salon1,
    priceRange: "₹₹",
    openHours: "10:00 AM - 8:00 PM",
    specialties: ["Chrome Nails", "BIAB", "French Tips"],
    description: "Trendy nail studio with on-point designs and durable finishes",
    isVerified: true
  },
  {
    id: 304,
    name: "Cuticle Collective",
    category: "nail-studios",
    rating: 4.8,
    reviews: 221,
    distance: "1.8 km",
    address: "41 Cutler Row, Central Parkside",
    phone: "(555) 909-1212",
    image: nailsHero,
    priceRange: "₹₹₹",
    openHours: "9:30 AM - 9:00 PM",
    specialties: ["Spa Pedicure", "Acrylic Sculpting", "Nail Art"],
    description: "Elevated nail care and spa pedicures with meticulous hygiene",
    isVerified: true,
    isTopRated: true
  },

  // Additional Makeup Artists
  {
    id: 403,
    name: "Contour Collective",
    category: "makeup-artists",
    rating: 4.7,
    reviews: 183,
    distance: "1.1 km",
    address: "27 Studio Walk, Fashion Mile",
    phone: "(555) 606-7070",
    image: salon2,
    priceRange: "₹₹",
    openHours: "8:00 AM - 9:00 PM",
    specialties: ["HD Makeup", "Photoshoot", "Editorial"],
    description: "On-trend artistry for shoots, events, and editorial looks",
    isVerified: true
  },
  {
    id: 404,
    name: "Starlight MUA Studio",
    category: "makeup-artists",
    rating: 4.9,
    reviews: 327,
    distance: "2.6 km",
    address: "5 Orion Place, Skyline Tower",
    phone: "(555) 313-4141",
    image: makeupHero,
    priceRange: "₹₹₹",
    openHours: "7:30 AM - 10:00 PM",
    specialties: ["Bridal HD", "Airbrush", "Sangeet & Reception"],
    description: "Celebrity-grade makeup studio specializing in bridal and airbrush",
    isVerified: true,
    isTopRated: true
  }
];

interface AllStoresProps {
  categoryFilter?: string;
  title?: string;
  description?: string;
  defaultPriceFilter?: "all" | "₹" | "₹₹" | "₹₹₹";
  defaultSortBy?: "rating" | "distance" | "price" | "reviews";
}

const AllStores: React.FC<AllStoresProps> = ({
  categoryFilter = "all",
  title = "All Beauty & Grooming Stores",
  description = "Discover the best beauty and grooming services near you",
  defaultPriceFilter = "all",
  defaultSortBy = "rating"
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [priceFilter, setPriceFilter] = useState(defaultPriceFilter);
  const [categoryState, setCategoryState] = useState(categoryFilter);
  const { location } = useLocation();

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "mens-hair", label: "Men's Hair" },
    { value: "womens-beauty", label: "Women's Beauty" },
    { value: "nail-studios", label: "Nail Studios" },
    { value: "makeup-artists", label: "Makeup Artists" }
  ];

  const filteredStores = allStores
    .filter(store => 
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.specialties.some(specialty => specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
      store.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(store => categoryState === "all" || store.category === categoryState)
    .filter(store => priceFilter === "all" || store.priceRange === priceFilter)
    .sort((a, b) => {
      switch(sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "distance":
          return parseFloat(a.distance) - parseFloat(b.distance);
        case "price":
          return a.priceRange.length - b.priceRange.length;
        case "reviews":
          return b.reviews - a.reviews;
        default:
          return 0;
      }
    });

  const getCategoryColor = (category: string) => {
    switch(category) {
      case "mens-hair": return "text-mens-primary";
      case "womens-beauty": return "text-womens-primary";
      case "nail-studios": return "text-nails-primary";
      case "makeup-artists": return "text-makeup-primary";
      default: return "text-primary";
    }
  };

  const getCategoryLink = (store: any) => {
    switch(store.category) {
      case "mens-hair": return `/salon/${store.id}`;
      case "womens-beauty": return `/womens-beauty/salon/${store.id}`;
      case "nail-studios": return `/nail-studios/salon/${store.id}`;
      case "makeup-artists": return `/makeup-artists/salon/${store.id}`;
      default: return `/salon/${store.id}`;
    }
  };

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4 lg:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            {title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            {description}
            {location && (
              <span className="block mt-2 text-primary font-medium">
                <MapPin className="w-4 h-4 inline mr-1" />
                Near {location.city || "your location"}
              </span>
            )}
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white border rounded-xl p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search stores, services, or areas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              {categoryFilter === "all" && (
                <Select value={categoryState} onValueChange={setCategoryState}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="distance">Nearest</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="reviews">Most Reviews</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="₹">₹ Budget</SelectItem>
                  <SelectItem value="₹₹">₹₹ Moderate</SelectItem>
                  <SelectItem value="₹₹₹">₹₹₹ Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            Found {filteredStores.length} store{filteredStores.length !== 1 ? 's' : ''} matching your criteria
          </div>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <Link key={store.id} to={getCategoryLink(store)}>
              <Card className="overflow-hidden hover:shadow-soft transition-colors duration-200 cursor-pointer group h-full border">
                <div className="relative h-48">
                  <img 
                    src={store.image} 
                    alt={store.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1">
                    <Badge className="bg-white/90 text-primary font-semibold text-xs">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {store.rating}
                    </Badge>
                    {store.isTopRated && (
                      <Badge className="bg-yellow-500 text-black text-xs">
                        <Award className="w-3 h-3 mr-1" />
                        Top Rated
                      </Badge>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 text-white">
                    <h3 className="text-lg font-bold">{store.name}</h3>
                    <div className="flex items-center gap-2 text-sm opacity-90">
                      <span>{store.priceRange}</span>
                      <span>•</span>
                      <span>{store.distance}</span>
                      {store.isVerified && (
                        <>
                          <span>•</span>
                          <Verified className="w-3 h-3" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-1">
                      <span className={`font-medium ${getCategoryColor(store.category)}`}>
                        {store.rating}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({store.reviews} reviews)
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {categories.find(c => c.value === store.category)?.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center mb-3 text-muted-foreground text-sm">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{store.address}</span>
                  </div>

                  <div className="flex items-center mb-3 text-muted-foreground text-sm">
                    <Phone className="w-4 h-4 mr-1" />
                    <span>{store.phone}</span>
                  </div>

                  <div className="flex items-center mb-3 text-muted-foreground text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{store.openHours}</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {store.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {store.specialties.slice(0, 2).map((specialty, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                    {store.specialties.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{store.specialties.length - 2} more
                      </Badge>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full group-hover:scale-105 transition-transform"
                    size="sm"
                  >
                    View Details & Book
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredStores.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No stores found matching your criteria.</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setPriceFilter("all");
                setCategoryState("all");
              }}
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default AllStores;
