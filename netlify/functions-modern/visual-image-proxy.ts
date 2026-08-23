import { handler } from '../functions/visual-image-proxy';
import { withLambda } from '../function-runtime/lambdaCompat';

export default withLambda(handler);
