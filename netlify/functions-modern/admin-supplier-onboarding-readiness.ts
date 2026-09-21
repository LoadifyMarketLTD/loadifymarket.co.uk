import { handler } from '../functions/admin-supplier-onboarding-readiness';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
