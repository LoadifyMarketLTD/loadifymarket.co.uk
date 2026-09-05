import { handler } from '../functions/create-checkout';
import { withLambda } from '../function-runtime/lambdaCompat';
import { installPostgrestCatchCompat } from '../function-runtime/postgrestCatchCompat';

installPostgrestCatchCompat();

export default withLambda(handler);
