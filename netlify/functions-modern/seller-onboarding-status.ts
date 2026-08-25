import { handler } from '../functions/seller-onboarding-status';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
