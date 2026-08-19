import { handler } from '../functions/admin-user-status';
import { withLambda } from '../function-runtime/lambdaCompat';

export default withLambda(handler);
