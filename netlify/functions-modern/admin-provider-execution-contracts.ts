import { handler } from '../functions/admin-provider-execution-contracts';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
