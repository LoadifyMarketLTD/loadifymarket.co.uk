import { handler } from '../functions/admin-publish-supplier-projection';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
