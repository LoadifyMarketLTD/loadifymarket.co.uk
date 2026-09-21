import { handler } from '../functions/admin-product-discovery-candidate';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
