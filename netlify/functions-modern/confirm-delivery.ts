import { handler } from '../functions/confirm-delivery';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
