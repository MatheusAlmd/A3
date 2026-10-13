import { WelcomeScreen } from '../../screens/Auth';
import { ScreenRoute } from '../../navigation/ScreenRoute';
export default function Page() {
  return <ScreenRoute component={WelcomeScreen} name="Welcome" />;
}
