import { handler } from '../functions/category-editorial-image';
import { withLambda } from '../function-runtime/lambdaCompat';

export default withLambda(handler);
