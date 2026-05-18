import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MakeOfferSheet from "@/components/MakeOfferSheet";

const mockToast = vi.fn();
const mockAuthorizedFetch = vi.fn();
const mockTrackOfferCreated = vi.fn();

vi.mock("@/store", () => ({
  useAuthStore: () => ({
    user: { id: "buyer-1" },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

vi.mock("@/lib/authorizedFetch", () => ({
  authorizedFetch: (...args: unknown[]) => mockAuthorizedFetch(...args),
}));

vi.mock("@/lib/analytics", () => ({
  trackOfferCreated: (...args: unknown[]) => mockTrackOfferCreated(...args),
}));

describe("MakeOfferSheet", () => {
  beforeEach(() => {
    mockToast.mockReset();
    mockAuthorizedFetch.mockReset();
    mockTrackOfferCreated.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a success state, toast, and auto-closes after a successful offer", async () => {
    vi.useFakeTimers();
    mockAuthorizedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ offerId: "offer-1" }),
    });

    const onOpenChange = vi.fn();
    const onSent = vi.fn();

    render(
      <MakeOfferSheet
        open
        onOpenChange={onOpenChange}
        conversationId="conversation-1"
        receiverId="seller-1"
        productTitle="Steel bolts"
        onSent={onSent}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "12.34" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Offer" }));

    await act(async () => {
      await Promise.resolve();
    });

    const successButton = screen.getByRole("button", { name: /offer sent/i });

    expect(successButton).toBeDisabled();
    expect(successButton.className).toContain("bg-emerald-600");
    expect(mockAuthorizedFetch).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({ title: "Your offer has been sent successfully." });
    expect(mockTrackOfferCreated).toHaveBeenCalledWith({ conversationId: "conversation-1", amountPence: 1234 });
    expect(onSent).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(2400);
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect((screen.getByPlaceholderText("0.00") as HTMLInputElement).value).toBe("");
  });

  it("restores the normal button state and shows an error toast when submission fails", async () => {
    mockAuthorizedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Request failed" }),
    });

    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <MakeOfferSheet
        open
        onOpenChange={onOpenChange}
        conversationId="conversation-1"
        receiverId="seller-1"
      />,
    );

    await user.type(screen.getByPlaceholderText("0.00"), "10");
    await user.click(screen.getByRole("button", { name: "Send Offer" }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Failed to send offer",
        description: "Request failed",
        variant: "destructive",
      });
    });

    expect(screen.getByRole("button", { name: "Send Offer" })).toBeEnabled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows a conflict-specific toast when the API returns 409", async () => {
    mockAuthorizedFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "There is already a pending offer in this conversation." }),
    });

    const user = userEvent.setup();

    render(
      <MakeOfferSheet
        open
        onOpenChange={vi.fn()}
        conversationId="conversation-1"
        receiverId="seller-1"
      />,
    );

    await user.type(screen.getByPlaceholderText("0.00"), "10");
    await user.click(screen.getByRole("button", { name: "Send Offer" }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Offer already pending",
        description: "There is already a pending offer in this conversation.",
        variant: "destructive",
      });
    });

    expect(screen.getByRole("button", { name: "Send Offer" })).toBeEnabled();
  });

  it("blocks repeated clicks while the offer request is in flight", async () => {
    mockAuthorizedFetch.mockImplementation(() => new Promise(() => undefined));

    const user = userEvent.setup();

    render(
      <MakeOfferSheet
        open
        onOpenChange={vi.fn()}
        conversationId="conversation-1"
        receiverId="seller-1"
      />,
    );

    await user.type(screen.getByPlaceholderText("0.00"), "10");
    const sendButton = screen.getByRole("button", { name: "Send Offer" });

    fireEvent.click(sendButton);
    fireEvent.click(sendButton);

    expect(mockAuthorizedFetch).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: /sending/i })).toBeDisabled();
  });
});
