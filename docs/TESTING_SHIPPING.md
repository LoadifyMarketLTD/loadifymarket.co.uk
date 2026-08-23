# Testing Guide: Shipping & Tracking Feature

## Quick Test Scenarios

### Scenario 1: Complete Order Flow with Shipping

**Steps:**
1. Navigate to catalog and add product to cart
2. Go to checkout
3. Fill in shipping address
4. Select shipping method (Standard, Express, or Pallet)
5. Complete payment via Stripe
6. Verify order created with shipping_method and shipping_cost

**Expected Results:**
- Shipping options displayed with prices
- Selected shipping method saved to order
- Shipping cost included in total
- VAT calculated on subtotal + shipping

### Scenario 2: Seller Creates Shipment

**Prerequisites:** Order exists without shipment

**Steps:**
1. Log in as seller
2. Navigate to `/seller/shipments`
3. Find order in "Orders Pending Shipment" section
4. Click "Create Shipment"
5. Enter courier name (e.g., "DHL")
6. Enter tracking number (e.g., "ABC123456789")
7. Click "Create Shipment"

**Expected Results:**
- Shipment created successfully
- Moves to "Active Shipments" section
- Initial status: "Pending"
- Shipment event created with message "Shipment created"

### Scenario 3: Update Shipment Status

**Prerequisites:** Shipment exists

**Steps:**
1. As seller, navigate to `/seller/shipments`
2. Click "Manage" on an active shipment
3. In "Update Status" section, select "Dispatched"
4. Add message: "Package handed over to courier"
5. Click "Update Status"

**Expected Results:**
- Status updated to "Dispatched"
- Email sent to buyer with tracking information
- Shipment event created with status and message
- Order status updated to "shipped"

### Scenario 4: Upload Proof of Delivery

**Prerequisites:** Shipment exists

**Steps:**
1. As seller, navigate to shipment management
2. Click "Manage" on shipment
3. Scroll to "Proof of Delivery" section
4. Upload image file (JPG/PNG)
5. Wait for upload confirmation

**Expected Results:**
- File uploaded to Supabase Storage
- proof_of_delivery_url saved
- Shipment event created: "Proof of delivery uploaded"
- Link displayed to view uploaded proof

### Scenario 5: Public Order Tracking

**Prerequisites:** Order with shipment exists

**Steps:**
1. Navigate to `/track-order` (no login required)
2. Enter order number (e.g., "ORD-1234567890-ABC")
3. Optionally enter email for verification
4. Click "Track Order"

**Expected Results:**
- Order summary displayed
- Current shipment status shown
- Courier name and tracking number visible
- Event timeline displayed in chronological order
- If no shipment: "Your order is being prepared" message

### Scenario 6: Admin Shipment Management

**Prerequisites:** Admin account, shipments exist

**Steps:**
1. Log in as admin
2. Navigate to `/admin/shipments`
3. View shipment statistics
4. Search/filter shipments
5. Change status via dropdown
6. Click proof of delivery link

**Expected Results:**
- All shipments visible across platform
- Statistics show counts by status
- Filter and search work correctly
- Status override updates shipment
- Proof of delivery opens in new tab

## Email Testing

### Test Email Notifications

**Statuses that trigger emails:**
1. Dispatched
2. Out for Delivery
3. Delivered

**Test Steps:**
1. Update shipment to "Dispatched"
2. Check buyer's email inbox
3. Verify email contains:
   - Order number
   - Courier name
   - Tracking number
   - Link to tracking page

**Email Providers to Test:**
- Gmail
- Outlook
- Yahoo
- Apple Mail

## API Endpoint Testing

### Using cURL

#### Create Shipment
```bash
curl -X POST https://your-site.com/.netlify/functions/create-shipment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "order_id": "ORDER_UUID",
    "courier_name": "DHL",
    "tracking_number": "ABC123456789"
  }'
```

#### Update Status
```bash
curl -X PUT https://your-site.com/.netlify/functions/update-shipment-status/SHIPMENT_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "Dispatched",
    "message": "Package dispatched"
  }'
```

#### Track Shipment (Public)
```bash
curl "https://your-site.com/.netlify/functions/track-shipment?orderNumber=ORD-123"
```

## Database Testing

### Verify Tables Created
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('shipments', 'shipment_events');
```

### Verify Indexes Created
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('shipments', 'shipment_events');
```

### Check Data Migration
```sql
-- Count migrated shipments
SELECT COUNT(*) 
FROM shipments 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- Verify events created for migrated shipments
SELECT s.id, COUNT(e.id) as event_count
FROM shipments s
LEFT JOIN shipment_events e ON e.shipment_id = s.id
GROUP BY s.id;
```

## Storage Testing

### Test Supabase Storage

1. **Verify Bucket Exists:**
   - Go to Supabase Dashboard → Storage
   - Check for "proof-of-delivery" bucket

2. **Test Upload:**
   - Use seller interface to upload PoD
   - Verify file appears in bucket

3. **Test Public Access:**
   - Click proof of delivery link
   - Verify image loads in browser

## Performance Testing

### Load Testing
- Create 100 shipments
- Update statuses concurrently
- Measure response times
- Check database query performance

### Expected Performance:
- Shipment creation: < 500ms
- Status update: < 1000ms (includes email)
- Track endpoint: < 300ms
- Page load: < 2s

## Security Testing

### Authentication Tests
1. Access protected endpoints without token → 401
2. Access with buyer token (non-seller) → 403
3. Access other seller's shipment → 403
4. Admin can access all shipments → 200

### Authorization Tests
1. Seller can only see their shipments
2. Buyer can only see their shipments (if RLS enabled)
3. Admin can see all shipments

### Input Validation Tests
1. Invalid status value → 400
2. Missing required fields → 400
3. Invalid order_id → 404
4. SQL injection attempts → Sanitized

## Edge Cases

### Test Edge Cases

1. **Order with no shipment:**
   - Track order → Shows "being prepared"

2. **Shipment with no events:**
   - Should show at least one initial event

3. **Multiple status updates:**
   - Create events for each update
   - Timeline shows all events

4. **Upload large file:**
   - Test file size limits
   - Verify error handling

5. **Concurrent updates:**
   - Two sellers update simultaneously
   - Verify no data corruption

6. **Email delivery failure:**
   - Mock SendGrid failure
   - Verify status still updates

## Accessibility Testing

### Test with Screen Readers
- Navigate tracking page
- Navigate seller shipments page
- Verify ARIA labels on icons
- Check form labels

### Keyboard Navigation
- Tab through forms
- Submit with Enter key
- Close modals with Escape

## Browser Compatibility

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

## Responsive Design

Test breakpoints:
- Mobile (320px - 767px)
- Tablet (768px - 1023px)
- Desktop (1024px+)

## Regression Testing

Ensure these still work:
- ✅ Existing order creation
- ✅ Existing tracking page
- ✅ Seller dashboard
- ✅ Admin dashboard
- ✅ Checkout flow

## Monitoring

### Metrics to Monitor

1. **API Response Times:**
   - create-shipment: target < 500ms
   - update-shipment-status: target < 1000ms
   - track-shipment: target < 300ms

2. **Error Rates:**
   - Target: < 1% error rate
   - Monitor 4xx and 5xx responses

3. **Email Delivery:**
   - Track SendGrid delivery rates
   - Monitor bounces and spam reports

4. **Storage Usage:**
   - Monitor PoD storage growth
   - Set up alerts for quota limits

## Production Deployment Checklist

Before going live:

- [ ] All tests passing
- [ ] Database migration successful
- [ ] Supabase Storage bucket configured
- [ ] Environment variables set
- [ ] SendGrid templates configured (or generic fallback tested)
- [ ] RLS policies enabled and tested
- [ ] Error monitoring enabled
- [ ] Email delivery tested with real addresses
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Accessibility audit passed
- [ ] Browser compatibility verified
- [ ] Mobile responsiveness verified
- [ ] Backup and rollback plan ready

## Rollback Plan

If issues occur:

1. **Database rollback:**
   ```sql
   DROP TABLE IF EXISTS shipment_events;
   DROP TABLE IF EXISTS shipments;
   ALTER TABLE orders DROP COLUMN IF EXISTS shipping_method;
   ALTER TABLE orders DROP COLUMN IF EXISTS shipping_cost;
   ```

2. **Code rollback:**
   - Revert to previous commit
   - Redeploy Netlify functions
   - Clear CDN cache

3. **Data recovery:**
   - Original tracking data still in orders table
   - No data loss during rollback

## Support Scenarios

### Common Issues and Solutions

**Issue: Email not received**
- Check SendGrid logs
- Verify email address
- Check spam folder
- Verify SendGrid API key

**Issue: Upload fails**
- Check file size (max 10MB)
- Verify bucket exists
- Check bucket permissions
- Verify service role key

**Issue: Tracking not found**
- Verify order number correct
- Check database for shipment record
- Verify migration completed

**Issue: Unauthorized error**
- Check auth token valid
- Verify user role
- Check RLS policies

## Success Criteria

Feature is successful when:

✅ All test scenarios pass
✅ Email delivery rate > 95%
✅ API response times within targets
✅ Zero critical bugs
✅ Accessibility score > 95%
✅ User feedback positive
✅ No performance degradation on existing features
