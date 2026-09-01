import { handler } from '../functions/admin-customer-operations-exceptions';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
