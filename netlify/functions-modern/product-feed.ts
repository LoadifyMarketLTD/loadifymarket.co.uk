import { handler } from '../functions/product-feed';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
