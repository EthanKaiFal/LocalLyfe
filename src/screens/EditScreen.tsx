import {
  StyleSheet,
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
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import MapView, { Marker, MapPressEvent, LatLng } from "react-native-maps";
import { FIREBASE_AUTH as auth, FIREBASE_DB as db } from "../../firebaseConfig";
import { ref, set, push, get, update, remove } from "firebase/database";
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { Region, packedRegion } from "./HomeScreen";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Idea } from "../../DataBaseType";

type EditParamList = {
  EditScreen: {
    idea: Idea;
  };
};

const EditScreen: React.FC = (props) => {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<EditParamList, "EditScreen">>();
  const { idea } = route.params;
  const { ideaId } = idea;
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showSuggestedTags, setShowSuggestedTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [initialTags, setInitialTags] = useState<string[]>([]);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const [tags, setAllTags] = useState<string[]>([]);
  //for the user info pull
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [ideaEdited, setIdeaEdited] = useState(false);

  const mapViewRef = useRef<MapView>(null);

  useEffect(() => {
    const { latitude, longitude } = idea.location;

    if (latitude && longitude) {
      setSelectedLocation(idea.location);
      setInitialRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }

    setIdeaTitle(idea.name);
    setDescription(idea.description);
    setSuggestedTags([]);

    // setting current user tags
    const setCurrentTags = async (): Promise<void> => {
      const tagRef = ref(db, "ideaTags");
      const tagSnapshot = await get(tagRef);
      const newTags = ["Restaurant", "Concert", "Retail", "Bar"];

      const newSelectedTags: string[] = [];

      tagSnapshot.forEach((tag) => {
        const tagKey = tag.key;
        const tagJSON = tag.val();

        Object.entries(tagJSON).forEach(([key, value]) => {
          if (value === ideaId) {
            const tagName = `${tagKey[0].toUpperCase()}${tagKey.slice(1)}`;
            if (!newTags.includes(tagName)) {
              newTags.push(tagName);
            }
            if (!newSelectedTags.includes(tagName)) {
              newSelectedTags.push(tagName);
            }
          }
        });
      });

      setAllTags(newTags);
      setSelectedTags(newSelectedTags);
      setInitialTags(newSelectedTags);
    };

    setCurrentTags();

    if (selectedTags.length === 0) {
      setAllTags(["Restaurant", "Concert", "Retail", "Bar"]);
    }
  }, [idea]);

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

  const handleModalClose = () => {
    setShowModal(false);
    setCustomTag("");
  };

  const toggleTag = (tag: string) => {
    if (!tags.includes(tag)) {
      return;
    }

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

  const handleBack = () => {
    navigation.navigate("HomeScreen");
  };

  const handleEdit = async () => {
    if (!ideaTitle) {
      Alert.alert("Warning", "Please Enter a Title to Proceed with Idea Edit");
      return;
    }

    Alert.alert("Confirm Edit", "Would you like to edit this idea?", [
      {
        text: "Cancel",
        onPress: () => {},
        style: "cancel",
      },
      { text: "Edit", onPress: () => handleSubmit() },
    ]);
  };

  const handleSubmit = async () => {
    const ideaRef = ref(db, `ideas/${idea.ideaId}`);

    await update(ideaRef, {
      name: ideaTitle,
      description: description,
      location: selectedLocation,
    });
    editUserTags();
    Alert.alert("Congratulations", "Your idea has been edited successfully.");
    setIdeaEdited(true);
    navigation.navigate("HomeScreen", { ideaEdited, setIdeaEdited });
  };

  const editUserTags = async () => {
    const tagsToRemove = initialTags.filter(
      (tag) => !selectedTags.includes(tag)
    );

    const tagsToAdd = selectedTags.filter((tag) => !initialTags.includes(tag));

    // add tags in DB
    for (const tag of tagsToAdd) {
      const tagName = tag.toLowerCase();
      const tagRef = ref(db, `ideaTags/${tagName}`);
      const tagSnapshot = await get(tagRef);

      if (tagSnapshot.exists()) {
        await push(tagRef, ideaId);
      } else {
        await set(tagRef, [ideaId]);
      }
    }

    // remove tags in DB
    for (const tag of tagsToRemove) {
      const tagName = tag.toLowerCase();
      const tagRef = ref(db, `ideaTags/${tagName}`);
      const tagSnapshot = await get(tagRef);
      const tagVal = tagSnapshot.val();

      // remove entire column if there's only one id in tag
      if (tagVal.length === 1 && tagVal[Object.keys(tagVal)[0]] === ideaId) {
        await remove(tagRef);
      }
      // remove only id row from the tag column
      Object.entries(tagSnapshot.val()).forEach(async ([key, value]) => {
        if (value === ideaId) {
          const nodeToRemoveRef = ref(db, `ideaTags/${tagName}/${key}`);
          await remove(nodeToRemoveRef);
        }
      });
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    if (event.nativeEvent && event.nativeEvent.coordinate) {
      const { coordinate } = event.nativeEvent;
      // Pass the selected location to the state
      setSelectedLocation(coordinate);
    } else {
      console.error("Coordinate property doesn't exist in event.nativeEvent");
    }
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
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <ScrollView>
          <View style={styles.topContainer}>
            <Text style={styles.topTitleText}>Edit Idea</Text>
          </View>
          <View style={styles.tagContainer}>
            <Text style={styles.label}>Select Tags:</Text>
            <View style={styles.tagRow}>
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
          <TouchableOpacity
            style={styles.tagButton}
            onPress={() => setShowModal(true)}
          >
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
                    style={styles.tagButton}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <View style={styles.ideaTitleContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Title"
              value={ideaTitle}
              onChangeText={handleTitleChange}
            />
          </View>
          <View style={styles.descriptionContainer}>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInputMultiline}
                placeholder="Description"
                value={description}
                onChangeText={(text) => setDescription(text)}
                multiline={true}
              />
            </View>
          </View>
          <View style={styles.createButtonContainer}>
            <TouchableOpacity style={styles.createButton} onPress={handleEdit}>
              <Text style={styles.createText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Map Popup */}
          {showMap && (
            <View style={styles.mapPopupContainer}>
              <MapView
                ref={mapViewRef}
                style={{ height: 300 }}
                initialRegion={initialRegion ? initialRegion : packedRegion}
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
    </View>
  );
};

export default EditScreen;

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
  },
  textInputContainer: {
    flex: 1,
    flexDirection: "row",
    marginTop: 10,
  },
  textInput: {
    flex: 1,
    height: 40,
    borderColor: "#B5B5B5",
    borderRadius: 5,
    borderWidth: 1,
    padding: 10,
    marginLeft: 5,
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
