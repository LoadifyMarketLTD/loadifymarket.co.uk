import { handler } from '../functions/resend-verification';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
