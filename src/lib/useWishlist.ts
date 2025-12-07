import { useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuthStore } from '../store';

export function useWishlist() {
  const { user } = useAuthStore();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkWishlist = useCallback(async (productId: string) => {
    if (!user) {
      setIsInWishlist(false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('productIds')
        .eq('userId', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const productIds = data?.productIds || [];
      const inWishlist = productIds.includes(productId);
      setIsInWishlist(inWishlist);
      return inWishlist;
    } catch (error) {
      console.error('Error checking wishlist:', error);
      return false;
    }
  }, [user]);

  const toggleWishlist = useCallback(async (productId: string) => {
    if (!user) {
      alert('Please login to add items to your wishlist');
      return false;
    }

    setLoading(true);
    try {
      // Get current wishlist
      const { data: wishlistData } = await supabase
        .from('wishlists')
        .select('productIds')
        .eq('userId', user.id)
        .single();

      const currentProductIds = wishlistData?.productIds || [];
      let updatedProductIds: string[];
      let wasAdded: boolean;

      if (currentProductIds.includes(productId)) {
        // Remove from wishlist
        updatedProductIds = currentProductIds.filter((id: string) => id !== productId);
        wasAdded = false;
      } else {
        // Add to wishlist
        updatedProductIds = [...currentProductIds, productId];
        wasAdded = true;
      }

      // Update wishlist
      const { error } = await supabase
        .from('wishlists')
        .upsert({
          userId: user.id,
          productIds: updatedProductIds,
        });

      if (error) throw error;

      setIsInWishlist(wasAdded);
      return wasAdded;
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      alert('Failed to update wishlist');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    isInWishlist,
    loading,
    checkWishlist,
    toggleWishlist,
  };
}
