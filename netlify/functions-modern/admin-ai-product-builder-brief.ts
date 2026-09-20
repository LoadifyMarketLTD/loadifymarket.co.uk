import { handler } from '../functions/admin-ai-product-builder-brief';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
