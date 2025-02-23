import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { ParamListBase, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../firebaseConfig";
import {
  getDownloadURL,
  getStorage,
  ref as sref,
  uploadBytes,
} from "firebase/storage";
import { Ionicons } from "@expo/vector-icons";
import { Foundation } from "@expo/vector-icons";
import { ref, set } from "firebase/database";
import { CameraCapturedPicture } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as EmailValidator from "email-validator";
import emptyProfile from "../../assets/profile.png";

const SignUpScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setconfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [zip, setZip] = useState("");
  const backButtonSize = 40;
  const auth = FIREBASE_AUTH;
  const db = FIREBASE_DB;

  const handleNext = () => {
    if (step === 1) {
      // validate email and password
      if (!EmailValidator.validate(email)) {
        Alert.alert("Error!", "Please enter a valid email.");
        return;
      }
      if (password.length < 6 || password != confirmPassword) {
        Alert.alert(
          "Error!",
          "Passwords should be at least 6 characters and match."
        );
        return;
      }
    } else if (step === 2) {
      // validate first and last name
      if (!firstName && firstName.trim().replace(/ /g, "").length <= 0) {
        Alert.alert("Error!", "Please enter a valid first name.");
        return;
      }
      if (!lastName && lastName.trim().replace(/ /g, "").length <= 0) {
        Alert.alert("Error!", "Please enter a valid last name.");
        return;
      }
    } else if (step === 3) {
      // validate zipcode
      if (zip.length != 5) {
        Alert.alert("Error!", "Please enter a valid zipcode.");
        return;
      }
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
          const user = userCredential.user;
          console.log(user.uid);

          var downloadURL = "";
          if (image != emptyPhotoURI) {
            const storage = getStorage();

            const response = await fetch(image);
            const blob = await response.blob();
            const storageRef = sref(storage, user.uid);

            await uploadBytes(storageRef, blob);
            await getDownloadURL(storageRef).then((url) => {
              downloadURL = url;
            });
          }

          await set(ref(db, "users/" + user.uid), {
            firstName: firstName,
            lastName: lastName,
            profilePicture: downloadURL,
            zip: zip,
            admin: false,
            council: false,
          }).then(() => {
            navigation.navigate("TabNav");
          });
        })
        .catch((error) => alert(error.message));
    }
  };

  // profile picture code
  const emptyPhotoURI = Image.resolveAssetSource(emptyProfile).uri;
  const [image, setImage] =
    useState<CameraCapturedPicture["uri"]>(emptyPhotoURI);
  const [imageUploaded, setImageUploaded] = useState(false);

  const openCamera = async () => {
    try {
      await ImagePicker.requestCameraPermissionsAsync();
      let result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        await setImage(result.assets[0].uri);
        setImageUploaded(true);
      }
    } catch (error) {
      Alert.alert(
        "Error!",
        "Problems opening camera. Check permissions and try again."
      );
    }
  };

  const openGallery = async () => {
    try {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        await setImage(result.assets[0].uri);
        setImageUploaded(true);
      }
    } catch (error) {
      Alert.alert(
        "Error!",
        "Problems opening gallery. Check permissions and try again."
      );
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backButton}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="chevron-back" size={backButtonSize} color="black" />
        </TouchableOpacity>
      </View>

      {step === 1 && (
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
            <TextInput
              placeholder="Re-enter Password"
              placeholderTextColor="black"
              value={confirmPassword}
              onChangeText={(text) => setconfirmPassword(text)}
              style={styles.input}
              secureTextEntry
            ></TextInput>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={handleNext} style={styles.button}>
              <Text style={styles.buttonText}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {step === 2 && (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingContainerTop}
          behavior="padding"
        >
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>What's your name?</Text>
            <Text style={styles.description}>
              Residents use their actual names to foster a sense of trust within
              their local community.
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="First Name"
              value={firstName}
              onChangeText={(text) => setFirstName(text)}
              style={styles.input}
            />
            <TextInput
              placeholder="Last Name"
              value={lastName}
              onChangeText={(text) => setLastName(text)}
              style={styles.input}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={handleNext} style={styles.button}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {step === 3 && (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingContainerTop}
          behavior="padding"
        >
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>What's your zip code?</Text>
            <Text style={styles.description}>
              Your zip code will only be used for verification and content
              display purposes.
            </Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Zip code"
              value={zip}
              onChangeText={(text) => setZip(text)}
              style={styles.input}
            />
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={handleNext} style={styles.button}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {step === 4 && (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingContainerTop}
          behavior="padding"
        >
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitleSmall}>
              Welcome! Let's add a profile pic
            </Text>
            <Text style={styles.description}>
              A photo helps create a friendlier environment.
            </Text>
          </View>
          <View style={styles.cameraInputContainer}>
            <Image source={{ uri: image }} style={styles.avatar} />
            <TouchableOpacity style={styles.cameraButton} onPress={openCamera}>
              <Ionicons name="camera" size={24} color="black" />
              <Text style={styles.cameraButtonText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraButton} onPress={openGallery}>
              <Foundation name="upload" size={24} color="black" />
              <Text style={styles.cameraButtonText}>Upload photo</Text>
            </TouchableOpacity>
            {imageUploaded && (
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => {
                  setImage(emptyPhotoURI);
                  setImageUploaded(false);
                }}
              >
                <Ionicons name="trash" size={24} color="black" />
                <Text style={styles.cameraButtonText}>Remove photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={handleNext} style={styles.button}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

export default SignUpScreen;

const profilePicSize = 250;
const styles = StyleSheet.create({
  title: {
    fontSize: 40,
    marginBottom: 20,
  },
  subtitleContainer: {
    width: "100%",
    padding: 20,
    gap: 10,
  },
  subtitle: {
    fontSize: 40,
  },
  subtitleSmall: {
    fontSize: 28,
  },
  description: {
    fontSize: 15,
  },
  container: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    top: -35,
    zIndex: 1,
  },
  keyboardAvoidingContainerTop: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  backButton: {
    paddingHorizontal: 5,
    width: "20%",
    zIndex: 2,
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
  buttonText: {
    color: "white",
    fontSize: 15,
  },
  optional: {
    fontSize: 10,
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
  cameraInputContainer: {
    flex: 1,
    alignItems: "center",
  },
  cameraContainer: {
    alignSelf: "center",
    flex: 1,
    alignItems: "center",
  },
  cameraPreview: {
    width: profilePicSize,
    height: profilePicSize,
    borderRadius: 160,
    backgroundColor: "black",
    overflow: "hidden",
  },
  camera: {
    width: profilePicSize,
    height: profilePicSize,
  },
  cameraButton: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraButtonText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "black",
    marginLeft: 5,
  },
  avatar: {
    width: profilePicSize,
    height: profilePicSize,
    borderRadius: 160,
    resizeMode: "cover",
  },
  ring: {
    marginTop: 5,
    width: 50,
    height: 50,
    borderRadius: 50,
    borderWidth: 5,
    borderColor: "#22E871",
  },
});
