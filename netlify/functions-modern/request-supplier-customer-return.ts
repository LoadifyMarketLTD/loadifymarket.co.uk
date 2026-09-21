import { handler } from '../functions/request-supplier-customer-return';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
