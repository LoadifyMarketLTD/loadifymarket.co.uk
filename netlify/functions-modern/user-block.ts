import { handler } from '../functions/user-block';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
