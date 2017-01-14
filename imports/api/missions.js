import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
export const Missions = new Mongo.Collection('missions');


if (Meteor.isServer) {
    Meteor.publish('missions', function () {
        return Missions.find({});
    });
}

Missions.allow({
    insert(userId, mission) {
        return true;
    },
    update(userId, mission, fields, modifier) {
        return true;
    },

    remove(userId, party) {
      return true;
    }
});