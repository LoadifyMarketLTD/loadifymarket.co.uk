import { handler } from '../functions/admin-supplier-source-policy';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
