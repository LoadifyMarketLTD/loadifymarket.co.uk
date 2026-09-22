import { handler } from '../functions/direct-supplier-operational-webhook';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
