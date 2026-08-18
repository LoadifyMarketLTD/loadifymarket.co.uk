import { handler } from '../functions/connect-dashboard';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
