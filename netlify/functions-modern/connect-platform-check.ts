import { handler } from '../functions/connect-platform-check';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
