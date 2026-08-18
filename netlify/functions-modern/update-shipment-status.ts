import { handler } from '../functions/update-shipment-status';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
