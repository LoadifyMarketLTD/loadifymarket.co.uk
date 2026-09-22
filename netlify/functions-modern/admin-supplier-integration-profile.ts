import { handler } from '../functions/admin-supplier-integration-profile';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
