'use strict';

angular.module('gbMobilePlayer')
    .directive('playerPreview', function ($timeout) {
        return {
            templateUrl: 'components/player/player-preview.tmpl.html',
            require: '?^^playerContainer',
            scope: {
                hits: '='
            },
            link: function (scope, elem, attrs, controller) {

                var defaults = {
                    minHeight: 400,
                    padding: 250,
                    tapDiameter: 40
                };

                scope.previewSnapshot = null;

                var deviceElem = elem.find('.device');
                var container = elem.find('.player-container');

                var boxSize = Math.max(defaults.minHeight + defaults.padding, Math.min(elem.width(), elem.height()));
                container.width(boxSize).height(boxSize);

                var listener = scope.$watch("hits", function (hits) {
                    if (!_.isEmpty(hits)) {
                        scope.device = hits[0].device;
                        scope.device.ratio = Math.abs(scope.device.screenWidth / scope.device.screenHeight);
                        scope.device.maxWidth = scope.device.screenResolution.x / scope.device.compressionValues.scaleFactor;
                        scope.device.maxHeight = scope.device.screenResolution.y / scope.device.compressionValues.scaleFactor;
                        scope.device.height = Math.max(defaults.minHeight, Math.min(boxSize - defaults.padding, scope.device.maxHeight));
                        scope.device.width = scope.device.height * scope.device.ratio;
                        scope.device.scaleFactor = scope.device.screenResolution.y / scope.device.height;
                        scope.device.tapDiameter = defaults.tapDiameter - (3 * scope.device.scaleFactor);

                        setDeviceSize();

                        listener();
                    }
                });

                if (controller) {
                    controller.onMessage('preview', function (data) {
                        if (!data || !data.action) {
                            return;
                        }

                        if (data.action === 'simulate-hit') {
                            simulateHit(data.hitIndex);
                        }
                    });
                }

                function sendMessage(data) {
                    if (controller) {
                        controller.sendMessage('preview', data);
                    }
                }

                function setDeviceSize(isLandscape) {
                    if (isLandscape) {
                        deviceElem.width(scope.device.height).height(scope.device.width);
                    }
                    else {
                        deviceElem.width(scope.device.width).height(scope.device.height);
                    }
                }

                function setPreviewSnapshot(hit) {
                    setOrientation(hit.device.orientation.toLowerCase());
                    scope.previewSnapshot = "data:image/jpg;base64," + hit.snapshot;
                }

                function setOrientation(orientation) {
                    if (orientation === 'landscape') {
                        deviceElem.addClass('landscape');
                        setDeviceSize(true);
                    }
                    else {
                        deviceElem.removeClass('landscape');
                        setDeviceSize();
                    }
                }

                function simulateHit(hitIndex) {
                    var hit = scope.hits[hitIndex];

                    if (!_.has(hit, 'userEvent.action')) {
                        console.error('Action event is missing', hit);
                        return;
                    }

                    var action = hit.userEvent.action.toLowerCase();

                    if (action === 'view loaded' || action === 'navigate back') {
                        setPreviewSnapshot(hit);
                    }
                    else if (action === 'tap') {
                        setPreviewSnapshot(hit);
                        tapEffect(hit);
                    }
                    else if (action === 'swipe' || action === 'zoom in' || action === 'zoom out') {
                        var previousHit = scope.hits[hitIndex - 1];
                        setPreviewSnapshot(previousHit);
                        swipeEffect(hit, function() {
                            setPreviewSnapshot(hit);
                        });
                    }
                    else if (action === 'tilt') {
                        var nextHit = scope.hits[hitIndex + 1];
                        setPreviewSnapshot(hit);
                        tiltEffect(hit, function() {
                            setPreviewSnapshot(nextHit);
                        });
                    }
                }

                var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';

                function tapAnnotationElement() {
                    return $('<div class="tap-annotation cbutton cbutton--effect-radomir"><div/>');
                }

                function tapEffect(hit) {
                    if (!_.has(hit, 'userEvent.coordinate')) {
                        return;
                    }

                    $('.tap-annotation').remove();

                    var coords = _.cloneDeep(hit.userEvent.coordinate);
                    adjustCoords(coords);

                    var tapAnnotation = tapAnnotationElement();

                    tapAnnotation.css({
                        width: scope.device.tapDiameter,
                        height: scope.device.tapDiameter,
                        left: coords.x,
                        top: coords.y
                    });

                    $('.snapshot-container').append(tapAnnotation);

                    tapAnnotation.addClass('animated fadeIn visible cbutton--click').one(animationEnd, function () {
                        tapAnnotation.removeClass('animated fadeIn');
                        tapAnnotation.addClass('animated fadeOut').one(animationEnd, function () {
                           tapAnnotation.remove();
                        });
                    });
                }

                function swipeEffect(hit, callback) {
                    if (!_.has(hit, 'userEvent.touchStart') || !_.has(hit, 'userEvent.touchEnd')) {
                        return;
                    }

                    $('.tap-annotation').remove();

                    var coords = {
                        start: _.cloneDeep(hit.userEvent.touchStart.coordinates),
                        end: _.cloneDeep(hit.userEvent.touchEnd.coordinates)
                    };

                    _.each(coords.start, function (coords) {
                        adjustCoords(coords);
                    });

                    _.each(coords.end, function (coords) {
                        adjustCoords(coords);
                    });

                    var container = $('.snapshot-container');
                    var i, avgDistance = 0, tapAnnotations = [];
                    for (i = 0; i < coords.start.length; i++) {
                        var tapAnnotation = tapAnnotationElement();
                        tapAnnotation.addClass('visible')
                            .css({
                                width: scope.device.tapDiameter,
                                height: scope.device.tapDiameter,
                                left: coords.start[i].x,
                                top: coords.start[i].y
                            });

                        tapAnnotations.push(tapAnnotation);
                        container.append(tapAnnotation);

                        avgDistance += distance(coords.start[i], coords.end[i]);
                    }

                    avgDistance = avgDistance / coords.start.length;
                    var duration = avgDistance > 500 ? 900 : avgDistance > 300 ? 700 : 500;

                    for (i = 0; i < coords.start.length; i++) {
                        tapAnnotations[i].animate({
                                left: coords.end[i].x,
                                top: coords.end[i].y,
                                opacity: '0.8'
                            }, duration, (function (j) {
                                return function () {
                                    tapAnnotations[j].animate({opacity: '0'}, 200, function () {
                                        tapAnnotations[j].remove();
                                        scope.$evalAsync(function() {
                                            if (callback) {
                                                callback();
                                            }
                                        });
                                    });
                                }
                            })(i)
                        );
                    }
                }

                function tiltEffect(hit, callback) {
                    if (!_.has(hit, 'userEvent.control.description')) {
                        return;
                    }

                    var orientation = hit.userEvent.control.description.toLowerCase();

                    $('.tap-annotation').remove();

                    var device = elem.find('.device');

                    orientation === 'landscape' ? setOrientation('portrait') : setOrientation('landscape');
                    device.addClass('tilt-' + orientation).on(animationEnd, function(e) {
                        if ($(e.target).hasClass('device')) {
                            device.off(animationEnd);
                        }
                        else {
                            return;
                        }

                        device.removeClass('tilt-' + orientation);
                        //orientation === 'landscape' ? device.addClass('landscape') : device.removeClass('landscape');
                        setOrientation(orientation);
                        scope.$evalAsync(function() {
                            if (callback) {
                                callback();
                            }
                        });
                    });
                }

                function distance(a, b) {
                    return Math.hypot(a.x - b.x, a.y - b.y);
                }

                function adjustCoords(coords) {
                    coords.x = (coords.x / scope.device.scaleFactor) - (scope.device.tapDiameter / 2);
                    coords.y = (coords.y / scope.device.scaleFactor) - (scope.device.tapDiameter / 2);
                }
            }
        }
    });