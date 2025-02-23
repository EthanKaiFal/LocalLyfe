import { StyleSheet } from "react-native";

export const searchStyles = StyleSheet.create({
  textBox: {
    position: "absolute",
    width: "100%",
    height: 150,
    bottom: 50,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "gray",
    flex: 1,
    flexDirection: "column",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  ideaContainer: {
    width: "100%",
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  voteIconContainer: {
    justifyContent: "flex-start",
  },
  voteIconBox: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#CEFFDD",
    borderRadius: 8,
  },
  voteIcon: {
    color: "#128B4A",
  },
  titleContainer: {
    width: 230,
    paddingHorizontal: 20,
  },
  ideaTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  infoContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  infoBox: {
    width: 80,
    height: 30,
    backgroundColor: "#BBBBBB",
    borderRadius: 8,
    justifyContent: "center",
  },
  infoText: {
    fontSize: 12,
    color: "white",
    textAlign: "center",
  },
});
