'use strict';

angular.module('gbMobilePlayer')
    .directive('playerTimeline', function($timeout, $interval) {
        return {
            templateUrl: 'components/player/player-timeline.tmpl.html',
            require: '?^^playerContainer',
            scope: {
                hits: '='
            },
            link: function(scope, elem, attrs, controller) {

                if (controller) {
                    controller.onMessage('timeline', function(data) {
                        
                    });
                }

                scope.onHitClick = function(index) {
                    sendMessage({ action: 'simulate-hit', hitIndex: index});
                };

                function sendMessage(data) {
                    if (controller) {
                        controller.sendMessage('timeline', data);
                    }
                }

                $timeout(function() {
                    for (var i = 0; i < scope.hits.length; i++) {
                        (function(j) {
                            $timeout(function() {
                                scope.onHitClick(j);

                            }, j * 1500);
                        })(i);
                    }
                });
            }
        }
    });