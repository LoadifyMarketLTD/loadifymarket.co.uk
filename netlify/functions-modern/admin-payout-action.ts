import { handler } from '../functions/admin-payout-action';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
