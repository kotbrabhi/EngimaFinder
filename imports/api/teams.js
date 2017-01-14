import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
export const Teams = new Mongo.Collection('teams',{
    transform: function (team) {
        if(team.teamName !="Enigma"){
            team.totalNote = 0;
            team.nbrMissionDone = 0;
            for(var index in team.missions) { 
                var mission = team.missions[index]; 
                 team.totalNote+=mission.note;
                if(mission.done)
                    team.nbrMissionDone++;
            }
        }
        return team;
    }
});


if (Meteor.isServer) {
    Meteor.publish('teams', function () {
      if (Meteor.users.findOne({_id : this.userId}).profile.mask == "010")
         return Teams.find({});
      else 
        return Teams.find({_id : Meteor.users.findOne({_id : this.userId}).profile.markerId})
    });
}

Teams.allow({
    insert(userId, team) {
        return true;
    },
    update(userId, team, fields, modifier) {
        return true;
    },
    
    remove(userId, party) {
      return true;//userId && party.owner === userId;
    }
});