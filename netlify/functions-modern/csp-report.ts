import { handler } from '../functions/csp-report';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
