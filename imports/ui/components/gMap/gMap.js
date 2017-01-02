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

import mobileTemplate from './mobile.html';
import webTemplate from './web.html';
import './gMap.css';




class GMap {
    constructor($scope, $reactive, $state, $timeout) {
        'ngInject';

        $reactive(this).attach($scope);

        var vm = this;


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

        vm.helpers({
            current() {
                let pos = Location.getReactivePosition() || Location.getLastPosition() || { latitude: 0, longitude: 0 };
                vm.currentMarker.setLatLng([pos.latitude, pos.longitude]);
                vm.currentMarker.update();
                Teams.update({ _id: vm.user.profile.markerId }, { $set: { position: pos } })
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

        vm.helpers({
            teams() {
                let query = Teams.find({});
                let count = 0;
                let teamHandler = query.observeChanges({
                    added: function (id, team) {
                        var popup = L.popup({ closeOnClick: false }).setContent(team.nom + " " + team.prenom);
                        vm.markers[id] = L.marker([team.position.latitude, team.position.longitude], { icon: defaultIcon, zIndexOffset: 90 });
                        vm.markers[id].bindPopup(popup).openPopup();
                        vm.markers[id].addTo(map);

                    },
                    changed: function (id, team) {
                        vm.markers[id].setLatLng([team.position.latitude, team.position.longitude]);
                        vm.markers[id].update();
                    },
                    removed: function (id) {
                        count--;
                        vm.markers[id] = null;
                    }
                })
                return query;
            }
        });
        vm.logOut = function () {
            Meteor.logout(function (error) {
                if (error)
                    alert(error)
            })
        }
    }
}

const name = 'gMap';
const template = Meteor.isCordova ? mobileTemplate : webTemplate;

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