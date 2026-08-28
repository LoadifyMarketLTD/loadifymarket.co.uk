import { handler } from '../functions/register-intent';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
