import { handler } from '../functions/admin-product-source-preview';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
