export type Comment = {
  commentId: string; // cId
  comment: string;
  commentUpVoteNum: number;
  date: string;
  time: string;
  userId: string;
  userName: string;
  userProfilePic: string;
  votes: number;
  isVoted?: boolean; // voted
};

export interface Idea {
  ideaId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  creator: string;
  creatorName: string;
  creatorProfilePic: string;
  description: string;
  name: string;
  votes: number;
  follows: number;
  voteIconColor: string;
  isVoted?: boolean;
  voteBackgroundColor?: string;
  isFollowed?: boolean;
  followBackgroundColor?: string;
  certified?: boolean;
  comments?: Comment[];
}

interface userIdeaFollowed {
  userId: Array<string>; // array of ideaId
}
