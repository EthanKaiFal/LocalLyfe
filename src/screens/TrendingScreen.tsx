import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Image,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { FIREBASE_AUTH as auth, FIREBASE_DB as db } from "../../firebaseConfig";
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ref, get, child, remove, update } from "firebase/database";
import { Idea } from "../../DataBaseType";
import emptyProfile from "../../assets/profile.png";

type TrendingScreenParamList = {
  TrendingScreen: {
    ideas: Idea[];
    setIdeas: (value: Idea[]) => void;
  };
};

const TrendingScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<TrendingScreenParamList, "TrendingScreen">>();
  const { ideas, setIdeas } = route.params;
  // Pulling Idea Info
  const [screenIdeas, setScreenIdeas] = useState<Idea[]>(ideas ?? []);
  const [unSortedIdeas, setUnSortedIdeas] = useState<Idea[]>(ideas ?? []);
  const [sortedIdeas, setSortedIdeas] = useState<Idea[]>([]);
  const [renderOnce, setRenderOnce] = useState(true);
  const userId = auth.currentUser?.uid;
  const emptyPhotoURI = Image.resolveAssetSource(emptyProfile).uri;

  useEffect(() => {
    if (ideas) {
      setSortedIdeas(ideas);
    }
  }, [ideas]);

  useEffect(() => {
    setUnSortedIdeas(ideas);
    if (sortedIdeas) {
      const sortTrend = sortedIdeas.sort(
        (a, b) =>
          b.votes - a.votes ||
          new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()
      );

      setScreenIdeas(sortTrend);
    }
  }, [sortedIdeas]);

  useEffect(() => {}, [screenIdeas]);

  // --> semi-works: UI will update when user clicks to follow
  // --> doesn't work: when user clicks to unfollow UI isn't updated, but DB is updated
  // useEffect(() => {
  //   if (screenIdeas) {
  //     setIdeas(screenIdeas);
  //   }
  // }, [screenIdeas]);

  useEffect(() => {
    if (unSortedIdeas) {
      setIdeas(unSortedIdeas);
    }
  }, [unSortedIdeas]);

  const handleVote = async (idea: Idea) => {
    // console.log("called");
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
      const updatedIdeas: Idea[] = sortedIdeas.map((idea) => {
        if (idea.ideaId === ideaId) {
          return updatedIdea;
        }
        return idea;
      });
      const updatedUnSortedIdeas: Idea[] = unSortedIdeas.map((idea) => {
        if (idea.ideaId === ideaId) {
          return updatedIdea;
        }
        return idea;
      });
      setSortedIdeas(updatedIdeas);
      setUnSortedIdeas(updatedUnSortedIdeas);
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
      const updatedIdeas: Idea[] = sortedIdeas.map((idea) => {
        if (idea.ideaId === ideaId) {
          return updatedIdea;
        }
        return idea;
      });
      const updatedUnSortedIdeas: Idea[] = unSortedIdeas.map((idea) => {
        if (idea.ideaId === ideaId) {
          return updatedIdea;
        }
        return idea;
      });
      setSortedIdeas(updatedIdeas);
      setUnSortedIdeas(updatedUnSortedIdeas);
    }
  };

  const handleIdeaPress = (idea: Idea, expanded: boolean) => {
    navigation.navigate("HomeScreen", { idea, expanded });
  };

  return (
    <View style={styles.screenContainer}>
      <FlatList
        onRefresh={() => {}}
        refreshing={false}
        data={screenIdeas}
        numColumns={1}
        renderItem={({ index, item }) => (
          <View>
            <View style={styles.rowContainer}>
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
                >
                  <View
                    style={[
                      styles.voteButton,
                      { backgroundColor: item.isVoted ? "#128B4A" : "#C4F5D3" },
                    ]}
                  >
                    <AntDesign
                      name="like2"
                      size={24}
                      color={item.isVoted ? "#C4F5D3" : "#128B4A"}
                    />
                  </View>
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
                  <Text style={styles.ideaTitleText}>
                    #{index + 1} {item.name}
                  </Text>
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
                    onPressIn={() => {
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
};

export default TrendingScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 125,
    borderBottomWidth: 2,
    borderColor: "#E2E2E2",
  },
  colContainer: {
    flexDirection: "column",
    flex: 1,
  },
  smallColumn: {
    flex: 0.75,
  },
  largeColumn: {
    flex: 2.5,
  },
  // Trending Number Styling
  trendingNumContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  // Vote Count Styling
  votesContainter: {
    paddingVertical: 25,
    alignItems: "center",
  },
  voteNumText: {
    fontWeight: "bold",
    color: "#128B4A",
  },
  voteButton: {
    backgroundColor: "#CEFFDD",
    borderRadius: 5,
    padding: 10,
  },
  idea: {
    padding: 8,
  },
  //  Idea Information
  userNCreationContainer: {
    flexDirection: "row",
    marginTop: 25,
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  user: {
    flexDirection: "row",
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
  },
  ideaTitleText: {
    fontSize: 19,
    fontWeight: "bold",
  },
  ideaDescription: {
    flex: 1.5,
    justifyContent: "center",
    alignItems: "center",
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
