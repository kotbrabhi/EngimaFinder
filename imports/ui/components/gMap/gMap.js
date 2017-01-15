/* global L */
import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';

import 'leaflet-routing-machine';


import './customMarkers/leaflet.awesome-markers.min.js'
import './customMarkers/leaflet.awesome-markers.css'

import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker'
import { Teams } from '../../../api/teams';
import { Missions } from '../../../api/missions';

import webTemplate from './web.html';
import './gMap.css';




class GMap {
    constructor($scope, $reactive, $state, $timeout) {
        'ngInject';

        $reactive(this).attach($scope);

        var vm = this;
        Number.prototype.toRad = function() { return this * (Math.PI / 180); };
        var distance = function(lat1,lon1,lat2,lon2){
            var R = 6371; // km
            var dLat = (lat2-lat1).toRad();
            var dLon = (lon2-lon1).toRad();
            var lat1 = lat1.toRad();
            var lat2 = lat2.toRad();

            var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
            var d = R * c;
            return d*1000;
        }
        var homeIcon = L.AwesomeMarkers.icon({
            icon: 'fa-street-view',
            markerColor: 'red',
        });
        var defaultIcon = L.AwesomeMarkers.icon({
            icon: 'fa-users',
            markerColor: 'blue',
        });

        vm.currentMarker = L.marker([], { icon: homeIcon, zIndexOffset: 95 });

        vm.markers = [];
        vm.markers['null'] = L.marker();


        //initiailer la map avec la position actuel
        L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';
        var map = L.map('mapid', { zoomControl: false });
        var routing = {};
        var osrmBackEnd = {}
        L.Routing.control({ createMarker: function () { return null; } });
        vm.helpers({
            user() {
                return Meteor.user()
            }
        })

        var lastPos = {latitude: 34.6813900, longitude: -1.9085800};
        vm.helpers({
            current() {
                let pos = Location.getReactivePosition() || Location.getLastPosition() || { latitude: 34.6813900, longitude: -1.9085800 };
                vm.currentMarker.setLatLng([pos.latitude, pos.longitude]);
                vm.currentMarker.update();
                let d = distance(pos.latitude,pos.longitude,lastPos.latitude,lastPos.longitude);
                if(d>10){
                     Teams.update({ _id: vm.user.profile.markerId }, { $set: { position: pos},$inc : {distance : d},$push : {history : {latitude : pos.latitude,longitude : pos.longitude}}})
                     map.panTo(new L.LatLng(pos.latitude, pos.longitude));
                     lastPos = pos;
                }
                return pos;
            }
        });

        map.once('load', () => {
            L.control.zoom({
                position: 'topright'
            }).addTo(map);
            vm.currentMarker.addTo(map)

            osrmBackEnd = L.Routing.osrmv1({ useHints: false });//serviceUrl: 'http://127.0.0.1:5000/route/v1', useHints: false });

            routing = L.Routing.control({
                router: osrmBackEnd,
                waypoints: [],
                show: false,
                draggableWaypoints: false,
                addWaypoints: false,
                fitSelectedRoutes: false,
                showAlternatives: true,
                lineOptions: { styles: [{ color: 'black', opacity: 0.15, weight: 9 }, { color: 'white', opacity: 0.8, weight: 6 }, { color: 'blue', opacity: 1, weight: 3 }] },
                altLineOptions: { styles: [{ color: 'black', opacity: 0.15, weight: 9 }, { color: 'white', opacity: 0.8, weight: 6 }, { color: 'red', opacity: 0.9, weight: 2 }] }
            });


            routing.addTo(map);
            routing.hide();

        }).setView([vm.current.latitude, vm.current.longitude], 13);
        L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWVzc2FvdWRpb3Vzc2FtYSIsImEiOiJjaXQ2MjBqdHQwMDFsMnhxYW9hOW9tcHZoIn0.uX-ZR_To6tzxUpXmaVKOnQ', {
        }).addTo(map);


        Meteor.subscribe('teams');
        Meteor.subscribe('missions');

        var teamsLayer = L.layerGroup();
        teamsLayer.addTo(map);
        vm.helpers({
            teams() {
                let query = Teams.find({});
                let count = 0;
                let teamHandler = query.observeChanges({
                    added: function (id, team) {
                        count++;
                        var popup = L.popup({ closeOnClick: false }).setContent(team.teamName);
                        vm.markers[id] = L.marker([team.position.latitude, team.position.longitude], { icon: defaultIcon, zIndexOffset: 90 });
                        vm.markers[id].bindPopup(popup).openPopup();
                        vm.markers[id].addTo(teamsLayer);
                    },
                    changed: function (id, team) {
                        if(team.position){
                            vm.markers[id].setLatLng([team.position.latitude, team.position.longitude]);
                            vm.markers[id].update();
                        }
                    },
                    removed: function (id) {
                        count--;
                        vm.markers[id] = null;
                    }
                })
                return query;
            }
        });

        vm.helpers({
            missions() {
                let query = Missions.find({});
                let count = 0;
                let missionHandler = query.observeChanges({
                    added: function (id, mission) {
                        count++;
                    },
                    changed: function (id, team) {
                        
                    },
                    removed: function (id) {
                        count--;
                    }
                })
                return query;
            }
        });

        vm.missionList = {
            _show : false,
            showAdd : false,
            mission : {},
            updateMission : 0,
            add : function(mission){
                Missions.insert(mission,function(err,id){
                    if(!err){
                         vm.teams.forEach(function(team){
                             if(team.teamName != "Enigma"){
                                    let missions = team.missions;
                                    missions[id] = {
                                            intitulee : mission.intitulee,
                                            description : mission.description,
                                            done : false,
                                            note : 0,
                                            commentaire : "",
                                    }
                                    Teams.update({_id : team._id},{$set : {missions : missions}})
                             }
                        })
                    }
                });
               vm.missionList.showAdd = false;
            },
            delete : function(mission){
                let r = window.confirm('confirm !');
                if(r){
                    Missions.remove({_id : mission._id});
                    vm.teams.forEach(function(team){
                                if(team.teamName != "Enigma"){
                                        let missions = team.missions;
                                        missions[mission._id] = undefined;
                                        Teams.update({_id : team._id},{$set : {missions : missions}})
                                }
                    })
               }
            },
            showUpdate : function(id,mission){

                    vm.missionList.mission = {
                        intitulee : mission.intitulee,
                        description : mission.description,
                        done : mission.done,
                        note : mission.note,
                        commentaire : mission.commentaire
                    };
                    vm.missionList.updateMission = id
            },
            update : function(id,mission){
               let missions = vm.teams[0].missions;
               missions[id] = mission||vm.missionList.mission;
               Teams.update({_id : vm.teams[0]._id},{$set : {missions : missions}})
               vm.missionList.updateMission=0;
               vm.missionList.mission = {};
            }
        }

        let historyLayer = L.layerGroup();
        vm.teamList = {
            _show : false,
            show : function(){
                vm.teamList._show = true
                historyLayer.clearLayers();
                if(!map.hasLayer(teamsLayer))
                    map.addLayer(teamsLayer);
                    
            },
            showHistory : function(team){
                team.history.forEach(function(cord){
                    historyLayer.addLayer(new L.circleMarker(new L.LatLng(cord.latitude,cord.longitude),{radius : 2}));
                })
                historyLayer.addTo(map)
                map.removeLayer(teamsLayer);
                vm.teamList._show = false;
            },
            delete : function(team){
                let r = window.confirm('confirm !');
                if(r){
                    Teams.remove({_id : team._id});
                    Meteor.call('_deleteUser',team._id)
                }
            }
        }

        vm.singUp = {
            _show : false,
            teamName: '',
            password: '',
            teamNameTaken : false,

            createUser : function () {
            let pos = Location.getReactivePosition() || Location.getLastPosition() || { latitude: 34.6813900, longitude: -1.9085800 };
             let missions = {};
                    vm.missions.forEach(function(mission){
                        missions[mission._id] = {
                            intitulee : mission.intitulee,
                            description : mission.description,
                            done : false,
                            note : 0,
                            commentaire : "",
                        }
             })
            Teams.insert({ teamName: vm.singUp.teamName, position: pos ,missions : missions,distance : 0,history : []}, function (err, id) {
                if (err) {
                    vm.singUp.teamNameTaken = true;
                    $timeout(function () {
                        vm.singUp.teamNameTaken = false;
                    }, 4000)
                } else {
                    let user = {
                        email: vm.singUp.teamName+"@enigma.com",
                        password: vm.singUp.password,
                        profile: {
                            teamName : vm.singUp.teamName,
                            markerId: id,
                            mask : "001"
                        }
                    }
                    Meteor.call('_createUser',user,function(err,data){
                        if(err){
                                $scope.$apply(function(){
                                    vm.singUp.teamNameTaken = true;
                                })
                                $timeout(function () {
                                    vm.singUp.teamNameTaken = false;
                                }, 4000)
                        }else{
                            $scope.$apply(function(){
                                vm.singUp._show = false;
                            })
                        }
                    })
                }
            })
        },

        hide : function(){
             vm.singUp._show = false;
              vm.singUp.teamName = "";
               vm.singUp.password = ""
        }
        }

        vm.logOut = function () {
            Meteor.logout(function (error) {
                if (error)
                    alert(error)
            })
        }
    }
}

const name = 'gMap';
const template = webTemplate;

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
]).component(name, {
    template,
    controllerAs: name,
    controller: GMap,
}).config(config);
function config($stateProvider, $locationProvider, $urlRouterProvider) {
    'ngInject';

    $stateProvider
        .state('app', {
            url: '/app',
            template: '<g-map></g-map>',
            resolve: {
                currentUser($q) {
                    if (Meteor.user() === null) {
                        return $q.reject();
                    } else {
                        return $q.resolve();
                    }
                }
            }
        })
}