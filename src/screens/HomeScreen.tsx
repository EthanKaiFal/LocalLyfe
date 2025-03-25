import React, { useState, useEffect, useRef } from "react";
import { TouchableOpacity, View, TextInput, Alert, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { AntDesign, FontAwesome } from "@expo/vector-icons";
import MapView, { PROVIDER_GOOGLE, Marker, LatLng, PROVIDER_DEFAULT } from "react-native-maps";
import SmallIdeaPopUp from "../HomeScreenFiles/SmallIdeaPopup";
import ExpandedIdea from "../HomeScreenFiles/ExpandedIdea";
import { styles } from "../HomeScreenFiles/HSStyleSheet";
import { FIREBASE_AUTH as auth, FIREBASE_DB as db } from "../../firebaseConfig";
import {
  ParamListBase,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import axios from "axios";
import {
  onValue,
  ref,
  push,
  child,
  get,
  DataSnapshot,
  update,
  remove,
  equalTo,
  query,
} from "firebase/database";
import { Idea, Comment } from "../../DataBaseType";
import SearchIdea from "../HomeScreenFiles/SearchIdea";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type ParamList = {
  HomeScreen: {
    ideaId: string;
    idea: Idea;
    expanded: boolean;
    ideaEdited: boolean;
    setIdeaEdited: (value: boolean) => void;
    ideas: Idea[];
    setIdeas: (value: Idea[]) => void;
    setIdeaDeleted: (value: boolean) => void;
  }; // Define the type of parameters for HomeScreen
};

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
export let packedRegion: Region;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<ParamList, "HomeScreen">>();
  const {
    ideaId: paramsIdeaId,
    idea: paramsIdea,
    expanded: paramsExpanded,
    ideas,
    setIdeas,
    setIdeaDeleted,
  } = route.params ?? {};
  const mapViewRef = useRef<MapView>(null);
  const latitudeDelta = 0.0922;
  const longitudeDelta = 0.0421;
  const userId = auth.currentUser?.uid ?? "";
  const [CuserName, setUserName] = useState("");
  const [admin, setAdmin] = useState(false);
  const [council, setCouncil] = useState(false);
  const [certifiedMembers, setCertified] = useState<String[]>([]);
  //idea info pull hooks
  const [boundaries, setBoundaries] = useState({
    northEast: { latitude: 0, longitude: 0 },
    southWest: { latitude: 0, longitude: 0 },
  });

  //hook to set up the region we are looking at
  const [region, setRegion] = useState<Region | null>(null);
  const [originZip, setOriginZip] = useState<string>("");
  const [originCoordinates, setOriginCoordinates] = useState<Region>({
    latitude: 40.7443,
    longitude: -111.84486,
    latitudeDelta,
    longitudeDelta,
  });
  //hook for selecting a merker to view info on
  const [selectedMarker, setSelectedMarker] = useState<Idea | null | undefined>(
    null
  );
  const [isSearched, setIsSearched] = useState(false);
  //hook for whther or not show the expanded idea page
  const [expanded, setExpand] = useState(false);
  //hooks used to change the color of buttons when they get clicked
  const [searchValue, setSearchValue] = useState("");
  const [isCVoted, setIsCVoted] = useState<string[]>([]);
  const [commentText, setCommentText] = useState("");
  const [screenIdeas, setScreenIdeas] = useState<Idea[]>(ideas ?? []);
  //hook used for rerendering the screen
  const [forceRender, setForceRender] = useState<number>(0);

  //function using hook to rerender the screen
  const reRender = () => {
    setForceRender(forceRender + 1);
  };

  useEffect(() => {
    const userRef = ref(db, `/users/${auth.currentUser!.uid}`);
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setOriginZip(snapshot.val().zip);
      } else {
        console.log("No data available for the directory");
      }
    });
    getAllCouncilMembers();

    if (ideas) {
      setScreenIdeas(ideas);
    }

    if (ideas && selectedMarker) {
      const updatedIdea = selectedMarker
        ? ideas.find((idea) => idea.ideaId === selectedMarker.ideaId)
        : null;
      setSelectedMarker(updatedIdea);
    }
  }, [ideas]);

  useEffect(() => {
    if (screenIdeas && ideas) {
      setIdeas(screenIdeas);
    }
  }, [screenIdeas]);

  // This is to navigate to the correct idea when user clicks on followed idea from profile page
  useEffect(() => {
    if (paramsIdeaId) {
      setExpand(false);
      const selectedMarker = screenIdeas.find(
        (marker) => marker.ideaId === paramsIdeaId
      );
      if (selectedMarker) {
        onMarkerPress(selectedMarker);
      }
      if (paramsExpanded && paramsExpanded === true) {
        setExpand(true);
      }
      if (selectedMarker) {
        const { latitude, longitude } = selectedMarker.location;
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0,
          longitudeDelta,
        });
      }
    }

    if (paramsIdea) {
      setExpand(false);
      onMarkerPress(paramsIdea);
      if (paramsExpanded) {
        setExpand(true);
      }

      const { latitude, longitude } = paramsIdea.location;
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0,
        longitudeDelta,
      });
    }
  }, [paramsIdea, paramsIdeaId, paramsExpanded]); // TODO: maybe ideas?

  useEffect(() => {
    if (region) {
      mapViewRef.current?.animateToRegion(region, 500);
    }
  }, [region]);

  useEffect(() => {
    // Only call handleConvertZipCode if originZip is truthy
    if (originZip) {
      handleConvertZipCode(auth.currentUser!.uid);
    }
  }, [originZip]);

  useEffect(() => {
    getUserAdminStatus(auth.currentUser!.uid);
    getUserCouncilStatus(auth.currentUser!.uid);
  }, [userId]);

  useEffect(() => {
    packedRegion = originCoordinates;
  }, [originCoordinates]);

  useEffect(() => {
    if (selectedMarker) {
      setCommentText("");
    }
  }, [expanded, selectedMarker]);

  const handleConvertZipCode = async (userId: string) => {
    try {
      const userRef = ref(db, `/users/${userId}`);
      //grab the zipcode
      onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          setOriginZip(snapshot.val().zip);
        }
      });
      // Perform the conversion of zip code to coordinates
      const response = await axios.get(
        "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
        originZip +
        ".json",
        {
          params: {
            access_token:
              "pk.eyJ1IjoiZXRoYW5rYWlmYWwiLCJhIjoiY2x1MTAxeTNrMDk5ZjJqczZwbGNjemZpMCJ9.4w_m7ncf1aDzMsNHfouXeg",
            types: "postcode", // Specify that the query is a postal code
          },
        }
      );
      if (response.data.features && response.data.features.length > 0) {
        const [lng, lat] = response.data.features[0].center;
        setOriginCoordinates({
          ...originCoordinates,
          latitude: lat,
          longitude: lng,
        });
      } else {
        Alert.alert("Error", "No coordinates found for the provided zip code");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to convert zip code to coordinates");
      console.error("Failed to convert zip code to coordinates:", error);
    }
  };

  const getUserAdminStatus = (userId: string) => {
    //might have async issues here
    const directoryRef = ref(db, `/users/${userId}`);
    get(directoryRef).then((snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        var firstName = snapshot.val().firstName;
        var lastName = snapshot.val().lastName;
        setUserName(firstName + " " + lastName);
        if (snapshot.val().admin != null) {
          setAdmin(snapshot.val().admin);
        }
      }
    });
  };

  const getUserCouncilStatus = (userId: string) => {
    //might have async issues here
    const directoryRef = ref(db, `/users/${userId}`);
    get(directoryRef).then((snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        var firstName = snapshot.val().firstName;
        var lastName = snapshot.val().lastName;
        setUserName(firstName + " " + lastName);
        if (snapshot.val().council != null) {
          setCouncil(snapshot.val().council);
        }
      }
    });
  };

  // TODO: move this to TabNav -> ideas for rendering in all pages
  const getAllCouncilMembers = async () => {
    //might have async issues here
    const directoryRef = ref(db, `/users/`);
    const certifiedMems: String[] = [];
    get(directoryRef).then((snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          if (childSnapshot.val().council) {
            const name: String =
              childSnapshot.val().firstName +
              " " +
              childSnapshot.val().lastName;
            certifiedMems.push(name);
          }
        });
        setCertified(certifiedMems);
      }
    });
  };

  //the method actually called in the keyhandler that calls the appropriate hook
  const onMarkerPress = (marker: Idea) => {
    setSelectedMarker(marker);
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
    }
    // Check if the idea is being followed by the current user and send a notification if necessary
    if (idea.creator != userId) {
      const userProfileRef = ref(db, `users/${userId}/profilePicture`);
      const snapshot = await get(userProfileRef);
      const profilePictureUrl = snapshot.val();

      // Check if the creator already has a notification from the current user following this idea
      const notificationRef = ref(db, `/notifications/${idea.creator}`);
      const notificationSnapshot = await get(notificationRef);
      const notifications = notificationSnapshot.val();
      if (notifications) {
        const existingNotification = Object.values(notifications).find((notification: any) => {
          return notification.type === "follow" && notification.ideaId === ideaId && notification.followerName === CuserName;
        });
        if (!existingNotification) {
          // Add a follow notification to the database if it doesn't already exist
          const newNotification = {
            type: "follow",
            content: "",
            ideaId: ideaId,
            timestamp: Date.now(),
            followerName: CuserName,
            ideaTitle: idea.name,
            profilePic: profilePictureUrl,
          };
          push(notificationRef, newNotification);
        }
      } else {
        // If there are no existing notifications, create a new one
        const newNotification = {
          type: "follow",
          content: "",
          ideaId: ideaId,
          timestamp: Date.now(),
          followerName: CuserName,
          ideaTitle: idea.name,
          profilePic: profilePictureUrl,
        };
        push(notificationRef, newNotification);
      }
    }


    if (updatedIdea.isFollowed !== undefined) {
      setSelectedMarker(updatedIdea);
      const updatedIdeas: Idea[] = screenIdeas.map((idea) => {
        if (idea.ideaId === ideaId) {
          return updatedIdea;
        }
        return idea;
      });
      setScreenIdeas(updatedIdeas);
    }
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
      setSelectedMarker(updatedIdea);
    } else {
      await update(userIdeasVotedRef, { [ideaId]: true });
      await update(ideaRef, {
        votes: votes + 1,
      });
      updatedIdea = { ...idea, votes: votes + 1, isVoted: true };
      setSelectedMarker(updatedIdea);
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

  const onCertifyClick = (marker: Idea) => {
    // Your logic for follow button press
    // Update state to change colors dynamically
    console.log("inside the certify click");
    marker.certified = !marker.certified;
    var directoryRef = ref(db, "/ideas/" + marker.ideaId);

    update(directoryRef, {
      ["certified"]: marker.certified,
    });
  };

  // TODO: delete all places in DB where ideaId is existing
  const onDeleteIdeaClick = (marker: Idea) => {
    Alert.alert("Confirm Delete", "Would you like to delete this idea?", [
      {
        text: "Cancel",
        onPress: () => { },
        style: "cancel",
      },
      { text: "Delete", onPress: () => handleDelete(marker) },
    ]);
  };

  const handleDelete = (marker: Idea) => {
    //delete the idea from followed list
    var directoryRef = ref(db, "/ideas");
    remove(child(directoryRef, marker.ideaId))
      .then(() => {
        //console.log("Deletion successful");
        screenIdeas.splice(screenIdeas.indexOf(marker), 1);
        reRender();
      })
      .catch((error) => {
        //console.error("Error deleting value:", error);
      });

    //delete from myIdeas
    var userIdeasRef = ref(db, "/userIdeas/" + userId + "/" + marker.ideaId);
    remove(userIdeasRef)
      .then(() => {
        //console.log("Deletion successful");
      })
      .catch((error) => {
        //console.error("Error deleting value:", error);
      });

    //delete from followIdeas
    var followedIdeasRef = ref(db, "/userIdeasFollowed");
    //going through each of the users
    get(followedIdeasRef).then((snapshot) => {
      if (snapshot.exists()) {
        // Loop through each child of the snapshot
        snapshot.forEach((childSnapshot) => {
          // Access the key and value of each child
          //the user
          const user = childSnapshot.key;

          //the ideas they follow as a list
          const targetUserIdeasFollowedList = Object.keys(childSnapshot.val());
          if (targetUserIdeasFollowedList.includes(marker.ideaId)) {
            //delete from myIdeas
            const userFollowedIdeasRef = ref(db, "/userIdeasFollowed/" + user + "/" + marker.ideaId);
            remove(userFollowedIdeasRef)
              .then(() => {
                console.log("Deletion successful");
              })
              .catch((error) => {
                console.error("Error deleting value:", error);
              });
          }
        });
      } else {
        console.log("No data available");
      }
    }).catch((error) => {
      console.error("Error getting data:", error);
    });





    //userIdsVoted remove that one 
    var userIdeasVotedRef = ref(db, "/userIdeasVoted");
    //going through each of the users
    get(userIdeasVotedRef).then((snapshot) => {
      if (snapshot.exists()) {
        // Loop through each child of the snapshot
        snapshot.forEach((childSnapshot) => {
          // Access the key and value of each child
          //the user
          const user = childSnapshot.key;

          //the ideas they follow as a list
          const targetUserIdeasVotedList = Object.keys(childSnapshot.val());
          if (targetUserIdeasVotedList.includes(marker.ideaId)) {
            //delete from myIdeas
            const userVotedIdeasRef = ref(db, "/userIdeasVoted/" + user + "/" + marker.ideaId);
            remove(userVotedIdeasRef)
              .then(() => {
                console.log("Deletion successful");
              })
              .catch((error) => {
                console.error("Error deleting value:", error);
              });
          }
        });
      } else {
        console.log("No data available");
      }
    }).catch((error) => {
      console.error("Error getting data:", error);
    });



    // Get the snapshot of the query result


    //close out the small popup
    setExpand(false);
    setSelectedMarker(null);
    setIdeaDeleted(true);
    Alert.alert("Success", "Your idea has been deleted.");
  };

  const onDeleteCommentClick = (marker: Idea, comment: Comment) => {
    var directoryRef = ref(db, `/comments/${marker.ideaId}`);
    //possible issue with whether or not commentID is the id we are looking for
    remove(child(directoryRef, String(comment.commentId)))
      .then(() => {
        console.log("Deletion successful");
        const indexOfComment = marker.comments?.indexOf(comment);
        if (indexOfComment !== undefined) {
          marker.comments?.splice(indexOfComment, 1);
        }
      })
      .catch((error) => {
        console.error("Error deleting value:", error);
      });
  };



  const onCommentUpVoteClick = (selectedMarker: Idea, comment: Comment) => {
    var cvoted = [...isCVoted];
    if (comment.isVoted) {
      comment.commentUpVoteNum = comment.commentUpVoteNum - 1;
      //delete the idea from voted list
      var deleteRef = ref(db, "/userCommentsVoted/" + userId);
      remove(child(deleteRef, comment.commentId))
        .then(() => {
          console.log("Deletion successful");
        })
        .catch((error) => {
          console.error("Error deleting value:", error);
        });
      cvoted = cvoted.filter((item) => item !== comment.commentId);
    } else {
      comment.commentUpVoteNum = comment.commentUpVoteNum + 1;
      var userVotedRef = ref(db, "/userCommentsVoted/" + userId);
      //add an idea to the voted list
      update(userVotedRef, {
        [comment.commentId]: true,
      });
      cvoted.push(comment.commentId);
    }
    comment.isVoted = !comment.isVoted;
    setIsCVoted(cvoted);
    //push the upVoteNum to DB
    var ideasRef = ref(
      db,
      "comments/" + selectedMarker.ideaId + "/" + comment.commentId
    );
    const updates = {
      ["votes"]: comment.commentUpVoteNum,
    };
    update(ideasRef, updates)
      .then(() => {
        console.log("Update successful");
      })
      .catch((error) => {
        console.error("Error updating value:", error);
      });
    //update the list of ideas user has voted on
    var userVotedRef = ref(db, "userIdeasVoted");
  };

  const closeTextBox = () => {
    setExpand(false);
    setSelectedMarker(null);
  };

  const handleSendComment = async (marker: Idea) => {
    const { ideaId } = selectedMarker ?? {};
    if (commentText.trim() === "") {
      Alert.alert("Warning", "Comment cannot be empty");
      setCommentText("");
      return;
    }
    if (!ideaId) return;
    const commentIdeaPath = `comments/${ideaId}`;
    const currentDate = new Date();
    const userProfileRef = ref(db, `users/${userId}/profilePicture`);
    const snapshot = await get(userProfileRef);
    const profilePictureUrl = snapshot.val();

    let newComment = {
      comment: commentText,
      commentUpVoteNum: 0,
      date: currentDate.toLocaleDateString(),
      time: currentDate.toLocaleTimeString(),
      userId: userId,
      userName: CuserName,
      userProfilePic: profilePictureUrl,
      votes: 0,

    };
    const newCommentRef = await push(ref(db, commentIdeaPath), newComment);
    const commentId = newCommentRef.key;
    if (marker.creator != userId) {
      // Add a follow notification to the database
      const notificationRef = ref(db, `/notifications/${marker.creator}`);
      const newNotification = {
        type: "comment",
        content: commentText,
        ideaId: marker.ideaId,
        timestamp: Date.now(),
        followerName: CuserName,
        ideaTitle: marker.name,
        profilePic: profilePictureUrl,
      };
      push(notificationRef, newNotification);
    }


    if (!commentId) {
      Alert.alert("Error", "Failed to send comment");
      return;
    }

    let newCommentt = { ...newComment, commentId, isVoted: false } as Comment;
    marker.comments?.push(newCommentt)
    // setSelectedMarker({
    //   ...(selectedMarker as Idea),
    //   //comments: [...(selectedMarker?.comments ?? []), newCommentt] as Comment[],
    // });
    const updatedIdeas = screenIdeas.map((idea) => {
      if (idea.ideaId === ideaId) {
        return selectedMarker;
      }
      return idea;
    });
    setScreenIdeas(updatedIdeas as Idea[]);
    setCommentText("");
  };

  return (
    <View style={styles.container}>
      <MapView
        key={`${screenIdeas.length}-${originCoordinates.latitude}-${originCoordinates.longitude}`}
        ref={mapViewRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={region ? region : originCoordinates}
        zoomTapEnabled={false}
      >
        {screenIdeas &&
          screenIdeas.filter(marker => marker?.location).map((marker, index) => (
            <Marker
              key={index}
              coordinate={marker.location}
              title={marker.name}
              onPress={() => {
                onMarkerPress(marker);
                setIsSearched(false);
              }}
            />
          ))}
      </MapView>
      <KeyboardAvoidingView style={{
        position: "absolute",
        backgroundColor: "#E6E6E6",
        width: "100%",
        height: 50,
      }}
        behavior={Platform.OS === "ios" ? "position" : "height"}
        keyboardVerticalOffset={100}>

        <View style={styles.searchBox}>
          <TextInput
            placeholder="Search Idea..."
            style={styles.searchBar}
            value={searchValue}
            onChangeText={(text) => setSearchValue(text)}
          />
          <TouchableOpacity
            style={styles.icon}
            onPress={async () => {
              Keyboard.dismiss();
              setIsSearched(true);
              setSelectedMarker(null);
              setBoundaries(await (mapViewRef.current as any).getMapBoundaries());
            }}
          >
            <FontAwesome name="search" size={20} color={"#989898"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {/* small idea popup */}
      {selectedMarker && (
        <SmallIdeaPopUp
          selectedMarker={selectedMarker}
          onUpVoteClick={handleVote}
          onFollowClick={handleFollow}
          onCertifyClick={onCertifyClick}
          onDeleteIdeaClick={onDeleteIdeaClick}
          admin={admin}
          council={council}
          closeTextBox={closeTextBox}
          onSmallPopUpClick={() => {
            setExpand(!expanded);
          }}
        />
      )}
      {/*big idea popup*/}
      {selectedMarker && expanded && (
        <ExpandedIdea
          selectedMarker={selectedMarker}
          commentText={commentText}
          setCommentText={setCommentText}
          onFollowClick={handleFollow}
          onCertifyClick={onCertifyClick}
          closeTextBox={closeTextBox}
          onCommentUpVoteClick={onCommentUpVoteClick}
          onDeleteCommentClick={onDeleteCommentClick}
          onDeleteIdeaClick={onDeleteIdeaClick}
          isCVoted={isCVoted}
          handleSendComment={handleSendComment}
          admin={admin}
          council={council}
          setExpand={setExpand}
          certifiedMems={certifiedMembers}
        />
      )}

      {isSearched && (
        <SearchIdea
          screenIdeas={ideas}
          setScreenIdeas={setScreenIdeas}
          setSelectedMarker={setSelectedMarker}
          searchValue={searchValue}
          boundaries={boundaries}
          setExpanded={setExpand}
          setRegion={setRegion}
          closeSearchBox={() => {
            setIsSearched(false);
          }}
        />
      )}
      <TouchableOpacity
        style={styles.bellButton}
        onPress={() => {
          navigation.navigate("NotificationScreen");
        }}
      >
        <FontAwesome name="bell" size={18} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default HomeScreen;
