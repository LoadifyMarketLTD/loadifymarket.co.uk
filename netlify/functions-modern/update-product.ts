import { handler } from '../functions/update-product';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
