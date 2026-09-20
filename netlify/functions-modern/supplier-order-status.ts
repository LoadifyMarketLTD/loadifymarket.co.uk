import { handler } from '../functions/supplier-order-status';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
