import { handler } from '../functions/admin-supplier-applications';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
