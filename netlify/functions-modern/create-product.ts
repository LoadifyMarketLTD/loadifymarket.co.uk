import { handler } from '../functions/create-product';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
