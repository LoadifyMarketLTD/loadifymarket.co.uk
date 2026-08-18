import { handler } from '../functions/stripe-webhook';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
