/*
 * adapt-narrativeWithAudio
 * Copyright (C) 2015 Bombardier Inc. (www.batraining.com)
 * https://github.com/BATraining/adapt-narrativeWithAudio/blob/master/LICENSE
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
define(function(require) {

    var ComponentView = require('coreViews/componentView');
    var Adapt = require('coreJS/adapt');
    var mep = require('components/adapt-narrativeWithAudio/js/mediaelement-and-player.min');

    var Narrative = ComponentView.extend({

        events: {
            'touchstart .narrativeWithAudio-slider': 'onTouchNavigationStarted',
            'click .narrativeWithAudio-strapline-title': 'openPopup',
            'click .narrativeWithAudio-popup-close': 'closePopup',
            'click .narrativeWithAudio-controls': 'onNavigationClicked',
            'click .narrativeWithAudio-popup-nav .back': 'previousHotGraphic',
            'click .narrativeWithAudio-popup-nav .next': 'nextHotGraphic',
            'click .narrativeWithAudio-popup-audio': 'onClickAudioButton'
        },

        preRender: function() {
            this.listenTo(Adapt, 'device:changed', this.reRender, this);
            this.listenTo(Adapt, 'device:resize', this.resizeControl, this);
            this.listenTo(Adapt, 'notify:closed', this.closeNotify, this);
            this.setDeviceSize();

            // Checks to see if the narrativeWithAudio should be reset on revisit
            this.checkIfResetOnRevisit();
        },

        setDeviceSize: function() {
            if (Adapt.device.screenSize === 'large') {
                this.$el.addClass('desktop').removeClass('mobile');
                this.model.set('_isDesktop', true);
                this.$('.narrativeWithAudio-content').css({'margin-top':'0px'});
                this.$('.narrativeWithAudio-popup-done').css({'display':'none'});
                this.$('.narrativeWithAudio-content').removeClass('addPopUp').addClass('removePopUp');
                this.$('.narrativeWithAudio-content').css({'display':'block'});
                this.$('.popup-shadow').fadeOut('fast');
            } else {
                this.$el.addClass('mobile').removeClass('desktop');
                this.model.set('_isDesktop', false);
                this.$('.narrativeWithAudio-content').addClass('addPopUp').removeClass('removePopUp');
                this.$('.narrativeWithAudio-content').css({'display':'none'});
                this.$('.narrativeWithAudio-popup-done').css({'display':'block'});
                this.$('.popup-shadow').fadeOut('fast');
            }
        },

        postRender: function() {
            this.renderState();
            this.$('.component-inner').on('inview', _.bind(this.inview, this));
            this.$('.narrativeWithAudio-slider').imageready(_.bind(function() {
                this.setReadyStatus();
                if($('html').hasClass('ie8')) {
                    _.each(this.$('.narrativeWithAudio-slider'), function(item, index) {
                        _.each(this.$(item).find('audio'), function(audioItem, audioItemIndex) {
                            var audioObject = new MediaElementPlayer($(audioItem));
                            this.model.get("_items")[index]._page[audioItemIndex].audioObject = audioObject;
                        }, this);
                    }, this);
                }else{
                    this.model.set("_currentAudioElement", '');
                    this.$('.narrativeWithAudio-popup-sound').addClass('icon-sound-mute');
                }

            }, this));

            this.$('.mejs-container').addClass('display-none');

            this.$('audio').on('ended', _.bind(this.onAudioEnded, this));

            this.setupNarrative();
        },

        inview: function(event, visible, visiblePartX, visiblePartY) {
            if (!visible) {
                if($('html').hasClass('ie8')) {
                    this.stopAudio();
                } else {
                    this.stopCurrentAudio();
                }
                this.$('.narrativeWithAudio-popup-sound').addClass('icon-sound-mute');
            }
        },

        // Used to check if the narrativeWithAudio should reset on revisit
        checkIfResetOnRevisit: function() {
            var isResetOnRevisit = this.model.get('_isResetOnRevisit');

            // If reset is enabled set defaults
            if (isResetOnRevisit) {
                this.model.reset(isResetOnRevisit);
                this.model.set({_stage: 0});

                _.each(this.model.get('_items'), function(item) {
                    item.visited = false;
                });
            }
        },

        setupNarrative: function() {
            _.bindAll(this, 'onTouchMove', 'onTouchEnd');
            this.setDeviceSize();
            this.model.set('_marginDir', 'left');
            if (Adapt.config.get('_defaultDirection') == 'rtl') {
                this.model.set('_marginDir', 'right');
            }
            this.model.set('_itemCount', this.model.get('_items').length);

            this.model.set('_active', true);

            if (this.model.get('_stage')) {
                this.setStage(this.model.get('_stage'), true);
            } else {
                this.setStage(0, true);
            }
            this.calculateWidths();

            if (Adapt.device.screenSize !== 'large' && !this.model.get('_wasHotgraphic')) {
                this.replaceInstructions();
            }
        },

        calculateWidths: function() {
            var slideWidth = this.$('.narrativeWithAudio-slide-container').width();
            var slideCount = this.model.get('_itemCount');
            var marginRight = this.$('.narrativeWithAudio-slider-graphic').css('margin-right');
            var extraMargin = marginRight === '' ? 0 : parseInt(marginRight);
            var fullSlideWidth = (slideWidth + extraMargin) * slideCount;
            var iconWidth = this.$('.narrativeWithAudio-popup-open').outerWidth();

            this.$('.narrativeWithAudio-slider-graphic').width(slideWidth);
            this.$('.narrativeWithAudio-strapline-header').width(slideWidth);
            this.$('.narrativeWithAudio-strapline-title').width(slideWidth);

            this.$('.narrativeWithAudio-slider').width(fullSlideWidth);
            this.$('.narrativeWithAudio-strapline-header-inner').width(fullSlideWidth);

            var stage = this.model.get('_stage');
            var margin = -(stage * slideWidth);

            this.$('.narrativeWithAudio-slider').css(('margin-' + this.model.get('_marginDir')), margin);
            this.$('.narrativeWithAudio-strapline-header-inner').css(('margin-' + this.model.get('_marginDir')), margin);

            this.model.set('_finalItemLeft', fullSlideWidth - slideWidth);
        },

        resizeControl: function() {
            this.setDeviceSize();
            this.replaceInstructions();
            this.calculateWidths();
            this.evaluateNavigation();
        },

        reRender: function() {
            if (this.model.get('_wasHotgraphic') && Adapt.device.screenSize == 'large') {
                this.replaceWithHotgraphic();
            }
        },

        closeNotify: function() {
            this.evaluateCompletion()
        },

        replaceInstructions: function() {
            if (Adapt.device.screenSize === 'large') {
                this.$('.narrativeWithAudio-instruction-inner').children('span').html(this.model.get('instruction'));
            } else if (this.model.get('mobileInstruction') && !this.model.get('_wasHotgraphic')) {
                this.$('.narrativeWithAudio-instruction-inner').children('span').html(this.model.get('mobileInstruction'));
            }
        },

        replaceWithHotgraphic: function() {
            if (!Adapt.componentStore.hotgraphicWithAudio) throw "Hotgraphic not included in build";
            var Hotgraphic = Adapt.componentStore.hotgraphicWithAudio;

            var model = this.prepareHotgraphicModel();
            var newHotgraphic = new Hotgraphic({model: model, $parent: this.options.$parent});
            this.options.$parent.append(newHotgraphic.$el);
            this.remove();
            _.defer(function() {
                Adapt.trigger('device:resize');
            });
        },

        prepareHotgraphicModel: function() {
            var model = this.model;
            model.set('_component', 'hotgraphicWithAudio');
            model.set('body', model.get('originalBody'));
            model.set('instruction', model.get('originalInstruction'));
            return model;
        },

        moveSliderToIndex: function(itemIndex, animate, callback) {
            var extraMargin = parseInt(this.$('.narrativeWithAudio-slider-graphic').css('margin-right'));
            var movementSize = this.$('.narrativeWithAudio-slide-container').width() + extraMargin;
            var marginDir = {};
            if (animate) {
                marginDir['margin-' + this.model.get('_marginDir')] = -(movementSize * itemIndex);
                this.$('.narrativeWithAudio-slider').velocity("stop", true).velocity(marginDir);
                this.$('.narrativeWithAudio-strapline-header-inner').velocity("stop", true).velocity(marginDir, {complete:callback});
            } else {
                marginDir['margin-' + this.model.get('_marginDir')] = -(movementSize * itemIndex);
                this.$('.narrativeWithAudio-slider').css(marginDir);
                this.$('.narrativeWithAudio-strapline-header-inner').css(marginDir);
                callback();
            }
        },



        setStage: function(stage, initial) {

            this.model.set('_stage', stage);

            if (this.model.get('_isDesktop')) {
                // Set the visited attribute for large screen devices
                var currentItem = this.getCurrentItem(stage);
                currentItem.visited = true;
            }

            this.$('.narrativeWithAudio-progress').removeClass('selected').eq(stage).addClass('selected');
            this.$('.narrativeWithAudio-slider-graphic').children('.controls').a11y_cntrl_enabled(false);
            this.$('.narrativeWithAudio-slider-graphic').eq(stage).children('.controls').a11y_cntrl_enabled(true);
            this.$('.narrativeWithAudio-content-item').addClass('narrativeWithAudio-hidden').a11y_on(false).eq(stage).removeClass('narrativeWithAudio-hidden').a11y_on(true);
            this.$('.narrativeWithAudio-strapline-title').a11y_cntrl_enabled(false).eq(stage).a11y_cntrl_enabled(true);

            this.evaluateNavigation();
            this.evaluateCompletion();

            this.$('.narrativeWithAudio-page').hide();
            var $currentItem =  this.$('.narrativeWithAudio-content-item').eq(stage);
            var currentItemIndex =  $currentItem.index();
            this.$('.narrativeWithAudio-page').removeClass('activePage').hide();
            var newActivePageIndex =$currentItem.find('.narrativeWithAudio-page').eq(0).addClass('activePage').show();

            this.$('.narrativeWithAudio-popup-count .current').html(1);
            this.$('.narrativeWithAudio-popup-count .total').html(this.model.get('_items')[stage]._page.length);
            this.applyNavigationClasses(stage,0);


            /* var $currentPages = $currentItem.find('.narrativeWithAudio-page');
            var $currentActivePage = $currentItem.find('.narrativeWithAudio-page.activePage');
            var activePageIndex = $currentPages.index($currentActivePage);
            var activePageIndex = $currentPages.index($currentActivePage);
            if (newActivePageIndex != activePageIndex) {
                if($('html').hasClass('ie8')) {
                   this.playAudioAtIndex($currentItem.index(), newActivePageIndex);
                } else {
                    var audioElement = this.$('.narrativeWithAudio-slider-graphic').eq($currentItem.index()-1).find('audio')[newActivePageIndex];
                    this.playAudioForElement(audioElement);
                }
            }*/
            // this.$('.narrativeWithAudio-popup-sound').addClass('icon-sound-mute');

            this.moveSliderToIndex(stage, !initial, _.bind(function() {
                if (this.model.get('_isDesktop')) {
                    if (!initial) this.$('.narrativeWithAudio-content-item').eq(stage).a11y_focus();
                } else {
                    if (!initial) this.$('.narrativeWithAudio-popup-open').a11y_focus();
                }
            }, this));


        },


        nextHotGraphic: function (event) {
            event.preventDefault();
            var currentStage = this.model.get('_stage');
            var $activeItem = this.$('.narrativeWithAudio-content-item').eq(currentStage);
            var $currentPages = $activeItem.find('.narrativeWithAudio-page');
            var $currentActivePage = $activeItem.find('.narrativeWithAudio-page.activePage');
            var activePageIndex = $currentPages.index($currentActivePage);

            if (activePageIndex < ($currentPages.length-1)) {
                $currentActivePage.removeClass('activePage').hide();
                $currentPages.eq(activePageIndex + 1).addClass('activePage').show();
                this.$('.narrativeWithAudio-popup-count .current').html(activePageIndex+2);
                this.$('.narrativeWithAudio-popup-inner').a11y_on(false);
            }
            this.applyNavigationClasses(currentStage,activePageIndex+1);
            newActivePageIndex = $currentPages.index(this.$('.narrativeWithAudio-page.activePage'));
            if (newActivePageIndex != activePageIndex) {
                if($('html').hasClass('ie8')) {
                    this.playAudioAtIndex($activeItem.index(), newActivePageIndex);
                } else {
                    var audioElement = this.$('.narrativeWithAudio-slider-graphic').eq($activeItem.index()-1).find('audio')[newActivePageIndex];
                    this.playAudioForElement(audioElement);
                }
            }
            this.$('.narrativeWithAudio-popup-sound').removeClass('icon-sound-mute');

            if (!this.model.get('_isDesktop')) {
                _.debounce(this.resizePopup(true), 100);
            }

        },

        previousHotGraphic: function (event) {
            event.preventDefault();
            var currentStage = this.model.get('_stage');
            var $activeItem = this.$('.narrativeWithAudio-content-item').eq(currentStage);
            var $currentPages = $activeItem.find('.narrativeWithAudio-page');
            var $currentActivePage = $activeItem.find('.narrativeWithAudio-page.activePage');
            var activePageIndex = $currentPages.index($currentActivePage);

            if (activePageIndex > 0) {
                $currentActivePage.hide().removeClass('activePage');
                $currentPages.eq(activePageIndex - 1).show().addClass('activePage');
                this.$('.narrativeWithAudio-popup-count .current').html(activePageIndex);
                this.$('.narrativeWithAudio-popup-inner').a11y_on(false);
            }
            this.applyNavigationClasses(currentStage,activePageIndex-1);


            var newActivePageIndex = $currentPages.index(this.$('.narrativeWithAudio-page.activePage'));
            if (newActivePageIndex != activePageIndex) {
                if($('html').hasClass('ie8')) {
                    this.playAudioAtIndex($activeItem.index(), newActivePageIndex);
                } else {
                    var audioElement = this.$('.narrativeWithAudio-slider-graphic').eq($activeItem.index()-1).find('audio')[newActivePageIndex];
                    this.playAudioForElement(audioElement);
                }
            }
            this.$('.narrativeWithAudio-popup-sound').removeClass('icon-sound-mute');
            if (!this.model.get('_isDesktop')) {
                _.debounce(this.resizePopup(true), 100);
            }
        },

        onClickAudioButton:function(event){
            if(event && event.preventDefault) event.preventDefault();
            var audioElement = this.model.get("_currentAudioElement");
            if(audioElement==''){
                var currentStage = this.model.get('_stage');
                var $activeItem = this.$('.narrativeWithAudio-content-item').eq(currentStage);
                var $currentPages = $activeItem.find('.narrativeWithAudio-page');
                var curIndex = $currentPages.index(this.$('.narrativeWithAudio-page.activePage'));

                if($('html').hasClass('ie8')) {
                    this.playAudioAtIndex(this.$('.narrativeWithAudio-item.active').index(), curIndex);
                    this.playAudioAtIndex($activeItem.index(), curIndex);
                } else {
                    var audioElement = this.$('.narrativeWithAudio-slider-graphic').eq($activeItem.index()-1).find('audio')[curIndex];
                    this.playAudioForElement(audioElement);
                }
                this.$('.narrativeWithAudio-popup-sound').removeClass('icon-sound-mute');
            }else {
                if($('html').hasClass('ie8')) {
                    this.stopAudio();
                } else {
                    this.stopCurrentAudio();
                }
                this.$('.narrativeWithAudio-popup-sound').addClass('icon-sound-mute');
            }
        },


        applyNavigationClasses: function (currentStage,index) {
            var $nav = this.$('.narrativeWithAudio-popup-nav'),
                pageCount = this.$('.narrativeWithAudio-content-item').eq(currentStage).find('.narrativeWithAudio-page').length;

            $nav.removeClass('first last');
            this.$('.narrativeWithAudio-popup-done').a11y_cntrl_enabled(true);
            if(index <= 0) {
                this.$('.narrativeWithAudio-popup-nav').addClass('first');
                this.$('.narrativeWithAudio-popup-controls.back').a11y_cntrl_enabled(false);
                this.$('.narrativeWithAudio-popup-controls.next').a11y_cntrl_enabled(true);
            } else if (index >= pageCount-1) {
                this.$('.narrativeWithAudio-popup-nav').addClass('last');
                this.$('.narrativeWithAudio-popup-controls.back').a11y_cntrl_enabled(true);
                this.$('.narrativeWithAudio-popup-controls.next').a11y_cntrl_enabled(false);
            } else {
                this.$('.narrativeWithAudio-popup-controls.back').a11y_cntrl_enabled(true);
                this.$('.narrativeWithAudio-popup-controls.next').a11y_cntrl_enabled(true);
            }
        },

        constrainStage: function(stage) {
            if (stage > this.model.get('_items').length - 1) {
                stage = this.model.get('_items').length - 1;
            } else if (stage < 0) {
                stage = 0;
            }
            return stage;
        },

        constrainXPosition: function(previousLeft, newLeft, deltaX) {
            if (newLeft > 0 && deltaX > 0) {
                newLeft = previousLeft + (deltaX / (newLeft * 0.1));
            }
            var finalItemLeft = this.model.get('_finalItemLeft');
            if (newLeft < -finalItemLeft && deltaX < 0) {
                var distance = Math.abs(newLeft + finalItemLeft);
                newLeft = previousLeft + (deltaX / (distance * 0.1));
            }
            return newLeft;
        },

        evaluateNavigation: function() {
            var currentStage = this.model.get('_stage');
            var itemCount = this.model.get('_itemCount');
            if (currentStage == 0) {
                this.$('.narrativeWithAudio-control-left').addClass('narrativeWithAudio-hidden');

                if (itemCount > 1) {
                    this.$('.narrativeWithAudio-control-right').removeClass('narrativeWithAudio-hidden');
                }
            } else {
                this.$('.narrativeWithAudio-control-left').removeClass('narrativeWithAudio-hidden');

                if (currentStage == itemCount - 1) {
                    this.$('.narrativeWithAudio-control-right').addClass('narrativeWithAudio-hidden');
                } else {
                    this.$('.narrativeWithAudio-control-right').removeClass('narrativeWithAudio-hidden');
                }
            }

        },

        getNearestItemIndex: function() {
            var currentPosition = parseInt(this.$('.narrativeWithAudio-slider').css('margin-left'));
            var graphicWidth = this.$('.narrativeWithAudio-slider-graphic').width();
            var absolutePosition = currentPosition / graphicWidth;
            var stage = this.model.get('_stage');
            var relativePosition = stage - Math.abs(absolutePosition);

            if (relativePosition < -0.3) {
                stage++;
            } else if (relativePosition > 0.3) {
                stage--;
            }

            return this.constrainStage(stage);
        },

        getCurrentItem: function(index) {
            return this.model.get('_items')[index];
        },

        getVisitedItems: function() {
            return _.filter(this.model.get('_items'), function(item) {
                return item.visited;
            });
        },

        evaluateCompletion: function() {
            if (this.getVisitedItems().length === this.model.get('_items').length) {
                this.setCompletionStatus();
            }
        },

        moveElement: function($element, deltaX) {
            var previousLeft = parseInt($element.css('margin-left'));
            var newLeft = previousLeft + deltaX;

            newLeft = this.constrainXPosition(previousLeft, newLeft, deltaX);
            $element.css(('margin-' + this.model.get('_marginDir')), newLeft + 'px');
        },

        openPopup: function(event) {
            event.preventDefault();

            this.$('.popup-shadow').fadeIn('slow', _.bind(function() {
                this.$el.a11y_focus();
            }, this));

            var currentStage = this.model.get('_stage');

            var currentItem = this.getCurrentItem(currentStage);
            currentItem.visited = true;

            var $activeItem = this.$('.narrativeWithAudio-content-item').eq(currentStage);
            var $currentPages = $activeItem.find('.narrativeWithAudio-page');
            var $currentActivePage = $activeItem.find('.narrativeWithAudio-page').eq(0);
            var activePageIndex = $currentPages.index($currentActivePage);

            $currentPages.removeClass('activePage').hide();
            $currentPages.eq(activePageIndex).addClass('activePage').show();
            this.$('.narrativeWithAudio-popup-count .current').html(activePageIndex+1);
            this.$('.narrativeWithAudio-popup-inner').a11y_on(false);

            this.applyNavigationClasses(currentStage,0);
            newActivePageIndex = $currentPages.index(this.$('.narrativeWithAudio-page.activePage'));

            if($('html').hasClass('ie8')) {
                this.playAudioAtIndex($activeItem.index(), newActivePageIndex);
            } else {
                var audioElement = this.$('.narrativeWithAudio-slider-graphic').eq($activeItem.index()-1).find('audio')[newActivePageIndex];
                this.playAudioForElement(audioElement);
            }

            this.$('.narrativeWithAudio-popup-sound').removeClass('icon-sound-mute');

            this.$('.narrativeWithAudio-content').css({'display':'block'});
            this.$('.narrativeWithAudio-content').addClass('addPopUp').removeClass('removePopUp');
            _.debounce(this.resizePopup(false), 100);

        },

        closePopup: function(event) {
            event.preventDefault();

            this.evaluateCompletion();
            if($('html').hasClass('ie8')) {
                this.stopAudio();
            } else {
                this.stopCurrentAudio();
            };
            this.$('.popup-shadow').fadeOut('fast', _.bind(function() {
                this.$('.narrativeWithAudio-content').css({'display':'none'});
                this.$('.narrativeWithAudio-content').removeClass('addPopUp').removeClass('removePopUp');
            }, this));
        },

        resizePopup: function(noAnimation) {
            var windowHeight = $(window).height();
            var popupHeight = this.$('.narrativeWithAudio-content').height();
            var animationSpeed = 400;

            if (popupHeight > (windowHeight - $('.navigation').height())) {
                this.$('.narrativeWithAudio-content').css({
                    'height': '100%',
                    'top': 0,
                    'overflow-y': 'scroll',
                    '-webkit-overflow-scrolling': 'touch',
                    'opacity': 1
                });
            } else {
                if (noAnimation) {
                    animationSpeed = 0;
                }
                this.$('.narrativeWithAudio-content').css({
                    'margin-top': ((windowHeight-popupHeight) / 2) - 50, 'opacity': 0
                }).velocity({
                    'margin-top': ((windowHeight-popupHeight) / 2), 'opacity': 1
                }, animationSpeed);

            }
        },

        onNavigationClicked: function(event) {
            event.preventDefault();

            if (!this.model.get('_active')) return;

            var stage = this.model.get('_stage');
            var numberOfItems = this.model.get('_itemCount');

            if ($(event.currentTarget).hasClass('narrativeWithAudio-control-right')) {
                stage++;
            } else if ($(event.currentTarget).hasClass('narrativeWithAudio-control-left')) {
                stage--;
            }
            stage = (stage + numberOfItems) % numberOfItems;
            this.setStage(stage);

            if($('html').hasClass('ie8')) {
                this.stopAudio();
            } else {
                this.stopCurrentAudio();
            }
            this.$('.narrativeWithAudio-popup-sound').addClass('icon-sound-mute')

        },

        onTouchNavigationStarted: function(event) {
            //event.preventDefault();
            //if (!this.model.get('_active')) return;

            /*this.$('.narrativeWithAudio-slider').stop();
             this.$('.narrativeWithAudio-strapline-header-inner').stop();

             this.model.set('_currentX', event.originalEvent.touches[0]['pageX']);
             this.model.set('_touchStartPosition', parseInt(this.$('.narrativeWithAudio-slider').css('margin-left')));

             this.$('.narrativeWithAudio-slider').on('touchmove', this.onTouchMove);
             this.$('.narrativeWithAudio-slider').one('touchend', this.onTouchEnd);*/
        },

        onAudioEnded: function(event) {
            if($('html').hasClass('ie8')) {
                this.stopAudio();
            } else {
                this.model.get("_currentAudioElement").currentTime = 0.0;
                this.model.set("_currentAudioElement", '');
            }
            this.$('.narrativeWithAudio-popup-sound').addClass('icon-sound-mute');
        },

        playAudioAtIndex: function (currentItemIndex, currentPageIndex) {
            var item = (currentItemIndex >= 0) ? this.model.get("_items")[currentItemIndex] : null;
            var audioObject = item && item._page && (currentPageIndex >= 0) ? item._page[currentPageIndex].audioObject : null;
            if(audioObject) {
                audioObject.play();
                this.model.set("_currentAudioIndexObject", {
                    currentItemIndex: currentItemIndex,
                    currentPageIndex: currentPageIndex
                });
            }
        },

        stopAudio: function () {
            var currentAudioIndexObject = this.model.get("_currentAudioIndexObject");
            var currentItemIndex = currentAudioIndexObject ? currentAudioIndexObject.currentItemIndex : null;
            var currentPageIndex = currentAudioIndexObject ? currentAudioIndexObject.currentPageIndex : null;
            var item = (currentItemIndex >= 0) ? this.model.get("_items")[currentItemIndex] : null;
            var audioObject = item && item._page && (currentPageIndex >= 0) ? item._page[currentPageIndex].audioObject : null;

            if(audioObject) {
                audioObject.setCurrentTime(0);
                audioObject.pause();
                this.model.set("_currentAudioObjectIndex", {});
            }
        },

        playAudioForElement: function(audioElement) {
            if (audioElement) {
                this.stopCurrentAudio();
                this.model.set("_currentAudioElement", audioElement);
                if(audioElement.play) audioElement.play();
            }
        },

        stopCurrentAudio: function() {
            var audioElement = this.model.get("_currentAudioElement");
            if (audioElement) {
                if (!audioElement.paused && audioElement.pause) {
                    audioElement.pause();
                }
                if (audioElement.currentTime != 0) {
                    audioElement.currentTime = 0.0;
                }
                if($('html').hasClass('ie8')) {
                    if (audioElement.getCurrentTime() != 0) {
                        audioElement.setCurrentTime(0);
                    }
                }
                this.model.set("_currentAudioElement", '');
            }
        },

        onTouchEnd: function(event) {
            var nextItemIndex = this.getNearestItemIndex();
            this.setStage(nextItemIndex);

            this.$('.narrativeWithAudio-slider').off('touchmove', this.onTouchMove);
        },

        onTouchMove: function(event) {
            var currentX = event.originalEvent.touches[0]['pageX'];
            var previousX = this.model.get('_currentX');
            var deltaX = currentX - previousX;

            Adapt.trigger('popup:closed');

            this.moveElement(this.$('.narrativeWithAudio-slider'), deltaX);
            this.moveElement(this.$('.narrativeWithAudio-strapline-header-inner'), deltaX);

            this.model.set('_currentX', currentX);
        }

    });

    Adapt.register('narrativeWithAudio', Narrative);

    return Narrative;

});
