import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { searchStyles as styles } from "./SearchIdeaStyles";
import { Feather } from "@expo/vector-icons";
import { Idea } from "../../DataBaseType";
import { Region } from "../screens/HomeScreen";
import { FIREBASE_AUTH as auth } from "../../firebaseConfig";
import { FIREBASE_DB as db } from "../../firebaseConfig";
import { child, get, ref, remove, set, update } from "firebase/database";

interface SearchIdeaProps {
  screenIdeas: Idea[];
  setScreenIdeas: (ideas: Idea[]) => void;
  setSelectedMarker: (idea: Idea) => void;
  searchValue: string;
  boundaries: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  };
  setExpanded: (expanded: boolean) => void;
  setRegion: (region: Region) => void;
  closeSearchBox: () => void;
}

const SearchIdea: React.FC<SearchIdeaProps> = (props) => {
  const {
    screenIdeas,
    setScreenIdeas,
    setSelectedMarker,
    searchValue,
    boundaries,
    setExpanded,
    setRegion,
    closeSearchBox,
  } = props;

  const { northEast, southWest } = boundaries;
  const { latitude: northLat, longitude: eastLong } = northEast;
  const { latitude: southLat, longitude: westLong } = southWest;
  const userId = auth.currentUser?.uid;

  const filteredIdeas = screenIdeas.filter(
    (idea) =>
      idea.name && idea.name.toLowerCase().includes(searchValue.toLowerCase())
  );

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
      setScreenIdeas(updatedIdeas);
    }
  };

  return (
    <View style={styles.textBox}>
      <ScrollView>
        {filteredIdeas.map((idea: Idea) => {
          const { latitude, longitude } = idea.location;

          return (
            idea.location !== undefined &&
            longitude >= westLong &&
            longitude <= eastLong &&
            latitude <= northLat &&
            latitude >= southLat && (
              <View key={idea.ideaId} style={styles.ideaContainer}>
                <View style={styles.voteIconContainer}>
                  <TouchableOpacity
                    style={[
                      styles.voteIconBox,
                      {
                        backgroundColor: idea.isVoted ? "#128B4A" : "#CEFFDD",
                      },
                    ]}
                    onPress={() => {
                      handleVote(idea);
                    }}
                  >
                    <Feather
                      style={
                        (styles.voteIcon,
                        {
                          color: idea.isVoted ? "#CEFFDD" : "#128B4A",
                        })
                      }
                      name="thumbs-up"
                      size={25}
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.titleContainer}
                  onPress={() => {
                    closeSearchBox();
                    setSelectedMarker(idea);
                    setRegion({
                      latitude: idea.location.latitude,
                      longitude: idea.location.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    });
                  }}
                >
                  <Text style={styles.ideaTitle} numberOfLines={1}>
                    {idea.name}
                  </Text>
                </TouchableOpacity>
                <View style={styles.infoContainer}>
                  <TouchableOpacity
                    style={styles.infoBox}
                    onPress={() => {
                      closeSearchBox();
                      setSelectedMarker(idea);
                      setExpanded(true);
                    }}
                  >
                    <Text style={styles.infoText}>more info</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          );
        })}
      </ScrollView>
    </View>
  );
};

export default SearchIdea;
