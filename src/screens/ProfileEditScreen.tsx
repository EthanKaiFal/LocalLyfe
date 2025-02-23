import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from "react-native";
import React, { useState } from "react";
import {
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../firebaseConfig";
import { onValue, ref, set } from "firebase/database";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import emptyProfile from "../../assets/profile.png";
import * as ImagePicker from "expo-image-picker";
import { Foundation } from "@expo/vector-icons";
import {
  getDownloadURL,
  getStorage,
  ref as sref,
  uploadBytes,
} from "firebase/storage";

const ProfileEditScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const auth = FIREBASE_AUTH;
  const db = FIREBASE_DB;
  const userId = auth.currentUser?.uid;
  const emptyPhotoURI = Image.resolveAssetSource(emptyProfile).uri;
  const [imageUploaded, setImageUploaded] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(auth.currentUser!.email!);
  const [zipcode, setZipcode] = useState("");
  const [image, setImage] = useState(emptyPhotoURI);

  // pull values only when user first navigates to screen
  const [isFocused, setIsFocused] = useState(false);

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

  useFocusEffect(() => {
    if (!isFocused) {
      setEmail(auth.currentUser!.email!);
      onValue(
        ref(db, "/users/" + userId),
        (snapshot) => {
          setFirstName(snapshot.val().firstName);
          setLastName(snapshot.val().lastName);
          if (snapshot.val().profilePicture != "") {
            setImage(snapshot.val().profilePicture);
            setImageUploaded(true);
          }
          setZipcode(snapshot.val().zip);
        },
        {
          onlyOnce: true,
        }
      );
    }
    // prevents text input from retriggering data pull
    setIsFocused(true);
  });

  const handleBack = () => {
    navigation.navigate("ProfileScreen");
    setIsFocused(false);
  };

  const handleUpdate = async () => {
    var downloadURL = "";
    if (image != emptyPhotoURI) {
      const storage = getStorage();

      const response = await fetch(image);
      const blob = await response.blob();
      const storageRef = sref(storage, userId);

      await uploadBytes(storageRef, blob);
      await getDownloadURL(storageRef).then((url) => {
        downloadURL = url;
      });
    }
    if (email != auth.currentUser!.email) {
      // Prompt user to re-enter password for email change
      Alert.prompt(
        "Reauthentication",
        "Please enter your password to change email.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "OK",
            onPress: async (userProvidedPassword: string | undefined) => {
              if (userProvidedPassword) {
                // Store the entered password securely
                await AsyncStorage.setItem(
                  "userProvidedPassword",
                  userProvidedPassword
                );

                // Use the stored password to create EmailAuthProvider credential
                const storedPassword = await AsyncStorage.getItem(
                  "userProvidedPassword"
                );
                const credential = EmailAuthProvider.credential(
                  auth.currentUser!.email!,
                  storedPassword || ""
                );

                // Update user email with Firebase Auth
                await reauthenticateWithCredential(
                  auth.currentUser!,
                  credential
                )
                  .then(async () => {
                    await updateEmail(auth.currentUser!, email);
                    updateEmail(auth.currentUser!, email)
                      .then(async () => {
                        // Clear the stored password after use
                        await AsyncStorage.removeItem("userProvidedPassword");
                        if (zipcode.length != 5) {
                          Alert.alert(
                            "Error!",
                            "Please enter a valid zip code."
                          );
                          return;
                        }
                        if (firstName.length == 0) {
                          Alert.alert("Error!", "Please enter a first name.");
                          return;
                        }
                        if (lastName.length == 0) {
                          Alert.alert("Error!", "Please enter a last name.");
                          return;
                        }
                        set(ref(db, "users/" + userId), {
                          firstName: firstName,
                          lastName: lastName,
                          profilePicture: downloadURL,
                          zip: zipcode,
                        });
                        Alert.alert("Success!", "Profile details updated.");
                        navigation.navigate("ProfileScreen");
                        setIsFocused(false);
                      })
                      .catch((error) => {
                        Alert.alert("Error!", error.message);
                      });
                  })
                  .catch((error) => {
                    Alert.alert("Error!", error.message);
                  });
              }
            },
          },
        ],
        "secure-text"
      );
    } else {
      if (zipcode.length != 5) {
        Alert.alert("Error!", "Please enter a valid zip code.");
        return;
      }
      if (firstName.length == 0) {
        Alert.alert("Error!", "Please enter a first name.");
        return;
      }
      if (lastName.length == 0) {
        Alert.alert("Error!", "Please enter a last name.");
        return;
      }
      set(ref(db, "users/" + userId), {
        firstName: firstName,
        lastName: lastName,
        profilePicture: downloadURL,
        zip: zipcode,
      });
      Alert.alert("Success!", "Profile details updated.");
      navigation.navigate("ProfileScreen");
      setIsFocused(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={40} color="white" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>LocalLyfe</Text>
        </View>
      </View>
      <View style={styles.topTitleContainer}>
        <Text style={styles.topTitleText}>Edit Profile</Text>
      </View>
      <View style={[styles.rowContainer, styles.topContainer]}>
        <Image source={{ uri: image }} style={styles.avatar} />
        <View style={styles.topTextContainer}>
          <Text style={styles.profileName}>{`${firstName} ${lastName}`}</Text>
          <Text style={styles.profileLocation}>{zipcode}</Text>
        </View>
      </View>
      <TextInput
        style={styles.textInput}
        placeholder="First Name"
        value={firstName}
        onChangeText={(text) => setFirstName(text)}
      />
      <TextInput
        style={styles.textInput}
        placeholder="Last Name"
        value={lastName}
        onChangeText={(text) => setLastName(text)}
      />
      <TextInput
        style={styles.textInput}
        placeholder="Email"
        value={email}
        onChangeText={(text) => setEmail(text)}
      />
      <TextInput
        style={styles.textInput}
        placeholder="Zipcode"
        value={zipcode}
        onChangeText={(text) => setZipcode(text)}
      />
      <View style={styles.cameraInputContainer}>
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
        <TouchableOpacity style={styles.button} onPress={handleUpdate}>
          <Text style={styles.buttonText}>Update</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProfileEditScreen;

const styles = StyleSheet.create({
  container: {
    height: "100%",
  },
  headerContainer: {
    paddingTop: "10%",
    flexDirection: "row",
    height: "12%",
    backgroundColor: "#22E871",
  },
  titleContainer: {
    justifyContent: "center",
    textAlign: "center",
    width: "60%",
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
    fontSize: 25,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 1,
  },
  backButton: {
    justifyContent: "center",
    alignItems: "center",
    width: "20%",
  },
  topTitleContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: "#94F8B3",
  },
  topTitleText: {
    color: "#128B4A",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 17,
  },
  topContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: "20%",
  },
  topTextContainer: {
    flex: 1,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: "10%",
    paddingVertical: "5%",
    borderBottomWidth: 1,
    borderColor: "#D3D3D3",
  },
  profileName: {
    fontSize: 30,
    fontWeight: "bold",
  },
  profilePicture: {
    paddingRight: "10%",
  },
  profileLocation: {
    fontSize: 15,
  },
  textInput: {
    marginHorizontal: "5%",
    marginTop: "5%",
    padding: 15,
    backgroundColor: "lightgrey",
    fontSize: 15,
    borderRadius: 10,
  },
  locationContainer: {
    marginVertical: "5%",
    flexDirection: "row",
  },
  locationInput: {
    marginLeft: "5%",
    padding: 15,
    borderRadius: 10,
    width: "26.5%",
    backgroundColor: "lightgrey",
  },
  button: {
    margin: 5,
    padding: 15,
    width: "30%",
    backgroundColor: "#128B4A",
    borderRadius: 10,
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 15,
    color: "white",
    textAlign: "center",
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 50,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 160,
    resizeMode: "cover",
    marginRight: 20,
  },
  cameraInputContainer: {
    alignItems: "center",
  },
  cameraButtonText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "black",
    marginLeft: 5,
  },
  cameraButton: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
