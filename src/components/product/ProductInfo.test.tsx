import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import ProductInfo from "@/components/product/ProductInfo";

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    addToCart: vi.fn(),
  }),
}));

vi.mock("@/store", () => ({
  useAuthStore: () => ({
    user: null,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null }),
        }),
      }),
    }),
  },
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const product = {
  id: "product-1",
  title: "Test Listing",
  image: "https://example.com/image.jpg",
  price: 125,
  category: "Electronics",
  subcategory: "Laptops",
  condition: "New" as const,
  location: "London",
  seller: "Seller Ltd",
  sellerVerified: true,
  unitCount: 2,
  rating: 4.5,
  views: 10,
  listed: "today",
};

function renderProductInfo(props: Partial<ComponentProps<typeof ProductInfo>> = {}) {
  return render(
    <MemoryRouter>
      <ProductInfo
        title={product.title}
        category={product.category}
        subcategory={product.subcategory}
        condition={product.condition}
        location={product.location}
        unitCount={product.unitCount}
        views={product.views}
        listed={product.listed}
        product={product}
        sellerId="seller-1"
        onShareFacebook={vi.fn()}
        onShareWhatsApp={vi.fn()}
        onCopyLink={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("ProductInfo contact CTAs", () => {
  it("renders desktop Message and Offer buttons and triggers their handlers", async () => {
    const user = userEvent.setup();
    const onMessageSeller = vi.fn();
    const onMakeOffer = vi.fn();

    renderProductInfo({ onMessageSeller, onMakeOffer });

    await user.click(screen.getByRole("button", { name: "Message" }));
    await user.click(screen.getByRole("button", { name: "Offer" }));

    expect(onMessageSeller).toHaveBeenCalledTimes(1);
    expect(onMakeOffer).toHaveBeenCalledTimes(1);
  });

  it("shows loading labels while message or offer actions are pending", () => {
    const { rerender } = render(
      <MemoryRouter>
        <ProductInfo
          title={product.title}
          category={product.category}
          subcategory={product.subcategory}
          condition={product.condition}
          location={product.location}
          unitCount={product.unitCount}
          views={product.views}
          listed={product.listed}
          product={product}
          sellerId="seller-1"
          onShareFacebook={vi.fn()}
          onShareWhatsApp={vi.fn()}
          onCopyLink={vi.fn()}
          onMessageSeller={vi.fn()}
          onMakeOffer={vi.fn()}
          contactActionLoading="message"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /opening/i })).toBeDisabled();

    rerender(
      <MemoryRouter>
        <ProductInfo
          title={product.title}
          category={product.category}
          subcategory={product.subcategory}
          condition={product.condition}
          location={product.location}
          unitCount={product.unitCount}
          views={product.views}
          listed={product.listed}
          product={product}
          sellerId="seller-1"
          onShareFacebook={vi.fn()}
          onShareWhatsApp={vi.fn()}
          onCopyLink={vi.fn()}
          onMessageSeller={vi.fn()}
          onMakeOffer={vi.fn()}
          contactActionLoading="offer"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /preparing/i })).toBeDisabled();
  });
});
