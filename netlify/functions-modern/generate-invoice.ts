import { handler } from '../functions/generate-invoice';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
