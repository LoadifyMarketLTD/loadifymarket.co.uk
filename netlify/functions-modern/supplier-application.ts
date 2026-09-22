import { handler } from '../functions/supplier-application';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
