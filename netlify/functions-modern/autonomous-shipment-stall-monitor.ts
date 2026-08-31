import { handler } from '../functions/autonomous-shipment-stall-monitor';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
