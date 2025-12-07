# Shipping & Tracking Feature Documentation

## Overview

This document describes the DHL-like shipping and tracking feature implemented for Loadify Market. The feature provides comprehensive shipment management, status tracking, and proof of delivery capabilities for sellers, buyers, and administrators.

## Table of Contents

1. [Database Changes](#database-changes)
2. [Environment Variables](#environment-variables)
3. [API Endpoints](#api-endpoints)
4. [Frontend Pages](#frontend-pages)
5. [Migration Guide](#migration-guide)
6. [Testing Guide](#testing-guide)
7. [Storage Configuration](#storage-configuration)

---

## Database Changes

### New Tables

#### `shipments`
Stores shipment information for each order.

**Columns:**
- `id` (UUID, PK): Unique shipment identifier
- `order_id` (UUID, UNIQUE, FK): Reference to orders table
- `seller_id` (UUID, FK): Reference to seller user
- `buyer_id` (UUID, FK): Reference to buyer user
- `courier_name` (TEXT): Name of courier/delivery service
- `tracking_number` (TEXT): Tracking number from courier
- `status` (TEXT): Current shipment status (see valid statuses below)
- `proof_of_delivery_url` (TEXT): URL to proof of delivery document/image
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Valid Status Values:**
- `Pending` - Order received, shipment not yet created
- `Processing` - Shipment being prepared
- `Dispatched` - Package handed to courier
- `In Transit` - Package in transit
- `Out for Delivery` - Package out for delivery
- `Delivered` - Package delivered
- `Returned` - Package returned to sender
- `Delivery Failed` - Delivery attempt failed

#### `shipment_events`
Tracks the history of status changes for each shipment.

**Columns:**
- `id` (UUID, PK): Unique event identifier
- `shipment_id` (UUID, FK): Reference to shipments table
- `status` (TEXT): Status at the time of event
- `message` (TEXT): Optional message/note about the event
- `changed_by` (UUID, FK): User who made the change (optional)
- `created_at` (TIMESTAMP): Event timestamp

### Modified Tables

#### `orders`
Added shipping-related columns:
- `shipping_method` (TEXT): Selected shipping method (e.g., "standard", "express", "pallet")
- `shipping_cost` (DECIMAL): Cost of shipping

### Indexes

- `idx_shipments_order`: Index on `shipments.order_id`
- `idx_shipments_seller`: Index on `shipments.seller_id`
- `idx_shipments_buyer`: Index on `shipments.buyer_id`
- `idx_shipment_events_shipment`: Index on `shipment_events.shipment_id`

### Triggers

- `update_shipments_updated_at`: Automatically updates `updated_at` timestamp on shipments table

---

## Environment Variables

Add these variables to your `.env` file:

```bash
# Supabase Storage
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_BUCKET_NAME=proof-of-delivery

# SendGrid Email Templates (optional)
SENDGRID_TEMPLATE_ORDER_SHIPPED=your_template_id
SENDGRID_TEMPLATE_ORDER_DELIVERED=your_template_id
SENDGRID_TEMPLATE_ORDER_OUT_FOR_DELIVERY=your_template_id
```

### Required Variables:
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for backend operations
- `SUPABASE_BUCKET_NAME`: Name of the Supabase storage bucket for proof of delivery files

### Optional Variables:
- `SENDGRID_TEMPLATE_*`: SendGrid template IDs for email notifications. If not set, generic email templates will be used.

---

## API Endpoints

All endpoints are Netlify serverless functions located in `/netlify/functions/`.

### 1. Create/Update Shipment
**Endpoint:** `POST /.netlify/functions/shipments-create`

**Authentication:** Required (Seller only)

**Request Body:**
```json
{
  "order_id": "uuid",
  "courier_name": "DHL",
  "tracking_number": "1234567890",
  "shipping_method": "express",
  "shipping_cost": 12.00
}
```

**Response:**
```json
{
  "success": true,
  "shipment": {
    "id": "uuid",
    "order_id": "uuid",
    "status": "Pending",
    "courier_name": "DHL",
    "tracking_number": "1234567890",
    ...
  }
}
```

### 2. Update Shipment Status
**Endpoint:** `PUT /.netlify/functions/shipments-update-status/{shipment_id}`

**Authentication:** Required (Seller or Admin)

**Request Body:**
```json
{
  "status": "Dispatched",
  "message": "Package handed to courier"
}
```

**Response:**
```json
{
  "success": true,
  "shipment": { ... }
}
```

**Side Effects:**
- Creates a new shipment event
- Sends email notification to buyer for certain statuses (`Dispatched`, `Out for Delivery`, `Delivered`)

### 3. Upload Proof of Delivery
**Endpoint:** `POST /.netlify/functions/shipments-upload-proof`

**Authentication:** Required (Seller or Admin)

**Request Body:**
```json
{
  "shipment_id": "uuid",
  "file_name": "proof.jpg",
  "content_type": "image/jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "upload_url": "signed_url",
  "file_path": "shipments/uuid/timestamp-proof.jpg",
  "token": "upload_token"
}
```

**Workflow:**
1. Call this endpoint to get a signed upload URL
2. Upload the file directly to the signed URL
3. Call the confirm endpoint with the file path

### 4. Confirm Proof of Delivery Upload
**Endpoint:** `POST /.netlify/functions/shipments-confirm-proof`

**Authentication:** Required (Seller or Admin)

**Request Body:**
```json
{
  "shipment_id": "uuid",
  "file_path": "shipments/uuid/timestamp-proof.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "shipment": { ... },
  "proof_url": "public_url"
}
```

### 5. Track Shipment (Public)
**Endpoint:** `GET /.netlify/functions/shipments-track?orderNumber=ORD-123&email=buyer@email.com`

**Authentication:** Not required (Public endpoint)

**Query Parameters:**
- `orderNumber` (required): Order number to track
- `email` (optional): Buyer email for verification

**Response:**
```json
{
  "order": {
    "orderNumber": "ORD-123",
    "createdAt": "2024-01-01T00:00:00Z",
    "total": 100.00,
    "status": "paid",
    "items": [...],
    "seller": { ... }
  },
  "shipment": {
    "id": "uuid",
    "status": "In Transit",
    "courier_name": "DHL",
    "tracking_number": "1234567890",
    "proof_of_delivery_url": null,
    ...
  },
  "shipment_events": [
    {
      "id": "uuid",
      "status": "Dispatched",
      "message": "Package handed to courier",
      "created_at": "2024-01-01T10:00:00Z"
    },
    ...
  ],
  "state": "shipped"
}
```

**Possible States:**
- `being_prepared`: No shipment created yet
- `shipped`: Shipment exists
- `not_found`: Order not found

---

## Frontend Pages

### 1. Public Track Order Page
**Route:** `/track-order`

**Description:** Public-facing page where anyone can track an order by entering the order number and optionally their email.

**Features:**
- Order summary display
- Current shipment status
- Courier and tracking information
- Visual timeline of shipment events
- Proof of delivery link (if available)

### 2. Seller Shipments Page
**Route:** `/seller/shipments`

**Description:** Seller dashboard for managing shipments for their orders.

**Features:**
- List of all seller's orders
- Current shipment status for each order
- "Manage" button to open shipment form modal

### 3. Seller Shipment Form (Modal Component)
**Component:** `SellerShipmentForm`

**Features:**
- Create or update shipment details
- Set courier name and tracking number
- Select shipping method and cost
- Update shipment status
- Upload proof of delivery
- View shipment event timeline

### 4. Admin Shipments Page
**Route:** `/admin/shipments`

**Description:** Admin dashboard for viewing and managing all shipments.

**Features:**
- View all shipments across all sellers
- Filter by status
- Quick status update
- View proof of delivery
- Access to order and buyer information

### 5. Updated Checkout Page
**Route:** `/checkout`

**New Features:**
- Three shipping options:
  - Standard Delivery (£5.00, 3-5 business days)
  - Express Delivery (£12.00, 1-2 business days)
  - Pallet Delivery (£50.00, 5-7 business days)
- Selected shipping cost included in total

---

## Migration Guide

### Running the Migration

The migration is in `database-migrations.sql`. Run this file in your Supabase SQL editor.

**Steps:**

1. **Backup your database** before running any migrations

2. **Run the migration SQL:**
   - Open Supabase dashboard
   - Go to SQL Editor
   - Copy the contents of `database-migrations.sql`
   - Execute the SQL

3. **Verify the migration:**
   ```sql
   -- Check if tables were created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('shipments', 'shipment_events');

   -- Check if columns were added to orders
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'orders' 
   AND column_name IN ('shipping_method', 'shipping_cost');
   ```

### Data Migration

The migration automatically migrates existing data:

**What gets migrated:**
- Orders with `trackingNumber` or `proofOfDelivery` will have shipment records created
- Order status is mapped to shipment status:
  - `shipped` → `Dispatched`
  - `delivered` → `Delivered`
  - Others → `Pending`
- Initial shipment event created with message "Migrated from orders table"

**What is NOT changed:**
- Original `orders.trackingNumber` and `orders.proofOfDelivery` columns are kept for backward compatibility

### Enabling Row Level Security (RLS)

The migration includes commented-out RLS policies. To enable them:

1. Uncomment the RLS policy statements at the end of `database-migrations.sql`
2. Run them in Supabase SQL editor
3. Test that authenticated users can only access their own shipments

**Note:** The backend functions use the service role key to bypass RLS, so enabling RLS only affects direct database access.

---

## Testing Guide

### 1. Test Order Creation with Shipping

**Steps:**
1. Go to `/checkout`
2. Select a shipping option (e.g., Express - £12.00)
3. Fill in address details
4. Complete checkout
5. Verify order created with `shipping_method` and `shipping_cost`

### 2. Test Shipment Creation (Seller)

**Steps:**
1. Log in as a seller
2. Go to `/seller/shipments`
3. Click "Manage" on an order
4. Fill in:
   - Courier name: "DHL"
   - Tracking number: "TEST123456"
   - Shipping method: "Express"
   - Shipping cost: 12.00
5. Click "Create Shipment"
6. Verify shipment created and initial event recorded

### 3. Test Status Updates

**Steps:**
1. In the shipment form, select status "Dispatched"
2. Add message: "Package picked up by courier"
3. Click "Update Status"
4. Verify:
   - Status updated in database
   - Event created
   - Email sent to buyer (check email inbox or logs)

### 4. Test Proof of Delivery Upload

**Prerequisites:** 
- Create a storage bucket named `proof-of-delivery` in Supabase
- Make it public or configure appropriate policies

**Steps:**
1. In shipment form, click "Upload Proof"
2. Select an image file
3. Verify:
   - File uploaded to Supabase Storage
   - `proof_of_delivery_url` updated in shipments table
   - Event created: "Proof of delivery uploaded"

### 5. Test Public Tracking

**Steps:**
1. Go to `/track-order`
2. Enter order number (e.g., "ORD-123456")
3. Optionally enter buyer email
4. Click "Track Order"
5. Verify:
   - Order summary displayed
   - Current shipment status shown
   - Timeline of events displayed
   - Proof of delivery link (if available)

### 6. Test Admin Management

**Steps:**
1. Log in as admin
2. Go to `/admin/shipments`
3. Apply status filters
4. Click status update icon on a shipment
5. Change status and save
6. Verify status updated

### Testing Checklist

- [ ] Create order with shipping options
- [ ] Create shipment as seller
- [ ] Update shipment status
- [ ] Upload proof of delivery
- [ ] Track order publicly
- [ ] Filter shipments as admin
- [ ] Update shipment as admin
- [ ] Verify email notifications sent
- [ ] Check shipment events timeline
- [ ] Verify RLS policies (if enabled)

---

## Storage Configuration

### Supabase Storage Setup

1. **Create Storage Bucket:**
   - Go to Supabase Dashboard → Storage
   - Create new bucket named `proof-of-delivery`
   - Set it to public or configure RLS policies

2. **Bucket Policies (if private):**
   ```sql
   -- Allow authenticated sellers to upload
   CREATE POLICY "Sellers can upload proof"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'proof-of-delivery' 
     AND auth.role() = 'authenticated'
   );

   -- Allow public read access
   CREATE POLICY "Public can view proof"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'proof-of-delivery');
   ```

3. **File Types:**
   - Accepted: Images (JPEG, PNG, GIF), PDFs
   - Max size: Configure in Supabase settings (default 50MB)

4. **File Naming:**
   - Format: `shipments/{shipment_id}/{timestamp}-{filename}`
   - Example: `shipments/abc-123/1704067200000-proof.jpg`

---

## Email Notifications

### Triggered Emails

Emails are automatically sent when shipment status changes to:
- `Dispatched` - Order shipped notification
- `Out for Delivery` - Out for delivery notification  
- `Delivered` - Order delivered notification

### Email Templates

If SendGrid template IDs are configured in environment variables, those templates will be used. Otherwise, the system falls back to the generic templates in `send-email.ts`.

**Template Variables:**
- `customerName`: Buyer's first name
- `orderNumber`: Order number
- `courier_name`: Name of courier
- `tracking_number`: Tracking number
- `tracking_url`: Tracking URL (constructed or from courier)
- `status`: Current shipment status

### Customizing Emails

To customize email templates:

1. **Using SendGrid Templates:**
   - Create templates in SendGrid
   - Add template IDs to `.env`
   - Use the template variables listed above

2. **Modifying Generic Templates:**
   - Edit `netlify/functions/send-email.ts`
   - Update the HTML in the `generateEmailHTML` function

---

## Troubleshooting

### Common Issues

1. **"Shipment not found" error:**
   - Ensure order exists and user is authenticated
   - Check order_id is correct UUID

2. **Upload fails:**
   - Verify `SUPABASE_BUCKET_NAME` is set correctly
   - Check bucket exists in Supabase Storage
   - Verify storage policies allow uploads

3. **Email not received:**
   - Check SendGrid API key is valid
   - Verify email address is correct
   - Check spam folder
   - Review logs in Netlify function logs

4. **RLS errors:**
   - If RLS is enabled, ensure service role key is set
   - Backend functions should use admin client (service role)
   - Frontend uses anon key with RLS

5. **Status update fails:**
   - Verify status is one of the valid values
   - Check user has permission (seller or admin)
   - Review shipment_id is correct

### Debug Mode

Enable debug logging by checking Netlify function logs:
- Go to Netlify Dashboard → Functions
- Click on a function to view logs
- Look for console.log and console.error outputs

---

## Future Enhancements

Potential improvements:
- Real-time tracking updates via webhooks from courier APIs
- SMS notifications for status changes
- Multiple parcels per order
- Return shipments tracking
- Automated tracking number validation
- Integration with specific courier APIs (DHL, Royal Mail, etc.)
- Estimated delivery date calculation
- Delivery time slot selection
- Signature capture on delivery
- Geolocation tracking

---

## Support

For issues or questions:
- Check this documentation first
- Review the code comments in the implementation files
- Check Netlify function logs for errors
- Verify environment variables are set correctly
- Ensure database migration ran successfully

---

**Last Updated:** December 2024
**Version:** 1.0.0
