import { handler } from '../functions/push-token';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
