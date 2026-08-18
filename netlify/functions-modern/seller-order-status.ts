import { handler } from '../functions/seller-order-status';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
