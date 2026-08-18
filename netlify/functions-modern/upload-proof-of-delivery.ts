import { handler } from '../functions/upload-proof-of-delivery';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
