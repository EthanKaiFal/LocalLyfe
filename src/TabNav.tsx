import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Fontisto, FontAwesome, Ionicons } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import HomeScreen from "./screens/HomeScreen";
import SearchScreen from "./screens/SearchScreen";
import CreateScreen from "./screens/CreateScreen";
import TrendingScreen from "./screens/TrendingScreen";
import ProfileScreen from "./screens/ProfileScreen";
import NotificationScreen from "./screens/NotificationScreen";
import { Alert } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { Idea, Comment } from "../DataBaseType";
import { FIREBASE_AUTH as auth, FIREBASE_DB as db } from "../firebaseConfig";
import { child, get, onValue, ref } from "firebase/database";
import { ParamListBase, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import 'react-native-gesture-handler'; 

// for TypeScript
type screenType = {
  HomeScreen: undefined;
  SearchScreen: undefined;
  CreateScreen: undefined;
  TrendingScreen: undefined;
  ProfileScreen: undefined;
  EditScreen: undefined;
};
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator<screenType>();
const TabNav = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const [ideasLoaded, setIdeasLoaded] = useState(false);
  const [otherScreenClicked, setOtherScreenClicked] = useState(false);
  const [ideaDeleted, setIdeaDeleted] = useState(false);
  const userId = auth.currentUser?.uid;
  const backgroundColor = "#22E871";
  const iconSize = 26;

  //this grabs the ideas
  useEffect(() => {
    if (!otherScreenClicked || ideaDeleted) {
      const fetchIdeas = async () => {
        try {
          await fetchIdeasHelper(); // Assume this is an async function now
        } catch (error) {
          Alert.alert(`Error getting ideas: ${error}`);
        }
      };

      fetchIdeas();
    }
  }, [otherScreenClicked, ideaDeleted]);
  
  //default screen is homescreen
  useEffect(() => {
    if (ideasLoaded && !otherScreenClicked) {
      navigation.navigate("HomeScreen", {
        ideas,
        setIdeas,
        setIdeaDeleted,
      });
      setIdeasLoaded(false);
      setIdeaDeleted(false);
    }
  }, [ideas, ideasLoaded]);

    //grabs info required for the homescreen page grabs the idea info stored in DB then pulls the comments, isVoted, and isFollowed
  const fetchIdeasHelper = async () => {
    const ideasRef = ref(db, "ideas");
    onValue(ideasRef, async (snapshot) => {
      const ideasData = snapshot.val();
      const ideasArray = await Promise.all(
        Object.keys(ideasData).map(async (key) => {
          const comments = (await getComments(key)) ?? [];
          const isVoted = (await checkIsVoted(key)) ?? false;
          const isFollowed = (await checkIsFollowed(key)) ?? false;
          return {
            ...ideasData[key],
            ideaId: key,
            isVoted,
            isFollowed,
            comments,
          };
        })
      );
      //all stored into ideas array
      setIdeas(ideasArray);
      setIdeasLoaded(true);
    });
  };

  const getComments = async (ideaId: string) => {
    const commentsSnapshot = await get(child(ref(db), `comments/${ideaId}`));
    const comments: Comment[] = [];
    if (commentsSnapshot.exists()) {
      const commentsJSON = commentsSnapshot.val();
      Object.entries(commentsJSON).forEach(([key, value]) => {
        comments.push({ ...(value as Comment), commentId: key });
      });
    }
    return comments;
  };

  const checkIsVoted = async (ideaId: string) => {
    const userIdeasVotedRef = ref(db, `userIdeasVoted/${userId}`);
    const ideaSnapshot = await get(child(userIdeasVotedRef, ideaId));
    return ideaSnapshot.exists();
  };

  const checkIsFollowed = async (ideaId: string) => {
    const userIdeasVotedRef = ref(db, `userIdeasFollowed/${userId}`);
    const ideaSnapshot = await get(child(userIdeasVotedRef, ideaId));
    return ideaSnapshot.exists();
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarInactiveBackgroundColor: backgroundColor,
        tabBarActiveBackgroundColor: backgroundColor,
        tabBarActiveTintColor: "#185c11",
        tabBarInactiveTintColor: "white",
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: backgroundColor,
        },
        headerStyle: {
          backgroundColor: backgroundColor,
        },
        title: "LocalLyfe",
        headerTitleStyle: {
          color: "white",
          fontSize: 27,
          textShadowColor: "rgba(0, 0, 0, 0.3)",
          textShadowOffset: { width: 3, height: 3 },
          textShadowRadius: 1,
        },
      }}
    >
      <Tab.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            // <Entypo name="home" size={iconSize} color={color} />
            <Fontisto name="map-marker-alt" size={iconSize} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate("HomeScreen", {
              ideas,
              setIdeas,
              setIdeaDeleted,
            });
          },
        })}
      />
      <Tab.Screen
        name="SearchScreen"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="list" size={30} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            setOtherScreenClicked(true);
            navigation.navigate("SearchScreen", {
              ideas,
              setIdeas,
            });
          },
        })}
      />
      <Tab.Screen
        name="CreateScreen"
        component={CreateScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <AntDesign name="pluscircle" size={iconSize} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            setOtherScreenClicked(true);
            navigation.navigate("CreateScreen", {
            });
          },
        })}
      />
      <Tab.Screen
        name="TrendingScreen"
        component={TrendingScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Fontisto name="fire" size={iconSize} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            setOtherScreenClicked(true);
            navigation.navigate("TrendingScreen", {
              ideas,
              setIdeas,
            });
          },
        })}
      />
      <Tab.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user-circle" size={iconSize} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            setOtherScreenClicked(true);
            navigation.navigate("ProfileScreen", {
            });
          },
        })}
      />
    </Tab.Navigator>
  );
};
const MainStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={TabNav}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationScreen"
        component={NotificationScreen}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: "#22E871",
          },
          headerTitle: "Notifications",
          headerTitleStyle: {
            color: "white",
            fontSize: 20,
          },
        }}
      />
    </Stack.Navigator>
  );
};

export default MainStack;
