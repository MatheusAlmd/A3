import { RegisterScreen } from '../../screens/Auth';
import { ScreenRoute } from '../../navigation/ScreenRoute';
export default function Page() {
  return <ScreenRoute component={RegisterScreen} name="Register" />;
}
