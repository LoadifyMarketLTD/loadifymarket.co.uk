import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function handler(event) {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Supabase configuration is missing' })
        };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch the price from the database
    const { data, error } = await supabase
        .from('products')
        .select('id, price, sellerId')
        .eq('id', event.body.id);

    if (error || !data || data.length === 0) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Database price validation failed' })
        };
    }

    const price = data[0].price;
    // Continue with the rest of the function using 'price'

    // ... (rest of the handler code) ...
}