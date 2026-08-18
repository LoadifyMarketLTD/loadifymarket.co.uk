import { handler } from '../functions/support-ticket-create';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
