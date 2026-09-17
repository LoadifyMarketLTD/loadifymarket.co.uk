import { handler } from '../functions/return-action';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
