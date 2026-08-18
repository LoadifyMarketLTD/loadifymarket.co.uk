import { handler } from '../functions/create-shipment';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
