import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInfo from "@/components/product/ProductInfo";
import SellerCard from "@/components/product/SellerCard";
import ProductReviews from "@/components/product/ProductReviews";
import ProductCard from "@/components/catalog/ProductCard";
import { mockProducts } from "@/data/mockProducts";

// Simulated extra images per product using other category images
import homeImg from "@/assets/categories/home.jpg";
import mixedPalletsImg from "@/assets/categories/mixed-pallets.jpg";
import overstockImg from "@/assets/categories/overstock.jpg";

const ProductDetail = () => {
  const { id } = useParams();
  const product = mockProducts.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Product Not Found</h1>
          <Link to="/catalog" className="text-primary hover:underline mt-4 inline-block">
            ← Back to Catalog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Simulate multiple images
  const galleryImages = [product.image, homeImg, mixedPalletsImg, overstockImg];

  // Related products (same category, different id)
  const related = mockProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  // If not enough related, fill with random
  const relatedProducts =
    related.length >= 3
      ? related
      : [...related, ...mockProducts.filter((p) => p.id !== product.id).slice(0, 3 - related.length)];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <BreadcrumbNav
            items={[
              { label: "Home", to: "/" },
              { label: "Catalog", to: "/catalog" },
              { label: product.category, to: "/catalog" },
              { label: product.title },
            ]}
            showBack={true}
            backLabel="Back to Catalog"
            backTo="/catalog"
          />

          {/* Main content */}
          <div className="grid lg:grid-cols-[1fr_420px] gap-8">
            {/* Left: Gallery + Description */}
            <div className="space-y-8">
              <ProductGallery images={galleryImages} title={product.title} />

              {/* Description */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h2 className="font-display text-lg font-semibold text-foreground">Description</h2>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                  <p>
                    This {product.condition.toLowerCase()} condition lot includes {product.unitCount}{" "}
                    {product.unitCount === 1 ? "lot" : "lots"} of {product.category.toLowerCase()} items.
                    Located in {product.location}, available for collection or delivery UK-wide.
                  </p>
                  <p>
                    All items have been sourced from reputable UK retailers and brands. Ideal for
                    resellers, market traders, online sellers, and wholesale buyers looking for
                    quality stock at below-retail prices.
                  </p>
                  <h3 className="font-display text-sm font-semibold text-foreground pt-2">What's Included</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Mixed brands and product types within {product.subcategory}</li>
                    <li>Detailed manifest available upon request</li>
                    <li>Condition: {product.condition}</li>
                    <li>All items are UK sourced with full traceability</li>
                  </ul>
                  <h3 className="font-display text-sm font-semibold text-foreground pt-2">Shipping & Collection</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Collection available from {product.location}</li>
                    <li>UK mainland delivery available (quote on request)</li>
                    <li>Items are securely packaged and ready for transport</li>
                  </ul>
                </div>
              </div>

              {/* Reviews */}
              <ProductReviews
                productRating={product.rating ?? 0}
                reviewCount={product.reviewCount ?? 0}
              />
            </div>

            {/* Right: Info + Seller */}
            <div className="space-y-6">
              <div className="lg:sticky lg:top-24 space-y-6">
                <div className="bg-card rounded-xl border border-border p-6">
                  <ProductInfo
                    product={product}
                    title={product.title}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    category={product.category}
                    subcategory={product.subcategory}
                    condition={product.condition}
                    location={product.location}
                    unitCount={product.unitCount}
                    views={product.views}
                    listed={product.listed}
                  />
                </div>

                <SellerCard
                  name={product.seller}
                  verified={product.sellerVerified}
                  rating={product.rating}
                  location={product.location}
                  totalListings={Math.floor(Math.random() * 20) + 5}
                />
              </div>
            </div>
          </div>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-xl font-bold text-foreground mb-6">Similar Listings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {relatedProducts.map((p) => (
                  <Link key={p.id} to={`/product/${p.id}`}>
                    <ProductCard product={p} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
