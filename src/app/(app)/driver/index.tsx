import { CurrentRouteScreen } from '../../../screens/Routes';
import { ScreenRoute } from '../../../navigation/ScreenRoute';
export default function Page() {
  return <ScreenRoute component={CurrentRouteScreen} name="Current" />;
}
