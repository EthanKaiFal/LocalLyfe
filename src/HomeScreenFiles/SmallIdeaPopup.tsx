import React, { useState } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  PanResponder,
  Animated,
  Image,
} from "react-native";
import { Feather, AntDesign, MaterialIcons } from "@expo/vector-icons";
import { styles } from "./HSStyleSheet";
import { FIREBASE_AUTH as auth, FIREBASE_DB as db } from "../../firebaseConfig";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ParamListBase, useNavigation } from "@react-navigation/native";
import { Idea } from "../../DataBaseType";
import emptyProfile from "../../assets/profile.png";

interface SmallIdeaPopUpProps {
  selectedMarker: Idea;
  onUpVoteClick: (marker: Idea) => void;
  onFollowClick: (marker: Idea) => void;
  onCertifyClick: (marker: Idea) => void;
  onDeleteIdeaClick: (marker: Idea) => void;
  admin: boolean;
  council: boolean;
  closeTextBox: () => void;
  onSmallPopUpClick: () => void;
}

const SmallIdeaPopUp: React.FC<SmallIdeaPopUpProps> = (props) => {
  const {
    selectedMarker,
    onUpVoteClick,
    onFollowClick,
    onCertifyClick,
    onDeleteIdeaClick,
    admin,
    council,
    closeTextBox,
    onSmallPopUpClick,
  } = props;

  //utility to force a redraw
  const [forceRender, setForceRender] = useState<number>(0);

  // Function to force re-render
  const reRender = () => {
    setForceRender(forceRender + 1);
  };
  const [isEditClicked, setIsEditClicked] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const userId = auth.currentUser!.uid;
  const isMyIdea = selectedMarker.creator == userId;
  //setup the pan responder
  const swipeUp = new Animated.Value(0);
  const emptyPhotoURI = Image.resolveAssetSource(emptyProfile).uri;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy < 0) {
        // Swiping up
        swipeUp.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy < -50) {
        //trigger the big idea popup to show
        onSmallPopUpClick();
        swipeUp.setValue(0);
        //console.log('Swiped up!');
      }
      Animated.spring(swipeUp, {
        toValue: 0,
        useNativeDriver: false, // Add this line if you see any warning regarding native driver
      }).start();
    },
  });
  const animatedStyle = {
    transform: [{ translateY: swipeUp }],
  };

  const handleEditClick = () => {
    setIsEditClicked(!isEditClicked);
    navigation.navigate("EditScreen", {
      idea: selectedMarker,
    });
  };

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        backgroundColor: "red",
        justifyContent: "center",
      }}
      {...panResponder.panHandlers}
    >
      <Animated.View style={{ ...styles.textBox, ...animatedStyle }}>
        {/* top portion certified */}
        {selectedMarker.certified && (
          <View
            style={{
              alignItems: "center",
              backgroundColor: "blue",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <Text
              style={{ color: "white", backgroundColor: "blue", padding: 1 }}
            >
              Certified
            </Text>
          </View>
        )}
        {!selectedMarker.certified && (
          <View
            style={{
              alignItems: "center",
              backgroundColor: "white",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <Text
              style={{ color: "white", backgroundColor: "white", padding: 1 }}
            >
              Certified
            </Text>
          </View>
        )}

        {/* rest should be actual content */}
        <View style={{ flexDirection: "row" }}>
          {/* vote stuff */}
          <View style={styles.voteContainer}>
            <Text style={styles.voteNum}>{selectedMarker.votes} votes</Text>
            <TouchableOpacity
              style={[
                styles.voteIconContainer,
                {
                  backgroundColor: selectedMarker.isVoted
                    ? "#128B4A"
                    : "#CEFFDD",
                },
              ]}
              onPress={() => onUpVoteClick(selectedMarker)}
            >
              <Feather
                name="thumbs-up"
                size={35}
                style={{
                  color: selectedMarker.isVoted ? "#CEFFDD" : "#128B4A",
                }}
              />
            </TouchableOpacity>
          </View>
          {/* main idea info */}
          <View style={styles.mainIdeaBox}>
            <View
              style={[
                styles.mainIdeaInfo,
                { width: isMyIdea ? "80%" : "100%" },
              ]}
            >
              <View style={styles.user}>
                <Image source={selectedMarker.creatorProfilePic ? { uri: selectedMarker.creatorProfilePic } : { uri: emptyPhotoURI }} style={styles.avatar} />
                <Text style={styles.username}>{selectedMarker.creatorName}</Text>
              </View>
              <Text numberOfLines={1} style={styles.ideaName}>
                {selectedMarker.name}
              </Text>
              <Text numberOfLines={3} style={styles.ideaDescription}>
                {selectedMarker.description}
              </Text>
            </View>
            {isMyIdea && (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={handleEditClick}
              >
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={{ justifyContent: "flex-start", alignItems: "flex-end" }}>
          {/* buttons */}
          <View style={styles.buttons}>
            {council && (
              <TouchableOpacity
                style={[
                  styles.followButton,
                  {
                    backgroundColor: selectedMarker.certified
                      ? "grey"
                      : "#D3D3D3",
                  },
                  { marginTop: 5 },
                ]}
                onPress={() => {
                  onCertifyClick(selectedMarker);
                  reRender();
                }}
              >
                <AntDesign name="heart" size={12} color="red" />
                <Text style={styles.followText}>Certify</Text>
              </TouchableOpacity>
            )}

            {(isMyIdea || admin) && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {onDeleteIdeaClick(selectedMarker); reRender();}}
              >
                <MaterialIcons name="delete" size={24} color="grey" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.followButton,
                {
                  backgroundColor: selectedMarker.isFollowed
                    ? "grey"
                    : "#C3C3C3",
                },
              ]}
              onPress={() => onFollowClick(selectedMarker)}
            >
              <AntDesign name="heart" size={12} color="red" />
              <Text style={styles.followText}>Follow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.commentButton}
              onPress={() => onSmallPopUpClick()}
            >
              <Text style={styles.commentText}>Comments</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={closeTextBox} style={styles.closeButton}>
              <AntDesign name="close" size={15} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

export default SmallIdeaPopUp;
