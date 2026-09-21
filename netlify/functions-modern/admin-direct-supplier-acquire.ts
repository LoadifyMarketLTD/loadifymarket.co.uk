import { handler } from '../functions/admin-direct-supplier-acquire';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
