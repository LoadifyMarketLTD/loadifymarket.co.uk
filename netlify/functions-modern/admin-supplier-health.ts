import { handler } from '../functions/admin-supplier-health';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);