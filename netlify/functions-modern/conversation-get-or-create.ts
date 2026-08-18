import { handler } from '../functions/conversation-get-or-create';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
