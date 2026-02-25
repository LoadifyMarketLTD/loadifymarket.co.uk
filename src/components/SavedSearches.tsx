import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { Bell, BellOff, Trash2, Search, Plus } from 'lucide-react';

interface SavedSearch {
  id: string;
  searchQuery: string;
  filters: Record<string, unknown>;
  emailNotifications: boolean;
  notificationFrequency: 'instant' | 'daily' | 'weekly';
  createdAt: string;
}

export default function SavedSearches() {
  const { user } = useAuthStore();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuery, setNewQuery] = useState('');
  const [frequency, setFrequency] = useState<'instant' | 'daily' | 'weekly'>('daily');

  const fetchSavedSearches = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setSearches(data || []);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSavedSearches();
    }
  }, [fetchSavedSearches, user]);

  const handleAddSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newQuery.trim()) return;

    try {
      const { error } = await supabase.from('saved_searches').insert({
        userId: user.id,
        searchQuery: newQuery.trim(),
        filters: {},
        emailNotifications: true,
        notificationFrequency: frequency,
      });

      if (error) throw error;

      setNewQuery('');
      setShowAddForm(false);
      fetchSavedSearches();
    } catch (error) {
      console.error('Error adding saved search:', error);
      alert('Failed to save search. Please try again.');
    }
  };

  const handleToggleNotifications = async (searchId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ emailNotifications: !currentValue })
        .eq('id', searchId);

      if (error) throw error;
      fetchSavedSearches();
    } catch (error) {
      console.error('Error toggling notifications:', error);
    }
  };

  const handleDeleteSearch = async (searchId: string) => {
    if (!confirm('Are you sure you want to delete this saved search?')) return;

    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);

      if (error) throw error;
      fetchSavedSearches();
    } catch (error) {
      console.error('Error deleting search:', error);
    }
  };

  const handleUpdateFrequency = async (searchId: string, newFrequency: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ notificationFrequency: newFrequency })
        .eq('id', searchId);

      if (error) throw error;
      fetchSavedSearches();
    } catch (error) {
      console.error('Error updating frequency:', error);
    }
  };

  if (!user) {
    return (
      <div className="card text-center py-12">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 mb-4">Sign in to save searches and get notifications</p>
        <a href="/login" className="btn-primary">
          Sign In
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Saved Searches</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Search
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSearch} className="card bg-blue-50">
          <h3 className="font-semibold mb-4">Save a New Search</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Search Query
              </label>
              <input
                type="text"
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                className="input-field"
                placeholder="e.g., laptop clearance"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Email Notification Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'instant' | 'daily' | 'weekly')}
                className="input-field"
              >
                <option value="instant">Instant (when new items match)</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewQuery('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Search
              </button>
            </div>
          </div>
        </form>
      )}

      {searches.length === 0 ? (
        <div className="card text-center py-12">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">
            You haven't saved any searches yet
          </p>
          <p className="text-sm text-gray-500">
            Save searches to get notified when new items match your criteria
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {searches.map((search) => (
            <div key={search.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Search className="w-5 h-5 text-navy-800" />
                    <h3 className="font-semibold text-lg">{search.searchQuery}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      Created{' '}
                      {new Date(search.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      {search.emailNotifications ? (
                        <>
                          <Bell className="w-4 h-4" />
                          Notifications: {search.notificationFrequency}
                        </>
                      ) : (
                        <>
                          <BellOff className="w-4 h-4" />
                          Notifications off
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleToggleNotifications(
                        search.id,
                        search.emailNotifications
                      )
                    }
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title={
                      search.emailNotifications
                        ? 'Disable notifications'
                        : 'Enable notifications'
                    }
                  >
                    {search.emailNotifications ? (
                      <Bell className="w-5 h-5 text-blue-600" />
                    ) : (
                      <BellOff className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {search.emailNotifications && (
                    <select
                      value={search.notificationFrequency}
                      onChange={(e) =>
                        handleUpdateFrequency(search.id, e.target.value)
                      }
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="instant">Instant</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  )}
                  <button
                    onClick={() => handleDeleteSearch(search.id)}
                    className="p-2 hover:bg-red-50 rounded transition-colors"
                    title="Delete search"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
