import { handler } from '../functions/admin-supplier-control-centre';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);