import { handler } from '../functions/admin-first-supplier-launch-gate';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
