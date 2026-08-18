import { handler } from '../functions/create-payment-intent';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
