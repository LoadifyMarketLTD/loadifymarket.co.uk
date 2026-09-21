import { handler } from '../functions/admin-supplier-acquisition-preflight';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
