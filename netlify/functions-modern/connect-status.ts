import { handler } from '../functions/connect-status';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
