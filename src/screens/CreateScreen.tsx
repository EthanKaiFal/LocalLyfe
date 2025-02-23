import {
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Button,
  Modal,
  Alert,
  Platform,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import MapView, { Marker, MapPressEvent, LatLng } from "react-native-maps";
import { FIREBASE_AUTH as auth, FIREBASE_DB as db } from "../../firebaseConfig";
import { onValue, ref, set, push, get, update } from "firebase/database";
import { RouteProp, useFocusEffect, useRoute } from "@react-navigation/native";
import { packedRegion } from "./HomeScreen";

const CreateScreen: React.FC = () => {
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showSuggestedTags, setShowSuggestedTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const [tags, setAllTags] = useState<string[]>([
    "Restaurant",
    "Concert",
    "Retail",
    "Bar",
  ]);
  //for the user info pull
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LatLng>();
  const [showModal, setShowModal] = useState(false);
  const mapViewRef = useRef<MapView>(null);
  const [profilePic, setProfilePic] = useState("");

  useEffect(() => {
    if (selectedLocation) {
      mapViewRef.current?.animateToRegion(
        {
          latitude: selectedLocation?.latitude,
          longitude: selectedLocation?.longitude,
          latitudeDelta: 0,
          longitudeDelta: 0,
        },
        300
      );
    }
  }, [selectedLocation]);

  const handleAddTag = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setCustomTag("");
  };

  const resetForm = () => {
    setSuggestedTags([]);
    setShowSuggestedTags(false);
    setSelectedTags([]);
    setIdeaTitle("");
    setDescription("");
    setShowMap(false);
    setCustomTag("");
    setAllTags(["Restaurant", "Concert", "Retail", "Bar"]);
    //setFirstName("");
    //setLastName("");
    setSelectedLocation(undefined);
    setShowModal(false);
    //setProfilePic("");
  };

  const handleTitleChange = (text: string) => {
    if (text) {
      setIdeaTitle(text);
      fetchSuggestedTags(text);
    } else {
      setIdeaTitle(text);
    }
  };
  const fetchSuggestedTags = async (title: string) => {
    const titleTokens = title
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.trim() !== "");
    try {
      const tagsSnapshot = await get(ref(db, "ideaTags"));
      const suggestedTags: string[] = [];

      // Iterate over the snapshot to filter matching tags
      tagsSnapshot.forEach((tagSnapshot) => {
        const tagName = tagSnapshot.key.toLowerCase();
        // Check if the tag name contains any of the title tokens
        if (titleTokens.some((token) => tagName.includes(token))) {
          suggestedTags.push(tagName);
        }
      });

      setSuggestedTags(suggestedTags);
      setShowSuggestedTags(true);
    } catch (error) {
      console.error("Error fetching suggested tags:", error);
      // Optionally, handle the error or set default values for suggested tags
    }
  };
  const toggleTag = (tag: string) => {
    // Check if the clicked tag is a custom tag

    if (!tags.includes(tag) && !suggestedTags.includes(tag)) {
      return;
    }

    // Toggle preset tags
    if (selectedTags.includes(tag)) {
      setSelectedTags(
        selectedTags.filter((selectedTag) => selectedTag !== tag)
      );
    } else {

      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    if (customTag && !tags.includes(customTag)) {
      setAllTags([...tags, customTag]);
      setSelectedTags([...selectedTags, customTag]);
      setCustomTag("");
      Keyboard.dismiss(); // Dismiss the keyboard
      setShowModal(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  //handle creation
  const userId = auth.currentUser?.uid;
  const [isFocused, setIsFocused] = useState(false);
  useFocusEffect(() => {
    if (!isFocused) {
      onValue(
        ref(db, "/users/" + userId),
        (snapshot) => {
          setFirstName(snapshot.val().firstName);
          setLastName(snapshot.val().lastName);
          setProfilePic(snapshot.val().profilePicture);
        }
      );
    }

    setIsFocused(true);
  });

  const handleCreate = () => {
    if (!ideaTitle) {
      Alert.alert(
        "Warning",
        "Please Enter a Title to Proceed with Idea Creation"
      );
      return;
    }

    Alert.alert("Confirm Create", "Would you like to create this idea?", [
      {
        text: "Cancel",
        onPress: () => {},
        style: "cancel",
      },
      { text: "Create", onPress: () => handleSubmit() },
    ]);
  };

  const handleSubmit = async () => {
    const dataRef = ref(db, "ideas");
    const currentDate = new Date();
    // Format the date as per your requirement
    const formattedDate = `${currentDate.getFullYear()}-${
      currentDate.getMonth() + 1
    }-${currentDate.getDate()}`;
    const ideaRef = push(dataRef, {
      name: ideaTitle,
      creator: auth.currentUser?.uid,
      creatorName: "" + firstName + " " + lastName,
      createdAt: formattedDate,
      description: description,
      location: selectedLocation,
      certified: false,
      votes: 0,
      creatorProfilePic: profilePic,
    });
    const ideaId = ideaRef.key;
    selectedTags.forEach(async (tag) => {
      const formattedTag = tag.toLowerCase();
      const tagPath = `ideaTags/${formattedTag}`;
      const tagSnapshot = await get(ref(db, tagPath));

      if (tagSnapshot.exists()) {
        await push(ref(db, tagPath), ideaId);
      } else {
        await set(ref(db, tagPath), [ideaId]);
      }
    });
    const userIdeasPath = `userIdeas/${userId}`;
    await update(ref(db, userIdeasPath), { [ideaId!]: true });

    Alert.alert("Congratulations", "Your idea has been created successfully!");
    resetForm();
    setIsFocused(false);
  };

  const handleMapPress = (event: MapPressEvent) => {
    if (event.nativeEvent && event.nativeEvent.coordinate) {
      const { coordinate } = event.nativeEvent;
      // Pass the selected location to the state
      setSelectedLocation(coordinate);
    } else {
      // Handle the case where coordinate property doesn't exist in event.nativeEvent
      console.error("Coordinate property doesn't exist in event.nativeEvent");
    }
  };
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <ScrollView>
        {/* <View> */}
        {/* Create Idea Title Banner */}
        <View style={styles.topContainer}>
          <Text style={styles.topTitleText}>Create Idea</Text>
        </View>
        {/* Tags Container */}
        <View style={styles.tagContainer}>
          <Text style={styles.label}>Select Tags:</Text>
          <View style={styles.tagRow}>
            {/* Render default tags */}
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={
                  selectedTags.includes(tag)
                    ? styles.tagButtonSelected
                    : styles.tagButton
                }
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={
                    selectedTags.includes(tag)
                      ? styles.tagTextSelected
                      : styles.tagText
                  }
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* Add Tag Button */}
        <TouchableOpacity style={styles.tagButton} onPress={handleAddTag}>
          <Text style={styles.tagButtonText}>+ Add Tag</Text>
        </TouchableOpacity>
        {/* Custom Tag Modal */}
        <Modal visible={showModal} animationType="slide" transparent={true}>
          <TouchableWithoutFeedback onPress={handleModalClose}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Custom Tag"
                  placeholderTextColor="#888"
                  value={customTag}
                  onChangeText={setCustomTag}
                />
                <Button title="Submit" onPress={addCustomTag} />
                <Button title="Cancel" onPress={handleModalClose} />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Location Container */}
        <View style={styles.ideaTitleContainer}>
          <Text style={styles.label}>Location: </Text>
          <TouchableOpacity
            style={[
              styles.locationButton,
              selectedLocation ? styles.locationButtonSelected : null,
            ]}
            onPress={() => setShowMap(true)}
          >
            <Text
              style={[
                styles.locationButtonText,
                selectedLocation ? styles.tagTextSelected : null,
              ]}
            >
              {selectedLocation ? "Change Location" : "Select Location"}
            </Text>
          </TouchableOpacity>
        </View>
        {ideaTitle !== "" && showSuggestedTags && (
          <View style={styles.suggestedTagsContainer}>
            <Text style={styles.label}>Suggested Tags:</Text>
            <View style={styles.tagRow}>
              {suggestedTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={
                    selectedTags.includes(tag)
                      ? styles.tagButtonSelected
                      : styles.tagButton
                  }
                  onPress={() => toggleTag(tag)}
                >
                                  <Text
                  style={
                    selectedTags.includes(tag)
                      ? styles.tagTextSelected
                      : styles.tagText
                  }
                >
                  {tag}
                </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <KeyboardAvoidingView style={{flex:1,
            width: "100%",
            height: 50,}}
            behavior={Platform.OS === "ios" ? "position" : "height"}
            keyboardVerticalOffset={400}>
        {/* Idea Title Container */}
        <View style={styles.ideaTitleContainer}>
          {/* <Text style={styles.label}>Idea Title:</Text> */}
          <TextInput
            style={styles.textInput}
            placeholder="Title..."
            value={ideaTitle}
            onChangeText={handleTitleChange}
          />
        </View>
        </KeyboardAvoidingView>
        {/* Description Container */}
        <View style={styles.descriptionContainer}>
          {/* <Text style={styles.label}>Description: </Text> */}
          <KeyboardAvoidingView style={{flex:1,
            width: "100%",
            height: 250,}}
            behavior={Platform.OS === "ios" ? "position" : "height"}
            keyboardVerticalOffset={400}>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInputMultiline}
              placeholder="Description..."
              value={description}
              onChangeText={(text) => setDescription(text)}
              multiline={true}
            />
          </View>
          </KeyboardAvoidingView>
        </View>
        {/* Create Button Container */}
        <View style={styles.createButtonContainer}>
          <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
            <Text style={styles.createText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Map Popup */}
        {showMap && (
          <View style={styles.mapPopupContainer}>
            <MapView
              ref={mapViewRef}
              style={{ height: 300 }}
              initialRegion={packedRegion}
              onPress={handleMapPress}
            >
              {selectedLocation && (
                <Marker
                  coordinate={selectedLocation}
                  title="Selected Location"
                  description={`Lat: ${selectedLocation.latitude}, Long: ${selectedLocation.longitude}`}
                />
              )}
            </MapView>
            <View style={styles.closeMapButtonContainer}>
              <TouchableOpacity onPress={() => setShowMap(false)}>
                <Text style={styles.closeMapButtonText}>Close Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* </View> */}
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

export default CreateScreen;

const styles = StyleSheet.create({
  suggestedTagsContainer: {
    marginTop: 10, // Adjust as needed
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    width: "70%", // Adjust as needed
    maxHeight: "100%", // Adjust as needed
    padding: 20,
    alignItems: "center",
  },
  locationButtonSelected: {
    backgroundColor: "#128B4A", // Change to desired color
  },
  descriptionContainer: {
    padding: 10,
  },
  closeMapButtonContainer: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1, // Ensure it appears above the map
  },

  closeMapButtonText: {
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#000000",
  },
  createButtonContainer: {
    alignItems: "flex-end",
    marginTop: 20,
    marginRight: 20,
  },
  createButton: {
    // bottom: -270,
    // right: 0,
    backgroundColor: "#128B4A",
    padding: 20,
    borderRadius: 10,
    width: "30%",
  },
  createText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
    textAlign: "center",
  },
  textInputMultiline: {
    flex: 1,
    height: 230,
    borderColor: "#B5B5B5",
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginLeft: 5,
    backgroundColor:"white"
  },
  textInputContainer: {
    flex: 1,
    flexDirection: "row",
    marginTop: 10,
    backgroundColor:"white",
  },
  textInput: {
    flex: 1,
    height: 40,
    borderColor: "#B5B5B5",
    borderRadius: 5,
    borderWidth: 1,
    padding: 10,
    marginLeft: 5,
    backgroundColor: "white"
  },
  ideaTitleContainer: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  label: {
    fontSize: 15,
    padding: 5,
  },

  topContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: "#94F8B3",
  },
  tagContainer: {
    padding: 10,
  },
  tagButton: {
    backgroundColor: "#94F8B3",
    paddingHorizontal: 13,
    paddingVertical: 10,
    margin: 5,
    borderRadius: 5,
  },
  tagButtonSelected: {
    backgroundColor: "#128B4A",
    color: "#94F8B3",
    padding: 10,
    margin: 5,
    borderRadius: 5,
  },

  tagText: {
    color: "#128B4A",
    fontWeight: "bold",
    textAlign: "center",
  },
  tagTextSelected: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  topTitleText: {
    color: "#128B4A",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 17,
  },
  locationButton: {
    backgroundColor: "#128B4A",
    padding: 10,
    borderRadius: 10,
    width: "34%",
  },
  locationButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  tagButtonText: {
    color: "#128B4A",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 10, // Add horizontal padding
    paddingVertical: 0, // Add vertical padding
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    width: "70%",
  },
  mapPopupContainer: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999, // Ensure it appears above other content
  },
});
