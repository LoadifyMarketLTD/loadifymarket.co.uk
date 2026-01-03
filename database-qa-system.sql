-- Migration: Add Product Q&A System
-- Date: 2026-01-03
-- Description: Add product_questions table and notifications for Q&A feature

-- Create product_questions table
CREATE TABLE IF NOT EXISTS product_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  answer_user_name TEXT,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answered_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT question_not_empty CHECK (length(trim(question)) > 0),
  CONSTRAINT answer_not_empty CHECK (answer IS NULL OR length(trim(answer)) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_product_questions_product_id ON product_questions(product_id);
CREATE INDEX idx_product_questions_user_id ON product_questions(user_id);
CREATE INDEX idx_product_questions_upvotes ON product_questions(upvotes DESC);
CREATE INDEX idx_product_questions_created_at ON product_questions(created_at DESC);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;

-- Add RLS policies for product_questions
ALTER TABLE product_questions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read questions
CREATE POLICY "Anyone can view product questions"
  ON product_questions FOR SELECT
  USING (true);

-- Allow authenticated users to create questions
CREATE POLICY "Authenticated users can create questions"
  ON product_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow question owner to update their questions
CREATE POLICY "Users can update their own questions"
  ON product_questions FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow sellers to update answers
CREATE POLICY "Sellers can answer questions on their products"
  ON product_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_questions.product_id
      AND products.seller_id = auth.uid()
    )
  );

-- Add RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Function to notify seller of new question
CREATE OR REPLACE FUNCTION notify_seller_of_question()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    p.seller_id,
    'product_question',
    'New Product Question',
    'Someone asked: "' || LEFT(NEW.question, 50) || '..."',
    '/product/' || NEW.product_id
  FROM products p
  WHERE p.id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for question notifications
DROP TRIGGER IF EXISTS trigger_notify_seller_question ON product_questions;
CREATE TRIGGER trigger_notify_seller_question
  AFTER INSERT ON product_questions
  FOR EACH ROW
  EXECUTE FUNCTION notify_seller_of_question();

-- Function to notify question asker of answer
CREATE OR REPLACE FUNCTION notify_user_of_answer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.answer IS NOT NULL AND OLD.answer IS NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'question_answered',
      'Your Question Was Answered',
      'A seller answered your question: "' || LEFT(NEW.question, 50) || '..."',
      '/product/' || NEW.product_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for answer notifications
DROP TRIGGER IF EXISTS trigger_notify_answer ON product_questions;
CREATE TRIGGER trigger_notify_answer
  AFTER UPDATE ON product_questions
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_of_answer();

COMMENT ON TABLE product_questions IS 'Stores customer questions and answers for products';
COMMENT ON COLUMN product_questions.upvotes IS 'Number of times this question has been upvoted as helpful';
COMMENT ON TABLE notifications IS 'Stores user notifications for various events';
