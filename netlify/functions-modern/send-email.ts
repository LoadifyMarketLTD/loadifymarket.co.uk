import { handler } from '../functions/send-email';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
