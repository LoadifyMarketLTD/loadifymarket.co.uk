import { handler } from '../functions/delete-account';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
