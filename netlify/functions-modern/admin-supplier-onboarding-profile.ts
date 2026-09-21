import { handler } from '../functions/admin-supplier-onboarding-profile';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
