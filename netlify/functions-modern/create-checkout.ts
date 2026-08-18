import { handler } from '../functions/create-checkout';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
