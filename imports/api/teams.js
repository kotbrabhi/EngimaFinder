import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
export const Teams = new Mongo.Collection('teams');


if (Meteor.isServer) {
    Meteor.publish('teams', function () {
        console.log('ok')
        return Teams.find({});
    });
}

Teams.allow({
    insert(userId, team) {
        return true;
    },
    update(userId, team, fields, modifier) {
        return true;
    },
    /*
    remove(userId, party) {
      return userId && party.owner === userId;
    }*/
});