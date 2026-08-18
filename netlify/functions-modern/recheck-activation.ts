import { handler } from '../functions/recheck-activation';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
