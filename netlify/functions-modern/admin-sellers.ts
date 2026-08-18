import { handler } from '../functions/admin-sellers';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
