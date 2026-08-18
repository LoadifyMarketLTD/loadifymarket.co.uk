import { handler } from '../functions/track-shipment';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
