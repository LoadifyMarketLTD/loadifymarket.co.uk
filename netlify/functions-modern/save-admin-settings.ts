import { handler } from '../functions/save-admin-settings';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
