import { handler } from '../functions/admin-bigbuy-sandbox-verification';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
