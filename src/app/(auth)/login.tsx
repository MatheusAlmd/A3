import { LoginScreen } from '../../screens/Auth';
import { ScreenRoute } from '../../navigation/ScreenRoute';
export default function Page() {
  return <ScreenRoute component={LoginScreen} name="Login" />;
}
