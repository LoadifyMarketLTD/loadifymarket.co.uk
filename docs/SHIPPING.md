# Shipping & Tracking Feature Documentation

## Overview

This document describes the DHL-like shipping and tracking feature implementation for Loadify Market. The feature provides comprehensive shipment management for sellers, tracking capabilities for buyers, and administrative oversight.

## Database Changes

### New Tables

#### `shipments`
Stores shipment information for orders.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Unique shipment identifier
- `order_id` (UUID, NOT NULL) - References orders table
- `seller_id` (UUID, NOT NULL) - References users table
- `buyer_id` (UUID, NOT NULL) - References users table
- `courier_name` (TEXT) - Name of courier service (e.g., DHL, Royal Mail, DPD)
- `tracking_number` (TEXT) - AWB/tracking number
- `status` (TEXT, NOT NULL) - Current shipment status (default: 'Pending')
  - Valid values: 'Pending', 'Processing', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered', 'Returned', 'Delivery Failed'
- `proof_of_delivery_url` (TEXT) - URL to proof of delivery image
- `created_at` (TIMESTAMP WITH TIME ZONE) - Creation timestamp
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Last update timestamp

**Indexes:**
- `idx_shipments_order_id` on `order_id`
- `idx_shipments_seller_id` on `seller_id`
- `idx_shipments_buyer_id` on `buyer_id`

#### `shipment_events`
Stores the history of status changes and events for shipments.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Unique event identifier
- `shipment_id` (UUID, NOT NULL) - References shipments table
- `status` (TEXT, NOT NULL) - Status at this event
- `message` (TEXT) - Optional message/note about the event
- `changed_by` (UUID) - References users table (who made the change)
- `created_at` (TIMESTAMP WITH TIME ZONE) - Event timestamp

**Indexes:**
- `idx_shipment_events_shipment_id` on `shipment_id`

### Modified Tables

#### `orders`
Added shipping-related columns:
- `shipping_method` (TEXT) - Selected shipping method (e.g., 'Standard', 'Express', 'Pallet')
- `shipping_cost` (DECIMAL(10,2)) - Cost of shipping (default: 0)

### Data Migration

Existing orders with `trackingNumber` or `proofOfDelivery` are automatically migrated to the new shipments table:
- Creates shipment records with appropriate status mapping
- Inserts initial shipment_event with message 'Migrated from orders table'
- Original columns preserved for backward compatibility

### Row Level Security (RLS)

RLS policies are included in the migration file as SQL comments. When enabled:
- **Buyers**: Can view shipments for their orders
- **Sellers**: Can view, insert, and update their shipments
- **Admins**: Full access to all shipments and events

## API Endpoints

All endpoints are implemented as Netlify serverless functions.

### POST `/.netlify/functions/create-shipment`

Creates or updates a shipment for an order.

**Authentication:** Required (seller or admin)

**Request Body:**
```json
{
  "order_id": "uuid",
  "courier_name": "DHL",
  "tracking_number": "ABC123456789",
  "shipping_method": "Express",
  "shipping_cost": 12.00
}
```

**Response:**
```json
{
  "success": true,
  "shipment": { ... },
  "message": "Shipment created"
}
```

### PUT `/.netlify/functions/update-shipment-status/:shipmentId/status`

Updates the status of a shipment and creates a status event.

**Authentication:** Required (seller or admin)

**Request Body:**
```json
{
  "status": "Dispatched",
  "message": "Package handed over to courier"
}
```

**Response:**
```json
{
  "success": true,
  "shipment": { ... },
  "message": "Status updated successfully"
}
```

**Email Notifications:**
Automatically sends email notifications for these statuses:
- `Dispatched` - Order shipped notification
- `Out for Delivery` - Out for delivery notification
- `Delivered` - Delivery confirmation

### POST `/.netlify/functions/upload-proof-of-delivery/:shipmentId/proof`

Generates a signed upload URL for proof of delivery.

**Authentication:** Required (seller or admin)

**Response:**
```json
{
  "success": true,
  "uploadUrl": "https://...",
  "path": "shipment-id/file.jpg",
  "token": "..."
}
```

### PUT `/.netlify/functions/upload-proof-of-delivery/:shipmentId/proof`

Confirms the upload and saves the public URL.

**Request Body:**
```json
{
  "filePath": "shipment-id/file.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "shipment": { ... },
  "message": "Proof of delivery uploaded successfully"
}
```

### GET `/.netlify/functions/track-shipment`

Public endpoint for tracking shipments.

**Query Parameters:**
- `orderNumber` (required if order_id not provided) - Order number to track
- `order_id` (required if orderNumber not provided) - Order UUID
- `email` (optional) - Buyer email for verification

**Response:**
```json
{
  "order": {
    "orderNumber": "ORD-...",
    "createdAt": "2024-01-01T00:00:00Z",
    "total": 100.00,
    "status": "shipped",
    "product": { "title": "...", "image": "..." },
    "seller": { "name": "..." }
  },
  "shipment": {
    "id": "uuid",
    "status": "In Transit",
    "courier_name": "DHL",
    "tracking_number": "ABC123",
    "proof_of_delivery_url": null,
    "created_at": "...",
    "updated_at": "..."
  },
  "events": [
    {
      "id": "uuid",
      "status": "Dispatched",
      "message": "Package dispatched",
      "created_at": "..."
    }
  ],
  "state": "tracked"
}
```

## Frontend Routes

### `/track-order` - Public Tracking Page
- Search for orders by order number
- Optional email verification
- View order summary, shipment status, and event timeline
- Shows "being prepared" state if no shipment exists

### `/seller/shipments` - Seller Shipments Management
- List all shipments for seller's orders
- Create shipments for orders without tracking
- Update shipment details (courier, tracking number)
- Update shipment status
- Upload proof of delivery

### `/admin/shipments` - Admin Shipments Overview
- View all shipments across the platform
- Filter by status
- Search by order number, tracking number, or courier
- Override shipment status
- View proof of delivery
- Statistics dashboard

## Frontend Components

### `SellerShipmentForm`
Modal form component for managing shipments:
- Create/update shipment details
- Update status with optional message
- Upload proof of delivery via drag-and-drop

## Checkout Integration

### Shipping Options
Three shipping methods available at checkout:
- **Standard** - £5.00 (3-5 business days)
- **Express** - £12.00 (1-2 business days)
- **Pallet** - £50.00 (For large/pallet orders)

Shipping cost is included in VAT calculation and added to order total.

## Environment Variables

Required environment variables (add to `.env`):

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# SendGrid (for email notifications)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_TEMPLATE_ID_SHIPPED=optional_template_id
SENDGRID_TEMPLATE_ID_OUT_FOR_DELIVERY=optional_template_id
SENDGRID_TEMPLATE_ID_DELIVERED=optional_template_id

# Supabase Storage
SUPABASE_BUCKET_NAME=proof-of-delivery

# App URLs
VITE_APP_URL=https://loadifymarket.co.uk
URL=https://loadifymarket.co.uk
```

## Supabase Storage Setup

1. Create a storage bucket named `proof-of-delivery` (or use custom name in env)
2. Configure bucket policies:
   - Allow authenticated sellers to upload
   - Allow public read access for proof of delivery images

## Migration Notes

### Running Migrations

Execute the migration SQL file against your Supabase database:

```bash
psql -h your-db-host -U postgres -d your-db-name -f database-migrations.sql
```

Or use Supabase Dashboard SQL Editor to run the migrations.

### Data Migration

The migration automatically:
1. Creates new tables and indexes
2. Migrates existing tracking data from orders table
3. Preserves backward compatibility by keeping original columns

### Enabling RLS

After migration, review and uncomment the RLS policies in the migration file, then apply them:

```sql
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;

-- Apply policies (uncomment in migration file)
```

## Usage Examples

### Seller Workflow

1. Navigate to `/seller/shipments`
2. Find order without shipment and click "Create Shipment"
3. Enter courier name and tracking number
4. Click "Create Shipment"
5. Update status as shipment progresses
6. Upload proof of delivery when delivered

### Buyer Workflow

1. Navigate to `/track-order`
2. Enter order number (optionally email)
3. View shipment status and timeline
4. Check tracking events history

### Admin Workflow

1. Navigate to `/admin/shipments`
2. View all shipments with statistics
3. Filter by status or search
4. Override status if needed
5. View proof of delivery documents

## TypeScript Types

All types are exported from `src/types/shipping.ts`:

```typescript
import { ShipmentStatus, Shipment, ShipmentEvent } from './types/shipping';
```

## Testing

### Manual Testing Steps

1. **Create Order**: Complete checkout with shipping method selection
2. **Create Shipment**: As seller, create shipment for the order
3. **Update Status**: Change status and verify email notification sent
4. **Track Order**: As buyer, track order on public page
5. **Upload Proof**: Upload proof of delivery image
6. **Admin View**: Verify shipment appears in admin dashboard

### Test Scenarios

- Order without shipment shows "being prepared"
- Status updates trigger email notifications
- Proof of delivery upload and display
- Admin status override functionality
- Search and filter functionality

## Troubleshooting

### Email Notifications Not Sending

- Verify `SENDGRID_API_KEY` is set correctly
- Check SendGrid account status
- Review logs in Netlify functions
- Ensure `send-email` function is deployed

### Storage Upload Failing

- Verify `SUPABASE_BUCKET_NAME` matches actual bucket
- Check bucket exists and has correct policies
- Verify service role key has storage permissions

### Authentication Issues

- Ensure user tokens are being passed correctly
- Check Supabase auth configuration
- Verify RLS policies if enabled

## Future Enhancements

Potential improvements:
- Integration with courier APIs for real-time tracking
- Automatic tracking number validation
- SMS notifications for status updates
- Delivery address validation
- Multi-parcel shipments
- Returns tracking integration
- Label printing functionality

## Support

For issues or questions:
- Email: loadifymarket.co.uk@gmail.com
- Review server logs in Netlify dashboard
- Check Supabase logs for database errors
