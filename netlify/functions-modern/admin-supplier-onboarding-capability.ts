import { handler } from '../functions/admin-supplier-onboarding-capability';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
