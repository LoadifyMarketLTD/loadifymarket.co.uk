import { handler } from '../functions/autonomous-supplier-commerce';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
