import { handler } from '../functions/admin-supplier-economics-decision';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
