import { handler } from '../functions/admin-direct-supplier-phase-f-import-execute';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
