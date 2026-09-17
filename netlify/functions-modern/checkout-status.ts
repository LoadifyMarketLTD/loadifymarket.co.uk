import { handler } from '../functions/checkout-status';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
