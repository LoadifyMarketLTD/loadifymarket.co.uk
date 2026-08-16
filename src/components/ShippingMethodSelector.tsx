import { useState, useEffect } from 'react';
import { Truck, Package, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ShippingMethod } from '../types/shipping';

interface ShippingMethodSelectorProps {
  /** IDs of currently selected shipping methods */
  selectedMethodIds: string[];
  /** Called whenever the selection changes */
  onChange: (selectedIds: string[]) => void;
}

function getValidRates(method: ShippingMethod): number[] {
  return (method.shipping_rates ?? [])
    .map((rate) => Number(rate.price))
    .filter((price) => Number.isFinite(price) && price >= 0);
}

export default function ShippingMethodSelector({
  selectedMethodIds,
  onChange,
}: ShippingMethodSelectorProps) {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const { data, error } = await supabase
          .from('shipping_methods')
          .select('*, shipping_rates(*)')
          .eq('active', true)
          .order('name', { ascending: true });

        if (error) throw error;
        setMethods((data || []).filter((method) => getValidRates(method).length > 0));
      } catch (err) {
        console.error('Error fetching shipping methods:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMethods();
  }, []);

  const toggle = (id: string) => {
    if (selectedMethodIds.includes(id)) {
      onChange(selectedMethodIds.filter((m) => m !== id));
    } else {
      onChange([...selectedMethodIds, id]);
    }
  };

  if (loading) {
    return <div className="text-gray-500 text-sm py-2">Loading shipping options…</div>;
  }

  if (methods.length === 0) {
    return <div className="text-gray-500 text-sm py-2">No shipping methods available.</div>;
  }

  return (
    <div className="space-y-2">
      {methods.map((method) => {
        const isSelected = selectedMethodIds.includes(method.id);
        const price = Math.min(...getValidRates(method));

        return (
          <button
            key={method.id}
            type="button"
            onClick={() => toggle(method.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
              isSelected
                ? 'border-success bg-success/10 text-elevated'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {/* Checkbox indicator */}
            <span className="flex-shrink-0">
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-success" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </span>

            {/* Method icon */}
            <span className="flex-shrink-0">
              {method.tracking ? (
                <Truck className="w-5 h-5 text-gray-500" />
              ) : (
                <Package className="w-5 h-5 text-gray-500" />
              )}
            </span>

            {/* Details */}
            <span className="flex-1 min-w-0">
              <span className="block font-medium text-sm">{method.name}</span>
              {method.courier && (
                <span className="block text-xs text-gray-500">{method.courier}</span>
              )}
            </span>

            {/* Price badge */}
            <span
              className={`flex-shrink-0 text-sm font-semibold ${
                isSelected ? 'text-success' : 'text-gray-600'
              }`}
            >
              £{price.toFixed(2)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
