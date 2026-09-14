import { handler } from '../functions/seller-bank-payout';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
