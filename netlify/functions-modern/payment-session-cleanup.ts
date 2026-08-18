import { handler } from '../functions/payment-session-cleanup';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
