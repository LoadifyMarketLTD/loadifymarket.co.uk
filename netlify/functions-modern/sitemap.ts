import { handler } from '../functions/sitemap';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
