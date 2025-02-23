import MapView, { PROVIDER_GOOGLE, Marker, LatLng } from 'react-native-maps';

export class idea {
    public name: string;
    public description: string;
    public cord: LatLng;
    public upVoteNum: number;
    public creator: string;
    public dateCreated: Date;
    public comments: { [key: string] : string};
    public constructor(name: string, description: string, cord: LatLng, upVoteNum: number, creator: string, dateCreated: Date, comments: { [key:string] : string}){
      this.name = name;
      this.description = description;
      this.cord = cord;
      this.upVoteNum = upVoteNum;
      this.creator = creator;
      this.dateCreated = dateCreated;
      this.comments = comments;
    }
  }