import { handler } from '../functions/market-launch-status';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
