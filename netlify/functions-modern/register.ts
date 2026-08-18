import { handler } from '../functions/register';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
