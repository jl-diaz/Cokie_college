import { Stack } from 'expo-router';

export default function CoordinatorLayout() {
  return (
    <Stack 
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent', 
          borderBottomWidth: 0,
          borderBottomColor: 'transparent',
        },
        headerTintColor: '#E8D9ED',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: '' }} />
    </Stack>
  );
}