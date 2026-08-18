import { handler } from '../functions/admin-orders';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
