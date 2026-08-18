import { handler } from '../functions/connect-onboard';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
