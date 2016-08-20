'use strict';

angular.module('gbMobilePlayer', [])
    .directive('playerContainer', function() {
        return {
            scope: {},
            controller: function() {
                var self = this;

                var handlers = {};

                self.onMessage = function(name, handler) {
                    handlers[name] = handler;
                };

                self.sendMessage = function(from, data) {
                    for (var key in handlers) {
                        if (handlers.hasOwnProperty(key) && key !== from) {
                            handlers[key](data);
                        }
                    }
                };
            }
        }
    });