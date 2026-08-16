import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'ProductFormPage.tsx'), 'utf8');

describe('ProductFormPage edit lifecycle contract', () => {
  it('preserves the publication state when a seller saves an existing listing', () => {
    expect(source).toContain('const [existingIsActive, setExistingIsActive] = useState(false);');
    expect(source).toContain('const saveProduct = async (publishMode: boolean, preservePublicationState = false)');
    expect(source).toContain("...(!id || !preservePublicationState ? { isActive: publishMode } : {}),");
    expect(source).toContain("if (id && user?.role !== 'admin')");
    expect(source).toContain('saveProduct(false, true);');
  });

  it('keeps explicit publication separate for an unlocked seller draft', () => {
    expect(source).toContain('const handlePublishExisting = () =>');
    expect(source).toContain("id && user.role !== 'admin' && !existingIsActive && existingIsApproved && !hasActiveOrders");
    expect(source).toContain("'Publish Listing'");
  });

  it('preserves the locked-fields path for seller listings with order activity', () => {
    expect(source).toContain('if (id && hasActiveOrders && !isAdmin)');
    expect(source).not.toContain('if (id && hasActiveOrders && !isAdmin && !publishMode)');
  });

  it('surfaces moderation hold to sellers and does not offer publish while held', () => {
    expect(source).toContain("id && user.role !== 'admin' && !existingIsApproved");
    expect(source).toContain('This listing is on moderation hold');
    expect(source).toContain("id && user.role !== 'admin' && !existingIsActive && existingIsApproved && !hasActiveOrders");
  });

  it('requires positive stock only for physical publication and returns seller workflows to Products', () => {
    expect(source).toContain('else if (publishMode && stockQuantity <= 0)');
    expect(source).toContain('Add at least 1 unit of stock before publishing this product.');
    expect(source).toContain("navigate(user.role === 'admin' ? '/seller' : '/seller/products')");
    expect(source).not.toContain("setTimeout(() => navigate('/seller'), SUCCESS_REDIRECT_DELAY_MS)");
  });
});
