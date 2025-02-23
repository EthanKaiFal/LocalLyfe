import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Modal,
  FlatList,
} from "react-native";
import { AntDesign, SimpleLineIcons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../firebaseConfig";
import { signOut } from "firebase/auth";
import {
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { onValue, ref, get, child } from "firebase/database";
import { useState } from "react";
import emptyProfile from "../../assets/profile.png";
import { idea } from "../HomeScreenFiles/Idea";
interface ExtendedIdea {
  ideaId: string;
  idea: idea;
}
const ProfileScreen = () => {
  const iconSize = 25;
  const auth = FIREBASE_AUTH;
  const db = FIREBASE_DB;
  const emptyPhotoURI = Image.resolveAssetSource(emptyProfile).uri;

  // get user data from Firebase
  const userId = auth.currentUser!.uid;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(auth.currentUser!.email);
  const [zipcode, setZipcode] = useState("");
  const [image, setImage] = useState(emptyPhotoURI);
  const [followedIdeas, setFollowedIdeas] = useState<ExtendedIdea[]>([]);
  const [myIdeas, setMyIdeas] = useState<ExtendedIdea[]>([]);
  const [showMyIdeasModal, setShowMyIdeasModal] = useState(false);
  const [showFollowedIdeasModal, setShowFollowedIdeasModal] = useState(false);
  const windowDimensions = useWindowDimensions();
  // pull values only when user first navigates to screen
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(() => {
    if (!isFocused) {
      setEmail(auth.currentUser!.email);
      onValue(
        ref(db, "/users/" + userId),
        (snapshot) => {
          if (snapshot.exists()) {
            setFirstName(snapshot.val().firstName);
            setLastName(snapshot.val().lastName);
            if (snapshot.val().profilePicture != "") {
              setImage(snapshot.val().profilePicture);
            } else {
              setImage(emptyPhotoURI);
            }
            setZipcode(snapshot.val().zip);
          }
        },
        {}
      );
    }
    // prevents text input from retriggering data pull
    setIsFocused(true);
  });

  // Gets the users followed list and stores them as ideas + the ideaID in the followedIdeas list
  useEffect(() => {
    const fetchFollowedIdeas = () => {
      const followedIdeasRef = ref(db, `userIdeasFollowed/${userId}`);
      onValue(followedIdeasRef, (snapshot) => {
        if (snapshot.exists()) {
          const followedIdeasData = snapshot.val();
          const ideaIds = Object.keys(followedIdeasData);
          const ideaList: ExtendedIdea[] = [];

          ideaIds.forEach((ideaId) => {
            const ideaRef = ref(db, `ideas/${ideaId}`);
            onValue(ideaRef, (ideaSnapshot) => {
              if (ideaSnapshot.exists()) {
                const ideaData = ideaSnapshot.val();
                const ideaObject = new idea(
                  ideaData.name,
                  ideaData.description,
                  ideaData.cord,
                  ideaData.upVoteNum,
                  ideaData.creator,
                  ideaData.dateCreated,
                  ideaData.comments
                );
                const extendedIdea: ExtendedIdea = {
                  ideaId: ideaId,
                  idea: ideaObject,
                };
                ideaList.push(extendedIdea);
                if (ideaList.length === ideaIds.length) {
                  setFollowedIdeas(ideaList);
                }
              } else {
                console.error(`Idea with ID ${ideaId} does not exist`);
                // Remove the ideaId from the list to prevent waiting indefinitely
                const index = ideaIds.indexOf(ideaId);
                if (index !== -1) {
                  ideaIds.splice(index, 1);
                }
              }
            });
          });
        } else {
          setFollowedIdeas([]);
        }
      });
    };

    fetchFollowedIdeas();

    const followedIdeasRef = ref(db, `userIdeasFollowed/${userId}`);
    const unsubscribe = onValue(followedIdeasRef, (snapshot) => {
      fetchFollowedIdeas();
    });

    return () => {
      unsubscribe();
    };
  }, [db, userId]);

  // Gets the users created idea list and stores them as ideas + the ideaID in the myIdeas list
  useEffect(() => {
    const fetchMyIdeas = () => {
      const myIdeasRef = ref(db, `userIdeas/${userId}`);
      onValue(myIdeasRef, (snapshot) => {
        if (snapshot.exists()) {
          const myIdeasData = snapshot.val();
          const temp = Object.keys(myIdeasData);
          const ideaIds: string[] = temp.map((element) => String(element));
          const ideaList: ExtendedIdea[] = [];

          ideaIds.forEach((ideaId) => {
            const ideaRef = ref(db, `ideas/${ideaId}`);
            onValue(ideaRef, (ideaSnapshot) => {
              if (ideaSnapshot.exists()) {
                const ideaData = ideaSnapshot.val();
                const ideaObject = new idea(
                  ideaData.name,
                  ideaData.description,
                  ideaData.cord,
                  ideaData.upVoteNum,
                  ideaData.creator,
                  ideaData.dateCreated,
                  ideaData.comments
                );
                const extendedIdea: ExtendedIdea = {
                  ideaId: ideaId,
                  idea: ideaObject,
                };
                ideaList.push(extendedIdea);
                if (ideaList.length === ideaIds.length) {
                  setMyIdeas(ideaList);
                }
              } else {
                console.error(`Idea with ID ${ideaId} does not exist`);
                // Remove the ideaId from the list to prevent waiting indefinitely
                const index = ideaIds.indexOf(ideaId);
                if (index !== -1) {
                  ideaIds.splice(index, 1);
                }
              }
            });
          });
        } else {
          setMyIdeas([]);
        }
      });
    };
    fetchMyIdeas();

    const myIdeasRef = ref(db, `userIdeas/${userId}`);
    const unsubscribe = onValue(myIdeasRef, (snapshot) => {
      fetchMyIdeas();
    });

    return () => {
      unsubscribe();
    };
  }, [db, userId]);

  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  const handleIdeaPress = (ideaId: string) => {
    // Navigate to the Home screen with the idea ID
    setShowFollowedIdeasModal(false);
    setShowMyIdeasModal(false);
    navigation.navigate("HomeScreen", { ideaId });
  };

  // Function to close the modal
  const closeModal = () => {
    setShowFollowedIdeasModal(false);
    setShowMyIdeasModal(false);
  };

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log("Signed out successfully");
        navigation.navigate("LoginScreen");
        setIsFocused(false);
      })
      .catch((error) => alert(error.message));
  };

  const handleEdit = () => {
    navigation.navigate("ProfileEditScreen");
    setIsFocused(false);
  };
  // Extract unique idea IDs
const uniqueIdeaIds = [...new Set(followedIdeas.map((item) => item.ideaId))];


// Filter followedIdeas to remove duplicates
const uniqueFollowedIdeas = followedIdeas.filter(
  (item, index) => uniqueIdeaIds.indexOf(item.ideaId) === index
);

const uniqueMyIdeaIds = [...new Set(myIdeas.map((item) => item.ideaId))];


// Filter followedIdeas to remove duplicates
const uniqueMyIdeas = myIdeas.filter(
  (item, index) => uniqueMyIdeaIds.indexOf(item.ideaId) === index
);



  return (
    <>
      <View style={[styles.rowContainer, styles.topContainer]}>
        <Image source={{ uri: image }} style={styles.avatar} />
        <View style={styles.topTextContainer}>
          <Text style={styles.profileName}>{`${firstName} ${lastName}`}</Text>
          <Text style={styles.profileLocation}>{zipcode}</Text>
        </View>
      </View>
      <View style={styles.rowContainer}>
        <AntDesign
          style={styles.icons}
          name="user"
          size={iconSize}
          color={"black"}
        />
        <View style={styles.textBox}>
          <Text style={styles.text}>{`${firstName} ${lastName}`}</Text>
        </View>
      </View>
      <View style={styles.rowContainer}>
        <AntDesign
          style={styles.icons}
          name="mail"
          size={iconSize}
          color={"black"}
        />
        <View style={styles.textBox}>
          <Text style={styles.text}>{email}</Text>
        </View>
      </View>
      <View style={styles.rowContainer}>
        <SimpleLineIcons
          style={styles.icons}
          name="location-pin"
          size={iconSize}
          color={"black"}
        />
        <View style={styles.textBox}>
          <Text style={styles.text}>{zipcode}</Text>
        </View>
      </View>
      <View style={styles.rowContainer}>
        <AntDesign
          style={styles.icons}
          name="lock"
          size={iconSize}
          color={"black"}
        />
        <View style={styles.textBox}>
          <Text style={styles.text}>********</Text>
        </View>
      </View>
      <View style={styles.profileListButtons}>
        {/* Followed Ideas Btn */}
        <View style={styles.followedIdeasContainer}>
          <TouchableOpacity
            style={[styles.button, styles.followedIdeasBtn]}
            onPress={() => setShowFollowedIdeasModal(true)}
          >
            <Text style={styles.followedIdeasText}>Followed Ideas</Text>
          </TouchableOpacity>
        </View>
        {/* My Ideas Btn */}
        <View style={styles.followedIdeasContainer}>
          <TouchableOpacity
            style={[styles.button, styles.followedIdeasBtn]}
            onPress={() => setShowMyIdeasModal(true)}
          >
            <Text style={styles.followedIdeasText}>My Ideas</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Modal containing FlatList of followed ideas */}
      <Modal
        visible={showFollowedIdeasModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              {
                width: windowDimensions.width * 0.8,
                maxHeight: windowDimensions.height * 0.8,
              },
            ]}
          >
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>

            {/* FlatList of followed ideas */}
            <FlatList
              data={uniqueFollowedIdeas}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleIdeaPress(item.ideaId)}>
                  <View style={styles.ideaContainer}>
                    <Text style={styles.ideaName}>{item.idea.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.ideaId}
            />
          </View>
        </View>
      </Modal>

      {/* Modal containing FlatList of this user's ideas */}
      <Modal
        visible={showMyIdeasModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              {
                width: windowDimensions.width * 0.8,
                maxHeight: windowDimensions.height * 0.8,
              },
            ]}
          >
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>

            {/* FlatList of my ideas */}
            <FlatList
              data={uniqueMyIdeas}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleIdeaPress(item.ideaId)}>
                  <View style={styles.ideaContainer}>
                    <Text style={styles.ideaName}>{item.idea.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.ideaId}
            />
          </View>
        </View>
      </Modal>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleEdit}>
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.signOutBtn]}
          onPress={handleSignOut}
        >
          <Text style={styles.buttonText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  topContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: "30%",
  },
  profileName: {
    fontSize: 30,
    fontWeight: "bold",
  },
  profilePicture: {
    paddingRight: "10%",
  },
  topTextContainer: {
    flexDirection: "column",
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: "10%",
    paddingVertical: "5%",
    borderBottomWidth: 1,
    borderColor: "#D3D3D3",
  },
  icons: {
    paddingRight: "10%",
  },
  profileLocation: {
    fontSize: 15,
  },
  textBox: {
    width: "80%",
  },
  text: {
    fontSize: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    paddingTop: "5%",
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    margin: 5,
    padding: 15,
    width: "30%",
    backgroundColor: "#128B4A",
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 15,
    color: "white",
    textAlign: "center",
  },
  signOutBtn: {
    backgroundColor: "rgb(190, 190, 190)",
  },
  followedIdeasContainer: {
    paddingTop: "5%",
    justifyContent: "center", // Center horizontally
    alignItems: "center", // Center vertically
  },
  followedIdeasBtn: {
    backgroundColor: "#94F8B3",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    width: 100,
  },
  followedIdeasText: {
    color: "#128B4A",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
  },
  closeButtonText: {
    color: "black",
    fontSize: 16,
    marginBottom: 10,
  },
  ideaContainer: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#CCCCCC",
  },
  ideaName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 160,
    resizeMode: "cover",
    marginRight: 20,
  },
  profileListButtons: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
});
