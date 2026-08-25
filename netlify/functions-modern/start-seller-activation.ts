import { handler } from '../functions/start-seller-activation';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
