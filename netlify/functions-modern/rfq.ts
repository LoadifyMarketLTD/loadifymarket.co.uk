import { handler } from '../functions/rfq';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
