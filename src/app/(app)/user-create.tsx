import { UserCreateScreen } from '../../screens/Management';
import { ScreenRoute } from '../../navigation/ScreenRoute';
export default function Page() {
  return <ScreenRoute component={UserCreateScreen} name="UserCreate" />;
}
