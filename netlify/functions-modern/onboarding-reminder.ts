import { handler } from '../functions/onboarding-reminder';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
