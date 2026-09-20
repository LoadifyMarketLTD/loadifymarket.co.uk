import { handler } from '../functions/admin-supplier-order-runtime';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
