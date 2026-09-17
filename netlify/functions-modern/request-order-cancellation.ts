import { handler } from '../functions/request-order-cancellation';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
