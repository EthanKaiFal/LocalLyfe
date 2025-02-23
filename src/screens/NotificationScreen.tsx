import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../firebaseConfig';
import { formatDistanceToNow } from 'date-fns';
import emptyProfile from "../../assets/profile.png";
interface Notification {
  type: string;
  content: string;
  ideaId: string;
  timestamp: number;
  followerName: string;
  ideaTitle: string;
  profilePic: string;
}

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const emptyPhotoURI = Image.resolveAssetSource(emptyProfile).uri;
  useEffect(() => {
    const auth = FIREBASE_AUTH;
    const userId = auth.currentUser?.uid;

    const notificationsRef = ref(FIREBASE_DB, `notifications/${userId}`);

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const notificationsData: { [key: string]: Notification } = snapshot.val();
        const notificationsArray = Object.values(notificationsData);

        // Filter out duplicate following notifications
        const uniqueNotifications = notificationsArray.filter((notification, index, self) =>
          index === self.findIndex((n) => (
            n.type === notification.type &&
            n.ideaId === notification.ideaId &&
            n.followerName === notification.followerName
          ))
        );

        setNotifications(uniqueNotifications);
      } else {
        setNotifications([]);
      }
    });

    return () => unsubscribe();
  }, []);
  const formatTimestamp = (timestamp: number) => {
    // Convert milliseconds timestamp to a Date object
    const date = new Date(timestamp);

    // Calculate the distance from the timestamp to now
    const distanceToNow = formatDistanceToNow(date);
    const formattedDistance = (distanceToNow.startsWith('about') ? distanceToNow.slice(6) : distanceToNow) + ' ago';
    return formattedDistance;
};
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.map((notification) => (
    <View key={notification.ideaId} style={styles.notification}>
    {notification.type === 'follow' && (
      <View style={styles.user}>
        <Image source={notification.profilePic ? { uri: notification.profilePic } : { uri: emptyPhotoURI }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2}>{notification.followerName} followed your idea {notification.ideaTitle}</Text>
          <Text style={{ color: 'grey', marginLeft: 0 }}>
            {formatTimestamp(notification.timestamp)}
          </Text>
        </View>
      </View>
    )}
    {notification.type === 'comment' && (
      <View style={styles.user}>
      <Image source={notification.profilePic ? { uri: notification.profilePic } : { uri: emptyPhotoURI }} style={styles.avatar} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2}>{notification.followerName} commented on your idea {notification.ideaTitle}</Text>
        <Text style={{ color: 'grey', marginLeft: 0 }}>
          {formatTimestamp(notification.timestamp)}
        </Text>
      </View>
    </View>
    )}
    </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f0f0f0', // Change to match your app's background color
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  notification: {
    marginBottom: 10,
    backgroundColor: '#ffffff', // Background color of each notification item
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0', // Border color
  },
  user: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 160,
    resizeMode: "cover",
    marginRight: 5,
  },
});

export default NotificationsScreen;
