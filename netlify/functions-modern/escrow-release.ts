import { handler } from '../functions/escrow-release';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
