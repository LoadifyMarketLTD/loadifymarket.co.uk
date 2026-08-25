import { handler } from '../functions/set-seller-onboarding';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
