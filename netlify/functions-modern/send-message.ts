import { handler } from '../functions/send-message';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
