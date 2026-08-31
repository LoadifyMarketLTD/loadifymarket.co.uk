import { handler } from '../functions/customer-order-assistant';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
