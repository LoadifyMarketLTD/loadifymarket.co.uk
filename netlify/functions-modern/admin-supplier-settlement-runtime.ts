import { handler } from '../functions/admin-supplier-settlement-runtime';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
