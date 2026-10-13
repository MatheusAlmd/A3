import { CollectionsScreen } from '../../screens/Citizen';
import { ScreenRoute } from '../../navigation/ScreenRoute';
export default function Page() {
  return <ScreenRoute component={CollectionsScreen} name="CollectionsAll" all />;
}
