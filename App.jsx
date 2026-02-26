import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import auth from "@react-native-firebase/auth";

import IntroScreen from "./src/IntroScreen";
import LoginScreen from "./src/LoginScreen";
import SignupScreen from "./src/SignupScreen";
import BottomNavigation from "./src/BottomNavigation";
import UserProfileScreen from "./src/UserProfileScreen";
import EditProfileScreen from "./src/EditProfileScreen";

const Stack = createNativeStackNavigator();

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(currentUser => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      {user ? (
        // ✅ LOGGED IN STACK
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainApp" component={BottomNavigation} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />

        </Stack.Navigator>
      ) : (
        // ❌ LOGGED OUT STACK
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Intro" component={IntroScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default App;