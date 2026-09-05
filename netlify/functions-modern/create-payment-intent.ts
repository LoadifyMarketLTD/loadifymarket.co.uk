import { handler } from '../functions/create-payment-intent';
import { withLambda } from '../function-runtime/lambdaCompat';
import { installPostgrestCatchCompat } from '../function-runtime/postgrestCatchCompat';

installPostgrestCatchCompat();

export default withLambda(handler);
