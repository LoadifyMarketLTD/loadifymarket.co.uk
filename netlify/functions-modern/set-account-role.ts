import { handler } from '../functions/set-account-role';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
