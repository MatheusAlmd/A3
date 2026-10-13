import { UserDetailScreen } from '../../../screens/Management';
import { ScreenRoute } from '../../../navigation/ScreenRoute';
export default function Page() {
  return <ScreenRoute component={UserDetailScreen} name="UserDetail" />;
}
