import { handler } from '../functions/admin-direct-supplier-staging-review';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);