import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { ParamListBase, useNavigation } from "@react-navigation/native";
import { FIREBASE_AUTH } from "../../firebaseConfig";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AntDesign } from "@expo/vector-icons";

// Sign in with Google
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// open mini browser on app without redirecting to safari
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const auth = FIREBASE_AUTH;

  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigation.navigate("TabNav");
      }
    });

    return unsubscribe;
  }, []);

  const handleSignUp = () => {
    navigation.navigate("SignUpScreen");
  };

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log("Logged in with: ", user.email);
      })
      .catch((error) => alert(error.message));
  };

  const [userInfo, setUserInfo] = React.useState();
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId:
      "66214326037-4lj7utvvnk4v5oq604nq61mvf4hp39bd.apps.googleusercontent.com",
    webClientId:
      "66214326037-i2p7d7a2b7naqgfurhr05jo75jdditcg.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type == "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(FIREBASE_AUTH, credential);
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior="padding"
      >
        <View>
          <Text style={styles.title}>LocalLyfe</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Email"
            placeholderTextColor="black"
            value={email}
            onChangeText={(text) => setEmail(text)}
            style={styles.input}
          ></TextInput>
          <TextInput
            placeholder="Password"
            placeholderTextColor="black"
            value={password}
            onChangeText={(text) => setPassword(text)}
            style={styles.input}
            secureTextEntry
          ></TextInput>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={handleLogin} style={styles.button}>
            <Text style={styles.buttonText}>Log in</Text>
          </TouchableOpacity>

          {/* 
                <TouchableOpacity
                onPress={() => promptAsync()}
                style={styles.GoogleButton}
                >
                    <AntDesign name="google" size = {30} color="white" />
                    <Text style={{ color: "white", fontSize: 15, marginLeft: 5 }}>
                        Login With Google
                    </Text>
                </TouchableOpacity>
                */}
        </View>
      </KeyboardAvoidingView>

      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't have an account?</Text>
        <TouchableOpacity onPress={handleSignUp}>
          <Text style={[styles.touchableText, styles.signupText]}>
            {" "}
            Sign up.
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  title: {
    fontSize: 40,
    marginBottom: 20,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidingContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    width: "100%",
    padding: 20,
  },
  input: {
    backgroundColor: "#c2c2c2",
    padding: 20,
    borderRadius: 10,
    marginTop: 5,
  },
  buttonContainer: {
    width: "100%",
    padding: 20,
    marginTop: 40,
  },
  button: {
    backgroundColor: "#22E871",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
  },
  GoogleButton: {
    flexDirection: "row",
    backgroundColor: "#22E871",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 15,
  },
  signupContainer: {
    position: "absolute",
    bottom: 30,
    flexDirection: "row",
  },
  signupText: {
    fontSize: 15,
  },
  touchableText: {
    color: "#22E871",
  },
});
