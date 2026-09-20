import { handler } from '../functions/supplier-catalog';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
