import { handler } from '../functions/admin-supplier-acquisition-control';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
