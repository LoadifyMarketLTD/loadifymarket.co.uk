import { handler } from '../functions/admin-supplier-marketplace-projection';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
