'use strict';

angular.module('gbMobilePlayer')
    .directive('replayTimeline', function($timeout, ScrollbarService) {
        return {
            templateUrl: 'components/mobile-replay/replay-timeline.tmpl.html',
            require: '?^^replayContainer',
            scope: {
                hits: '='
            },
            link: function(scope, elem, attrs, controller) {

                var timestampStart, deviceHeight;

                scope.selectedHit = undefined;

                var scrollbar;

                ScrollbarService.getInstance('hit_list')
                    .then(function(instance) {
                        scrollbar = instance;
                    });

                var listener = scope.$watch("hits", function (hits) {
                    if (!_.isEmpty(hits)) {
                        timestampStart = hits[0].timeStamp;

                        listener();
                    }
                });

                if (controller) {
                    controller.onMessage('timeline', function(data) {
                        if (!data) {
                            return;
                        }

                        if (data.deviceSize) {
                            deviceHeight = data.deviceSize.height;
                            elem.find('.hit-list').height(data.deviceSize.height);
                        }
                        else if (data.action && data.action === 'simulate-hit') {
                            simulateHit(data.hitIndex);
                        }
                    });
                }

                scope.onHitClick = function(index) {
                    scope.selectedHit = index;
                    sendMessage({ action: 'simulate-hit', hitIndex: index});
                };

                function sendMessage(data) {
                    if (controller) {
                        controller.sendMessage('timeline', data);
                    }
                }

                scope.hitTimeOffset = function(timestamp) {
                    var timeOffset = new Date(timestamp - timestampStart);
                    var minutes = timeOffset.getMinutes();
                    var seconds = timeOffset.getSeconds();
                    return (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
                };

                scope.actionLabel = function(index) {
                    var label = scope.hits[index].userEvent.action;
                    if (label.toLowerCase() === 'view loaded') {
                        label = scope.hits[index].userEvent.control.description;
                    }

                    return label;
                };

                scope.action = function(index) {
                    return _.kebabCase(scope.hits[index].userEvent.action);
                };

                function simulateHit(index) {
                    scope.selectedHit = index;
                    scrollbar.scrollIntoView($('.repeated-item.' + index)[0], { offsetTop: deviceHeight ? (deviceHeight / 2) : 100 });
                }
            }
        }
    });