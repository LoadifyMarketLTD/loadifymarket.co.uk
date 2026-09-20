import { handler } from '../functions/admin-operator-merchandising-review';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
