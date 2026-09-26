import { handler } from '../functions/robots';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
