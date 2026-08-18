import { handler } from '../functions/health';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
