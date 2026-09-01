import { handler } from '../functions/admin-supplier-pilot-runtime';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
