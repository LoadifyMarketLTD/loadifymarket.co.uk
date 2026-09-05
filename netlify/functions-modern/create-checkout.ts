import { handler } from '../functions/create-checkout';
import { withMarketplaceTaxEvidenceRepair } from '../functions/_shared/marketplaceTaxEvidenceRepair';
import { withLambda } from '../function-runtime/lambdaCompat';
import { installPostgrestCatchCompat } from '../function-runtime/postgrestCatchCompat';

installPostgrestCatchCompat();

export default withLambda(withMarketplaceTaxEvidenceRepair(handler));
