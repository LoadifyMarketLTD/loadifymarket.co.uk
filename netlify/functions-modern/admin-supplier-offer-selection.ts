import { handler } from '../functions/admin-supplier-offer-selection';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
