import { describe, it, expect } from 'vitest';
import { getDisplayName } from '../displayName';
import type { User } from '../../types';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'user@example.com',
    role: 'buyer',
    isEmailVerified: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getDisplayName', () => {
  it('returns "Account" when user is null', () => {
    expect(getDisplayName(null)).toBe('Account');
  });

  it('returns "Loadify Market Admin" for admin role', () => {
    expect(getDisplayName(makeUser({ role: 'admin' }))).toBe('Loadify Market Admin');
  });

  it('returns "Loadify Market Admin" for owner role', () => {
    expect(getDisplayName(makeUser({ role: 'owner' }))).toBe('Loadify Market Admin');
  });

  it('prefers storeName over businessName', () => {
    const profile = { storeName: 'My Store', businessName: 'My Business' };
    expect(getDisplayName(makeUser({ role: 'seller' }), profile)).toBe('My Store');
  });

  it('falls back to businessName when storeName is absent', () => {
    const profile = { storeName: null, businessName: 'My Business' };
    expect(getDisplayName(makeUser({ role: 'seller' }), profile)).toBe('My Business');
  });

  it('falls back to firstName + lastName when no profile info', () => {
    const user = makeUser({ firstName: 'Jane', lastName: 'Doe' });
    expect(getDisplayName(user)).toBe('Jane Doe');
  });

  it('returns "Account" when all name sources are empty', () => {
    expect(getDisplayName(makeUser())).toBe('Account');
  });

  it('trims whitespace from first/last name parts', () => {
    const user = makeUser({ firstName: '  Alice  ', lastName: '  Smith  ' });
    expect(getDisplayName(user)).toBe('Alice Smith');
  });
});
