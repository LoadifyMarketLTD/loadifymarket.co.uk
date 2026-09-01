import { handler } from '../functions/admin-direct-supplier-phase-f-import-plan';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
