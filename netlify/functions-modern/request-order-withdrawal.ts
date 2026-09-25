import { handler } from '../functions/request-order-withdrawal';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
