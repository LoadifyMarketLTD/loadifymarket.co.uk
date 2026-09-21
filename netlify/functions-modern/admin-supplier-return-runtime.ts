import { handler } from '../functions/admin-supplier-return-runtime';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
