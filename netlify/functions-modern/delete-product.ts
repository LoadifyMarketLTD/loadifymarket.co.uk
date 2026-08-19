import { handler } from '../functions/delete-product';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
