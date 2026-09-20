import { handler } from '../functions/prepare-supplier-checkout';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
