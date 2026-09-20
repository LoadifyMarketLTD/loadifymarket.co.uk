import { handler } from '../functions/create-supplier-payment-intent';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
