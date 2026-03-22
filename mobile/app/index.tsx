import { Redirect } from 'expo-router';

export default function Index() {
  // AUTH DISABLED — skip login for UI testing
  return <Redirect href="/(tabs)/upload" />;
}
