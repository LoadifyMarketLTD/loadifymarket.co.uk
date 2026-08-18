import { handler } from '../functions/error-report';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
