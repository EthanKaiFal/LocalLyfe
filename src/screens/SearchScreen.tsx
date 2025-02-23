import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Button,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  FlatList,
  Alert,
  Image,
} from "react-native";
import React, { useEffect, useState } from "react";
import Modal from "react-native-modal";
import { AntDesign, Feather, FontAwesome } from "@expo/vector-icons";
import { FIREBASE_AUTH as auth, FIREBASE_DB as db } from "../../firebaseConfig";
import { ref, get, child, remove, update } from "firebase/database";
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Idea } from "../../DataBaseType";
import emptyProfile from "../../assets/profile.png";

type SearchScreenParamList = {
  SearchScreen: {
    ideas: Idea[];
    setIdeas: (value: Idea[]) => void;
  };
};

function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<SearchScreenParamList, "SearchScreen">>();
  const { ideas, setIdeas } = route.params;
  const [screenIdeas, setScreenIdeas] = useState<Idea[]>(ideas ?? []);
  const userId = auth.currentUser?.uid;
  const [isModalVisible, setModalVisible] = useState(false);
  const [tagCounter, setTagCounter] = useState(0);
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [searchedIdeas, setSearchedIdeas] = useState<Idea[]>([]);
  const [isSearched, setIsSearched] = useState(false);
  const emptyPhotoURI = Image.resolveAssetSource(emptyProfile).uri;

  useEffect(() => {
    if (ideas) {
      setScreenIdeas(ideas);
    }
  }, [ideas]);

  useEffect(() => {
    if (screenIdeas) {
      setIdeas(screenIdeas);
    }
  }, [screenIdeas]);

  useEffect(() => {}, [isSearched]);

  const handleSearch = async () => {
    let redefineTags: string[] = [];
    tags.forEach((tag) => {
      const redefine = tag
        .toLowerCase()
        .split(/\s+/)
        .filter((token) => token.trim() !== "");
      redefineTags = [...redefineTags, ...redefine];
    });

    handleSearchHelper(redefineTags);
  };

  const handleSearchHelper = async (searchTags: string[]) => {
    const tagsSnapshot = await get(ref(db, "ideaTags"));
    const filterSearchedIdeas: Idea[] = [];
    tagsSnapshot.forEach((tagSnapshot) => {
      const tagName = tagSnapshot.key.toLowerCase();
      // Check if the tag name contains any of the title tokens
      if (searchTags.some((token) => tagName.includes(token))) {
        Object.entries(tagSnapshot.val()).forEach(([key, value]) => {
          const foundIdea = ideas.find((idea) => value === idea.ideaId);
          const isIdeaIncluded = filterSearchedIdeas.find(
            (idea) => idea.ideaId === value
          );
          if (foundIdea && !isIdeaIncluded) {
            filterSearchedIdeas.push(foundIdea);
          }
        });
      }
    });
    if (filterSearchedIdeas.length === 0) {
      Alert.alert("Warning", "No ideas found with the entered tag.");
      return;
    } else {
      setSearchedIdeas(filterSearchedIdeas);
      setIsSearched(true);
      closeModal();
    }
  };

  const closeModal = async () => {
    clearSearch();
    setModalVisible(false);
  };

  const clearSearch = () => {
    setTags([]);
  };

  const handleSaveTag = () => {
    // Create a new variable name based on the counter
    if (tag.trim() !== "") {
      // Update the state with the new tag variable name
      setTags((prevTags) => [...prevTags, tag.trim()]);

      // Increment the counter for the next tag
      setTagCounter((prevCounter) => prevCounter + 1);

      // Clear the input field
      setTag("");
    }
  };

  // Removing a tag for the search window
  const handleRemoveTag = (index: any) => {
    const updatedTags = [...tags];
    updatedTags.splice(index, 1);
    setTags(updatedTags);
  };

  const handleIdeaPress = (idea: Idea, expanded: boolean) => {
    navigation.navigate("HomeScreen", { idea, expanded });
  };

  const handleVote = async (idea: Idea) => {
    if (!idea) return;
    const { votes, ideaId } = idea;
    let updatedIdea = {} as Idea;

    const userIdeasVotedRef = ref(db, `userIdeasVoted/${userId}`);
    const ideaVoteSnapshot = await get(child(userIdeasVotedRef, ideaId));
    const ideaRef = ref(db, `ideas/${ideaId}`);

    if (ideaVoteSnapshot.exists()) {
      await remove(child(userIdeasVotedRef, ideaId));
      await update(ideaRef, {
        votes: votes - 1,
      });
      updatedIdea = { ...idea, votes: votes - 1, isVoted: false };
    } else {
      await update(userIdeasVotedRef, { [ideaId]: true });
      await update(ideaRef, {
        votes: votes + 1,
      });
      updatedIdea = { ...idea, votes: votes + 1, isVoted: true };
    }
    if (updatedIdea.isVoted !== undefined) {
      const updatedIdeas: Idea[] = screenIdeas.map((idea) => {
        if (idea.ideaId === ideaId) {
          return updatedIdea;
        }
        return idea;
      });
      const updatedSearchedIdeas: Idea[] = searchedIdeas.map((idea) => {
        if (idea.ideaId === ideaId) {
          return updatedIdea;
        }
        return idea;
      });
      setScreenIdeas(updatedIdeas);
      setSearchedIdeas(updatedSearchedIdeas);
    }
  };

  const handleFollow = async (idea: Idea) => {
    if (!idea) return;

    const { ideaId } = idea;
    let updatedIdea = {} as Idea;

    const userIdeasFollowedRef = ref(db, `userIdeasFollowed/${userId}`);
    const ideaFollowedSnapshot = await get(child(userIdeasFollowedRef, ideaId));

    if (ideaFollowedSnapshot.exists()) {
      await remove(child(userIdeasFollowedRef, ideaId));
      updatedIdea = { ...idea, isFollowed: false };
    } else {
      await update(userIdeasFollowedRef, { [ideaId]: true });
      updatedIdea = { ...idea, isFollowed: true };
      // TODO: notification here
    }
    if (updatedIdea.isFollowed !== undefined) {
      const updatedIdeas: Idea[] = screenIdeas.map((idea) => {
        if (idea.ideaId === ideaId) {
          return updatedIdea;
        }
        return idea;
      });
      const updatedSearchedIdeas: Idea[] = searchedIdeas.map((idea) => {
        if (idea.ideaId === ideaId) {
          return updatedIdea;
        }
        return idea;
      });
      setScreenIdeas(updatedIdeas);
      setSearchedIdeas(updatedSearchedIdeas);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.rowContainer}>
        <TouchableOpacity
          style={styles.filterContainer}
          onPress={() => {
            setModalVisible(true);
          }}
        >
          <Text style={styles.filterText}>Filter</Text>
          <FontAwesome
            style={{ paddingLeft: 7 }}
            name="search"
            size={20}
            color="white"
          />
        </TouchableOpacity>

        {/* need to add view and scroll feature */}

        {/* UI view for the pop up window */}
        <Modal isVisible={isModalVisible}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.searchPopUpContainer}>
              {/* <View style={styles.filtersContainer}> */}

              <View style={styles.titleContainer}>
                <Text style={styles.searchTagsText}>Search Tag:</Text>
              </View>
              <View style={styles.loadTags}>
                <View style={styles.tags}>
                  {tags.map((t, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleRemoveTag(index)}
                    >
                      <Text style={styles.tagsText}>{`${t}   `}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.textInputContainer}>
                <Text>Enter Tags:</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter a tag"
                  placeholderTextColor={"gray"}
                  value={tag}
                  onChangeText={setTag}
                  onSubmitEditing={handleSaveTag}
                />
              </View>

              <TouchableOpacity
                style={styles.clearButtonContainer}
                onPress={clearSearch}
              >
                <Text style={styles.clearButton}>Clear Tags</Text>
              </TouchableOpacity>

              {/* Save button to close out the Modal view */}
              <View style={styles.saveButton}>
                <Button title="Enter Search" onPress={handleSearch} />
                <Button title="Close" onPress={closeModal} />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
      <FlatList
        onRefresh={() => {
          setIsSearched(false);
        }}
        refreshing={false}
        data={isSearched ? searchedIdeas : screenIdeas}
        numColumns={1}
        renderItem={({ index, item }) => (
          <View>
            <View style={styles.row2Container}>
              {/* column container for Vote Counts and Icon */}
              <View
                style={[
                  styles.colContainer,
                  styles.smallColumn,
                  styles.votesContainter,
                ]}
              >
                <Text style={styles.voteNumText}> {item.votes} </Text>
                <TouchableOpacity
                  onPress={() => {
                    handleVote(item);
                  }}
                  style={[
                    styles.voteButton,
                    {
                      backgroundColor: item.isVoted ? "#128B4A" : "#C4F5D3",
                    },
                  ]}
                >
                  <Feather
                    name="thumbs-up"
                    size={24}
                    color={item.isVoted ? "#C4F5D3" : "#128B4A"}
                  />
                </TouchableOpacity>
              </View>

              {/* column container for Idea information */}
              <TouchableOpacity
                style={[styles.colContainer, styles.largeColumn, styles.idea]}
                onPress={() => {
                  handleIdeaPress(item, false);
                }}
              >
                <View style={styles.userNCreationContainer}>
                  <View style={styles.user}>
                    <Image
                      source={
                        item.creatorProfilePic
                          ? { uri: item.creatorProfilePic }
                          : { uri: emptyPhotoURI }
                      }
                      style={styles.avatar}
                    />
                    <Text style={styles.userText}>{item.creatorName}</Text>
                  </View>

                  <Text style={styles.creationDateText}>
                    {item.createdAt.toString()}
                  </Text>
                </View>
                <View style={styles.ideaTitle}>
                  <Text style={styles.ideaTitleText}>{item.name}</Text>
                </View>

                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={styles.ideaDescription}
                >
                  {item.description}
                </Text>
              </TouchableOpacity>

              {/* column container for follow and comment buttons */}
              <View
                style={[
                  styles.colContainer,
                  styles.smallColumn,
                  styles.followNcommentContainer,
                ]}
              >
                <View>
                  <TouchableOpacity
                    onPress={() => {
                      handleFollow(item);
                    }}
                  >
                    <View
                      style={[
                        styles.button,
                        styles.followButton,
                        {
                          backgroundColor: item.isFollowed ? "grey" : "#C6C6C6",
                        },
                      ]}
                    >
                      <AntDesign name="heart" size={12} color="red" />
                      <Text style={styles.followText}>Follow</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.button, styles.commentButton]}
                  onPress={() => handleIdeaPress(item, true)}
                >
                  <View>
                    <Text style={styles.commentText}>Comment</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

export default SearchScreen;

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "sandybrown",
  },
  filterContainer: {
    flexDirection: "row",
    height: 40,
    width: 150,
    marginTop: 5,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#128B4A",
  },
  filterText: {
    fontSize: 17,
    color: "white",
    fontWeight: "bold",
  },
  searchPopUpContainer: {
    flex: 0.3,
    flexDirection: "column",
    backgroundColor: "white",
  },
  filtersContainer: {
    flexDirection: "row",
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    // backgroundColor: "blue",
  },
  titleContainer: {
    flexDirection: "row",
    // flex: 1,
    height: 50,
    justifyContent: "center",
    padding: 10,
  },
  searchTagsText: {
    fontSize: 25,
    fontWeight: "bold",
  },
  loadTags: {
    flex: 0.4,
    alignItems: "center",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 5,
  },
  tagsText: {
    fontWeight: "bold",
    fontSize: 18,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    margin: 2.5,
    borderColor: "black",
    color: "#128B4A",
    textAlign: "center",
    backgroundColor: "lightgrey",
  },
  textInputContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 75,
    width: "100%",
    // backgroundColor: "red",
  },
  textInput: {
    flex: 0.75,
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    padding: 10,
    marginLeft: 5,
    // backgroundColor: "beige"
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    height: 0.5,
    // backgroundColor: "purple",
  },
  clearButtonContainer: {
    // backgroundColor: "brown",
    position: "absolute",
    bottom: 40,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  clearButton: {
    // fontSize: 20,
    // fontWeight: "bold",
    borderWidth: 1,
    borderColor: "black",
    backgroundColor: "lightcoral",
    color: "white",
    padding: 5,
  },
  saveButton: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    // backgroundColor: "sandybrown",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  screenContainer: {
    flex: 1,
  },
  row2Container: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 125,
    borderBottomWidth: 2,
    borderColor: "#E2E2E2",
    // backgroundColor: "lightsteelblue",
  },
  colContainer: {
    flexDirection: "column",
    flex: 1,
    // backgroundColor: "pink"
  },
  smallColumn: {
    flex: 0.75,
    // backgroundColor: "teal"
  },
  // mediumColumn: {
  //   flex: 1,
  //   // backgroundColor: "darkseagreen",
  // },
  largeColumn: {
    flex: 2.5,
    // backgroundColor: "seashell",
  },

  // Trending Number Styling
  trendingNumContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  // trendingNumText: {
  //   fontSize: 20,
  //   fontWeight: "bold",
  // },

  // Vote Count Styling
  votesContainter: {
    // justifyContent: "space-around",
    paddingVertical: 25,
    alignItems: "center",
    // backgroundColor: "sandybrown",
  },
  voteNumText: {
    fontWeight: "bold",
    color: "#128B4A",
  },
  voteButton: {
    // backgroundColor: "#CEFFDD",
    borderRadius: 5,
    padding: 10,
  },

  idea: {
    // backgroundColor: "pink",
    padding: 8,
  },

  //  Idea Information
  userNCreationContainer: {
    flexDirection: "row",
    marginTop: 25,
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    // backgroundColor: "orchid",
  },
  user: {
    flexDirection: "row",
    // backgroundColor: "white",
    alignItems: "center",
  },
  userText: {
    fontSize: 10,
  },
  creationDateText: {
    fontSize: 10,
  },
  ideaTitle: {
    flex: 2,
    justifyContent: "center",
    marginTop: 15,
    // backgroundColor: "powderblue",
  },
  ideaTitleText: {
    fontSize: 19,
    fontWeight: "bold",
  },
  ideaDescription: {
    flex: 1.5,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "tomato",
  },
  ideaDescriptionText: {},

  // Follow and Comment Styling
  button: {
    padding: 8,
    borderRadius: 8,
  },
  followNcommentContainer: {
    justifyContent: "space-evenly",
    alignItems: "center",
    padding: 5,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D3D3D3",
  },
  followText: {
    color: "white",
    fontSize: 11,
    paddingLeft: 5,
  },
  commentButton: {
    backgroundColor: "#128B4A",
  },
  commentText: {
    color: "white",
    fontSize: 11,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 160,
    resizeMode: "cover",
    marginRight: 5,
  },
});
