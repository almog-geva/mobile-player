'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
    'ngRoute',
    'myApp.view1',
    'myApp.view2',
    'myApp.version',
    'gbMobilePlayer'
]).config(['$locationProvider', '$routeProvider', function ($locationProvider, $routeProvider) {
    $locationProvider.hashPrefix('!');

    $routeProvider.otherwise({redirectTo: '/view1'});
}]).controller('mainController', function ($http) {
    var self = this;

    self.sessionHits = {};
    
    $http.get('data/mobile-hits2.json')
        .then(function(resp) {
            self.sessionHits = resp.data;
        });
});
