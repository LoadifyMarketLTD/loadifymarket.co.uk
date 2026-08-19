import { handler } from '../functions/deactivate-account';
import { withLambda } from '../function-runtime/lambdaCompat';

export default withLambda(handler);
