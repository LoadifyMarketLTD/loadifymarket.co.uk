import { handler } from '../functions/admin-shadow-mode-evaluation';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
