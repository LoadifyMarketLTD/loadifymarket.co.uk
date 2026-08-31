import { handler } from '../functions/customer-return-eligibility';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
