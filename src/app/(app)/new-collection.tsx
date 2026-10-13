import { NewCollectionScreen } from '../../screens/CollectionFlow';
import { ScreenRoute } from '../../navigation/ScreenRoute';
export default function Page() {
  return <ScreenRoute component={NewCollectionScreen} name="NewCollection" />;
}
