import { handler } from '../functions/admin-supplier-publication-gate';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
