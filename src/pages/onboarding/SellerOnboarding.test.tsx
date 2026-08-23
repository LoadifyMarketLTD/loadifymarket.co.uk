import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authorizedFetch: vi.fn(),
  toast: vi.fn(),
  openExternalUrl: vi.fn(),
}));

const sellerUser = {
  id: 'seller-1',
  role: 'seller',
  isActive: true,
  isAdmin: false,
  sellerStatus: 'draft',
};

vi.mock('@/store', () => ({
  useAuthStore: () => ({ user: sellerUser }),
}));

vi.mock('@/lib/authorizedFetch', () => ({
  authorizedFetch: mocks.authorizedFetch,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: mocks.toast,
}));

vi.mock('@/lib/capacitorUtils', () => ({
  openExternalUrl: mocks.openExternalUrl,
}));

import SellerOnboarding from './SellerOnboarding';

const healthyStatus = {
  sellerType: null,
  sellerStatus: 'draft',
  requiresAdminApproval: false,
  isApproved: false,
  profileComplete: false,
  store: {
    storeName: '',
    storeSlug: '',
    storeDescription: '',
  },
  productCount: 0,
  stripe: {
    connected: false,
    status: null,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
  },
  onboardingCompleted: false,
  onboardingStep: 1,
  readiness: {
    sellerTypeReady: false,
    profileReady: false,
    storeReady: false,
    catalogueReady: false,
    setupComplete: false,
    stripeReady: false,
    adminReviewPending: false,
    sellerActive: false,
    nextStep: 1,
  },
};

function successfulStatusResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => healthyStatus,
  } as Response;
}

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <SellerOnboarding />
    </MemoryRouter>,
  );
}

describe('SellerOnboarding initial-load recovery', () => {
  beforeEach(() => {
    mocks.authorizedFetch.mockReset();
    mocks.toast.mockReset();
    mocks.openExternalUrl.mockReset();
  });

  it('replaces the initial spinner with an actionable error state when loading fails', async () => {
    mocks.authorizedFetch.mockRejectedValueOnce(
      new Error('Request timed out. Please try again.'),
    );

    renderOnboarding();

    expect(
      await screen.findByRole('heading', { name: 'Seller setup unavailable' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Request timed out. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry seller setup/i })).toBeEnabled();
  });

  it('recovers from the error state when Retry succeeds', async () => {
    const user = userEvent.setup();
    mocks.authorizedFetch
      .mockRejectedValueOnce(new Error('Temporary network failure'))
      .mockResolvedValueOnce(successfulStatusResponse());

    renderOnboarding();

    await screen.findByRole('heading', { name: 'Seller setup unavailable' });
    await user.click(screen.getByRole('button', { name: /retry seller setup/i }));

    expect(
      await screen.findByRole('heading', { name: 'Seller setup & activation' }),
    ).toBeInTheDocument();
    expect(mocks.authorizedFetch).toHaveBeenCalledTimes(2);
  });
});