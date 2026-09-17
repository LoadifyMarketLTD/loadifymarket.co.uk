import { handler } from '../functions/dispute-action';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
