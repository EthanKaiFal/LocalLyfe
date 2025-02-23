import { StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNav from "./src/TabNav";
import LoginScreen from "./src/screens/LoginScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import ProfileEditScreen from "./src/screens/ProfileEditScreen";
import EditScreen from "./src/screens/EditScreen";
import 'react-native-gesture-handler'; 

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="LoginScreen"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen
          name="SignUpScreen"
          component={SignUpScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="TabNav" component={TabNav} />
        <Stack.Screen name="ProfileEditScreen" component={ProfileEditScreen} />
        <Stack.Screen name="EditScreen" component={EditScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
