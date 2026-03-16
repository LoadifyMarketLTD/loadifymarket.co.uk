import { describe, it, expect } from 'vitest';
import { hasAdminAccess, hasSellerAccess } from '../roleUtils';
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
  it('returns true for admin role', () => {
    expect(hasAdminAccess(makeUser('admin'))).toBe(true);
  });

  it('returns true for owner role', () => {
    expect(hasAdminAccess(makeUser('owner'))).toBe(true);
  });

  it('returns false for buyer role', () => {
    expect(hasAdminAccess(makeUser('buyer'))).toBe(false);
  });

  it('returns false for seller role', () => {
    expect(hasAdminAccess(makeUser('seller'))).toBe(false);
  });

  it('returns false for guest role', () => {
    expect(hasAdminAccess(makeUser('guest'))).toBe(false);
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

  it('returns true for admin role', () => {
    expect(hasSellerAccess(makeUser('admin'))).toBe(true);
  });

  it('returns true for owner role', () => {
    expect(hasSellerAccess(makeUser('owner'))).toBe(true);
  });

  it('returns false for buyer role', () => {
    expect(hasSellerAccess(makeUser('buyer'))).toBe(false);
  });

  it('returns false for guest role', () => {
    expect(hasSellerAccess(makeUser('guest'))).toBe(false);
  });

  it('returns false for null user', () => {
    expect(hasSellerAccess(null)).toBe(false);
  });

  it('returns false for undefined user', () => {
    expect(hasSellerAccess(undefined)).toBe(false);
  });
});
