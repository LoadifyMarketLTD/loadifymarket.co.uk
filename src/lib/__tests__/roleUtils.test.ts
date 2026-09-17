import { describe, it, expect } from 'vitest';
import { hasAdminAccess, hasBuyerAccess, hasSellerAccess, isActiveSellerAccess } from '../roleUtils';
import type { User } from '../../types';

function makeUser(role: User['role']): User {
  return {
    id: 'test-id',
    email: 'test@example.com',
    role,
    isEmailVerified: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

describe('hasAdminAccess', () => {
  it('returns true for admin role with trusted isAdmin flag', () => {
    expect(hasAdminAccess({ ...makeUser('admin'), isAdmin: true })).toBe(true);
  });

  it('returns false for admin role without trusted isAdmin flag', () => {
    expect(hasAdminAccess(makeUser('admin'))).toBe(false);
  });

  it('returns false for buyer role', () => {
    expect(hasAdminAccess(makeUser('buyer'))).toBe(false);
  });

  it('returns false for seller role', () => {
    expect(hasAdminAccess(makeUser('seller'))).toBe(false);
  });

  it('returns false for null user', () => {
    expect(hasAdminAccess(null)).toBe(false);
  });

  it('returns false for undefined user', () => {
    expect(hasAdminAccess(undefined)).toBe(false);
  });
});

describe('hasSellerAccess', () => {
  it('returns true for seller role', () => {
    expect(hasSellerAccess(makeUser('seller'))).toBe(true);
  });

  it('returns false for admin role (admin uses hasAdminAccess instead)', () => {
    expect(hasSellerAccess(makeUser('admin'))).toBe(false);
  });

  it('returns false for buyer role', () => {
    expect(hasSellerAccess(makeUser('buyer'))).toBe(false);
  });

  it('returns false for null user', () => {
    expect(hasSellerAccess(null)).toBe(false);
  });

  it('returns false for undefined user', () => {
    expect(hasSellerAccess(undefined)).toBe(false);
  });
});


describe('marketplace capability boundaries', () => {
  it('keeps buyer access for ordinary sellers', () => {
    expect(hasBuyerAccess(makeUser('buyer'))).toBe(true);
    expect(hasBuyerAccess(makeUser('seller'))).toBe(true);
  });

  it('lets trusted admins use their own buyer activity without granting seller access', () => {
    const admin = { ...makeUser('admin'), isAdmin: true };
    expect(hasBuyerAccess(admin)).toBe(true);
    expect(hasSellerAccess(admin)).toBe(false);
  });

  it('requires active account and active seller lifecycle for full seller access', () => {
    expect(isActiveSellerAccess({ ...makeUser('seller'), sellerStatus: 'active' })).toBe(true);
    expect(isActiveSellerAccess({ ...makeUser('seller'), sellerStatus: 'draft' })).toBe(false);
    expect(isActiveSellerAccess({ ...makeUser('seller'), sellerStatus: 'suspended' })).toBe(false);
    expect(isActiveSellerAccess({ ...makeUser('seller'), isActive: false, sellerStatus: 'active' })).toBe(false);
  });

  it('honours explicit capability projections over legacy roles', () => {
    expect(hasBuyerAccess({ ...makeUser('seller'), capabilities: ['seller'] })).toBe(false);
    expect(hasSellerAccess({ ...makeUser('buyer'), capabilities: ['buyer', 'seller'] })).toBe(true);
  });
});
