import { handler } from '../functions/admin-direct-supplier-normalize-preview';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
