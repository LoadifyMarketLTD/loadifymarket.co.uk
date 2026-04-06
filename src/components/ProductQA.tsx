import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { MessageCircle, ThumbsUp, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProductQuestion {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  question: string;
  answer?: string;
  answerUserId?: string;
  answerUserName?: string;
  upvotes: number;
  createdAt: string;
  answeredAt?: string;
}

interface ProductQAProps {
  productId: string;
  sellerId: string;
}

export default function ProductQA({ productId, sellerId }: ProductQAProps) {
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAskForm, setShowAskForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_questions')
        .select('*')
        .eq('productId', productId)
        .order('upvotes', { ascending: false })
        .order('createdAt', { ascending: false })
        .limit(10);

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newQuestion.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('product_questions').insert({
        productId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        question: newQuestion.trim(),
        upvotes: 0,
      });

      if (error) throw error;

      // Notify seller about new question
      await supabase.from('notifications').insert({
        userId: sellerId,
        type: 'product_question',
        title: 'New Product Question',
        message: `Someone asked: "${newQuestion.trim()}"`,
        link: `/seller/products/${productId}`,
      });

      setNewQuestion('');
      setShowAskForm(false);
      fetchQuestions();
    } catch (error) {
      console.error('Error posting question:', error);
      alert('Failed to post question. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (questionId: string, currentUpvotes: number) => {
    if (!user) {
      alert('Please sign in to upvote questions');
      return;
    }

    try {
      const { error } = await supabase
        .from('product_questions')
        .update({ upvotes: currentUpvotes + 1 })
        .eq('id', questionId);

      if (error) throw error;
      fetchQuestions();
    } catch (error) {
      console.error('Error upvoting question:', error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-navy-800" />
          <h2 className="text-2xl font-bold">Customer Questions & Answers</h2>
        </div>
        {user && !showAskForm && (
          <button
            onClick={() => setShowAskForm(true)}
            className="btn-secondary"
          >
            Ask a Question
          </button>
        )}
      </div>

      {showAskForm && (
        <form onSubmit={handleAskQuestion} className="card bg-gray-50">
          <label className="block text-sm font-medium mb-2">
            Your Question
          </label>
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="input-field resize-none"
            rows={3}
            placeholder="Ask something about this product..."
            required
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-500">
              {newQuestion.length}/500 characters
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAskForm(false);
                  setNewQuestion('');
                }}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center gap-2"
                disabled={submitting || !newQuestion.trim()}
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Posting...' : 'Post Question'}
              </button>
            </div>
          </div>
        </form>
      )}

      {!user && !showAskForm && (
        <div className="card bg-purple-50 border-purple-200">
          <p className="text-sm text-blue-800">
            <a href="/login" className="font-medium underline">
              Sign in
            </a>{' '}
            to ask a question about this product.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="card text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">
              No questions yet. Be the first to ask!
            </p>
          </div>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="card">
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => handleUpvote(q.id, q.upvotes)}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    disabled={!user}
                    title={user ? 'Upvote this question' : 'Sign in to upvote'}
                  >
                    <ThumbsUp className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    {q.upvotes}
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">{q.userName}</span>
                      <span className="text-xs text-gray-500">
                        asked{' '}
                        {formatDistanceToNow(new Date(q.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-gray-900">{q.question}</p>
                  </div>

                  {q.answer && (
                    <div className="pl-4 border-l-2 border-green-500">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm text-green-700">
                          {q.answerUserName || 'Seller'}
                        </span>
                        <span className="text-xs text-gray-500">
                          answered{' '}
                          {q.answeredAt &&
                            formatDistanceToNow(new Date(q.answeredAt), {
                              addSuffix: true,
                            })}
                        </span>
                      </div>
                      <p className="text-gray-700">{q.answer}</p>
                    </div>
                  )}

                  {!q.answer && user?.id === sellerId && (
                    <button className="text-sm text-navy-800 font-medium hover:underline">
                      Answer this question
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {questions.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Showing {questions.length} most helpful question
            {questions.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
