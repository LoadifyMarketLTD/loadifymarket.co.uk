import { handler } from '../functions/admin-ai-product-builder-generate';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
