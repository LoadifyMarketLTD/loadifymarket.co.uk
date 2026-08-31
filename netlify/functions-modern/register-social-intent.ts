import { handler } from '../functions/register-social-intent';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
