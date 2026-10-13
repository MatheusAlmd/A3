import { ProfileScreen } from '../../../screens/Shared';
import { ScreenRoute } from '../../../navigation/ScreenRoute';
export default function Page() {
  return <ScreenRoute component={ProfileScreen} name="Profile" />;
}
