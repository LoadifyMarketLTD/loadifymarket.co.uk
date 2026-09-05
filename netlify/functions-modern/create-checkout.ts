import { handler } from '../functions/create-checkout';
import { withMarketplaceTaxEvidenceRepair } from '../functions/_shared/marketplaceTaxEvidenceRepair';
import { ensureJsonContentType } from '../function-runtime/jsonContentTypeCompat';
import { withLambda } from '../function-runtime/lambdaCompat';
import { installPostgrestCatchCompat } from '../function-runtime/postgrestCatchCompat';

installPostgrestCatchCompat();

const checkoutHandler = withLambda(withMarketplaceTaxEvidenceRepair(handler));

export default async (request: Request, context: { requestId?: string }): Promise<Response> => {
  const response = await checkoutHandler(request, context);
  return ensureJsonContentType(response);
};
