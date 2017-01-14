import { Meteor } from 'meteor/meteor';
import { Teams } from '../imports/api/teams';
import { Missions } from '../imports/api/missions';


Meteor.startup(() => {
    if (Meteor.users.find({ "profile.mask": '010' }).count() == 0) {
    
        var pos = { latitude: 34.6813900, longitude: -1.9085800 };
        Teams.insert({ teamName: "Enigma", position: pos }, function (err, id) {
                if (err) {
                    console.log('admin not created')
                } else {
                     Accounts.createUser({
                        email: "admin_admin@enigma.com",
                        password: "admin_admin",
                        profile: {
                            teamName : "Enigma",
                            markerId : id,
                            mask: '010'
                        }
                    });
                }
            })
    }

    Meteor.methods({
         _createUser: function (user) {
            Accounts.createUser(user);
        },
        _deleteUser : function(teamId){
            Meteor.users.remove({"profile.markerId" : teamId});
        }
    })
});
