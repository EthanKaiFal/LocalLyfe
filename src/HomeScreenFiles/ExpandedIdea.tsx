import { bigIdeaStyles } from "./ExpandedIdeaStyle";
import React, { useState, useEffect } from "react";
import {
  TextInput,
  KeyboardAvoidingView,
  FlatList,
  Platform,
  Image,
} from "react-native";
import {
  TouchableOpacity,
  View,
  Dimensions,
  Text,
  PanResponder,
  Animated,
} from "react-native";
import { Feather, AntDesign, MaterialIcons } from "@expo/vector-icons";
// import { Comment } from "./Comment";
import { FIREBASE_AUTH as auth } from "../../firebaseConfig";
import { Idea, Comment } from "../../DataBaseType";
import { formatDistanceToNow, parse, parseISO } from "date-fns";
import emptyProfile from "../../assets/profile.png";

interface ExpandedIdeaProps {
  selectedMarker: Idea;
  commentText: string;
  setCommentText: (text: string) => void;
  onFollowClick: (marker: Idea) => void;
  onCertifyClick: (marker: Idea) => void;
  closeTextBox: () => void;
  onCommentUpVoteClick: (selectedMarker: Idea, comment: Comment) => void;
  onDeleteCommentClick: (marker: Idea, comment: Comment) => void;
  onDeleteIdeaClick: (marker: Idea) => void;
  isCVoted: string[];
  handleSendComment: (marker: Idea) => void;
  // handleRefresh: () => void;
  admin: boolean;
  council: boolean;
  setExpand: (expand: boolean) => void;
  certifiedMems: String[];
}

const ExpandedIdea: React.FC<ExpandedIdeaProps> = (props) => {
  const {
    selectedMarker,
    commentText,
    setCommentText,
    onFollowClick,
    onCertifyClick,
    closeTextBox,
    onCommentUpVoteClick,
    onDeleteCommentClick,
    onDeleteIdeaClick,
    isCVoted,
    handleSendComment,
    admin,
    council,
    setExpand,
    certifiedMems,
  } = props;
  //setup the pan responder
  const swipeUp = new Animated.Value(0);
  const textBoxSize = Dimensions.get("window").height / 1.2;
  const animatedStyle = {
    transform: [{ translateY: swipeUp }],
  };
  const [isCommentSend, setIsCommentSend] = useState<boolean>(false);
  const [forceRender, setForceRender] = useState<number>(0);
  const emptyPhotoURI = Image.resolveAssetSource(emptyProfile).uri;
  useEffect(() => {
    if (isCommentSend) {
      setCommentText("");
      setIsCommentSend(false);
    }
  }, [isCommentSend]);

  // Function to force re-render
  const reRender = () => {
    setForceRender(forceRender + 1);
  };

  const getCertified = (userName: String): String => {
    if (certifiedMems.includes(userName)) {
      console.log("comment");
      return "Certified";
    }
    return "";
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        // Swiping up
        swipeUp.setValue(gestureState.dy / 50);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 50) {
        //trigger the big idea popup to show
        setExpand(false);
      }
      Animated.spring(swipeUp, {
        toValue: 0,
        useNativeDriver: false, // Add this line if you see any warning regarding native driver
      }).start();
    },
  });
  const formatTimestamp = (dateString: string, timeString: string) => {
    // Parse the date string into year, month, and day components
    const [month, day, year] = dateString.split("/").map(Number);

    // Parse the time string into hour, minute, and second components
    const [hourMinute, amOrPm] = timeString.split(" ");
    let [hour, minute, second] = hourMinute.split(":").map(Number);

    // Adjust the hour to military time format (24-hour format)
    if (amOrPm === "AM" && hour === 12) {
      // Convert 12 AM to 00
      hour = 0;
    } else if (amOrPm === "PM" && hour !== 12) {
      // Add 12 to hour for PM timestamps (except if it's already 12 PM)
      hour += 12;
    }

    // Construct a Date object with the parsed components
    const timestamp = new Date(year, month - 1, day, hour, minute);

    // Calculate the distance from the timestamp to now
    const distanceToNow = formatDistanceToNow(timestamp);
    const formattedDistance =
      (distanceToNow.startsWith("about")
        ? distanceToNow.slice(6)
        : distanceToNow) + " ago";
    return formattedDistance;
  };

  const screenWidth = Dimensions.get("window").width;
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        width: screenWidth,
        minHeight: textBoxSize,
      }}
    >
      <Animated.View
        style={{ ...bigIdeaStyles.textBox, ...animatedStyle }}
        {...panResponder.panHandlers}
      >
        {/* certify line */}
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
        {/* main idea stuff first */}
        <View style={{ ...bigIdeaStyles.mainIdeaInfo, zIndex: 0 }}>
          <View style={bigIdeaStyles.user}>
            <Image
              source={
                selectedMarker.creatorProfilePic
                  ? { uri: selectedMarker.creatorProfilePic }
                  : { uri: emptyPhotoURI }
              }
              style={bigIdeaStyles.ideaAvatar}
            />
            <Text style={{ ...bigIdeaStyles.username, zIndex: 0 }}>
              {selectedMarker?.creatorName}
            </Text>
          </View>

          <Text numberOfLines={1} style={bigIdeaStyles.ideaName}>
            {selectedMarker?.name}
          </Text>
          <Text numberOfLines={13} style={bigIdeaStyles.description}>
            {selectedMarker?.description}
          </Text>
        </View>

        <View style={{ justifyContent: "flex-start", alignItems: "flex-end" }}>
          {/* buttons */}
          <View style={bigIdeaStyles.buttons}>
            {council && (
              <TouchableOpacity
                style={[
                  bigIdeaStyles.followButton,
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
                <Text style={bigIdeaStyles.followText}>Certify</Text>
              </TouchableOpacity>
            )}

            {(selectedMarker.creator == auth.currentUser!.uid || admin) && (
              <TouchableOpacity
                style={bigIdeaStyles.deleteButton}
                onPress={() => {
                  onDeleteIdeaClick(selectedMarker);
                  reRender();
                }}
              >
                <MaterialIcons name="delete" size={24} color="grey" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                bigIdeaStyles.followButton,
                {
                  backgroundColor: selectedMarker.isFollowed
                    ? "grey"
                    : "#C3C3C3",
                },
              ]}
              onPress={() => onFollowClick(selectedMarker)}
            >
              <AntDesign name="heart" size={12} color="red" />
              <Text style={bigIdeaStyles.followText}>Follow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={closeTextBox}
              style={bigIdeaStyles.closeButton}
            >
              <AntDesign name="close" size={15} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          top: "53%",
          bottom: "21%",
          padding: 12,
          paddingTop: 0,
          backgroundColor: "white",
          zIndex: 0,
        }}
        behavior={Platform.OS === "ios" ? "position" : "height"}
        keyboardVerticalOffset={180}
      >
        <FlatList
          style={[bigIdeaStyles.scrollContainer]}
          data={selectedMarker?.comments}
          keyExtractor={(comment) => comment.commentId.toString()}
          renderItem={({ item: comment }) => (
            <View style={bigIdeaStyles.commentContainer}>
              <View style={bigIdeaStyles.user}>
                <Image
                  source={
                    comment.userProfilePic
                      ? { uri: comment.userProfilePic }
                      : { uri: emptyPhotoURI }
                  }
                  style={bigIdeaStyles.avatar}
                />
                <Text style={bigIdeaStyles.valText}>
                  {getCertified(comment.userName)} {comment.userName}{" "}
                  <Text style={{ color: "grey", marginLeft: 0 }}>
                    {formatTimestamp(comment.date, comment.time)}
                  </Text>
                </Text>
              </View>
              <Text style={bigIdeaStyles.keyText}>{comment.comment}</Text>
              <View style={bigIdeaStyles.commButtons}>
                <View style={bigIdeaStyles.upVote}>
                  <Text
                    style={{
                      marginTop: 2,
                      marginRight: 2,
                      marginLeft: 5,
                      alignSelf: "center",
                    }}
                  >
                    {comment?.commentUpVoteNum} votes
                  </Text>
                  <TouchableOpacity
                    style={[
                      bigIdeaStyles.voteIconContainer,
                      {
                        backgroundColor: isCVoted.includes(comment.commentId)
                          ? "#128B4A"
                          : "#CEFFDD",
                      },
                    ]}
                  >
                    <Feather
                      name="thumbs-up"
                      style={{
                        flex: 1,
                      }}
                      size={15}
                      color={
                        isCVoted.includes(comment.commentId)
                          ? "#CEFFDD"
                          : "#128B4A"
                      }
                      onPress={() =>
                        onCommentUpVoteClick(selectedMarker!, comment)
                      }
                    />
                  </TouchableOpacity>
                </View>
                {(comment.userId == auth.currentUser!.uid || admin) && (
                  <TouchableOpacity
                    onPress={() => {
                      onDeleteCommentClick(selectedMarker, comment);
                      reRender();
                    }}
                  >
                    <MaterialIcons
                      style={{ paddingRight: 5 }}
                      name="delete"
                      size={22}
                      color="grey"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>

      <KeyboardAvoidingView
        style={{
          position: "absolute",
          bottom: "10%",
          height: 40,
          left: "8%",
          maxHeight: 150,
          zIndex: 3,
          maxWidth: "100%",
          width: "70%",
          backgroundColor: "white",
        }}
        behavior={Platform.OS === "ios" ? "position" : "height"}
        keyboardVerticalOffset={60}
      >
        {/* Text input for comments and "Send Comment" button */}
        <View style={{ ...bigIdeaStyles.commentInputContainer }}>
          <TextInput
            style={{
              height: 40,
              maxWidth: "70%",
              width: "70%",
              zIndex: 4,
              borderColor: "#B5B5B5",
              borderWidth: 1,
              borderRadius: 8,
            }}
            value={commentText}
            placeholder="Type your comment"
            onChangeText={(text) => setCommentText(text)}
          />

          <TouchableOpacity
            style={bigIdeaStyles.sendCommentButton}
            onPress={() => {
              handleSendComment(selectedMarker);
              reRender();
            }}
          >
            <Text style={bigIdeaStyles.sendCommentButtonText}>
              Send Comment
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ExpandedIdea;
