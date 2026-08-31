import { handler } from '../functions/direct-supplier-signed-feed';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
