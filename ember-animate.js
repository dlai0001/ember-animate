(function () {
	window.__ember_animate_hero_elements__ = Ember.Object.create();

	var run,
		destroying$;

	var run = function (fn) {
		if (fn && typeof fn === 'function') {
			return fn();
		}
	};

	Ember.View.reopen({

		isAnimatingIn : false,
		isAnimatingOut : false,
		hasAnimatedIn : false,
		hasAnimatedOut : false,

		_animateInCallbacks : null,
		_animateOutCallbacks : null,

		_afterRender : function () {

			var self = this;

			this.$el = this.$();

			this._transitionTo = this._transitionTo || this.transitionTo;

			if (!self.isDestroyed) {

				self.willAnimateIn();
				self.isAnimatingIn = true;
				self.hasAnimatedIn = false;

				Ember.run.next(function () {

					if (!self.isDestroyed) {

						self.animateIn(function () {

							var i;

							self.isAnimatingIn = false;
							self.hasAnimatedIn = true;
							self.didAnimateIn();

							if (self._animateInCallbacks && self._animateInCallbacks.length) {
								for (i = 0; i < self._animateInCallbacks.length; i ++) {
									run(self._animateInCallbacks[i]);
								}
							}

							self._animateInCallbacks = null;
							self.onHeroEntrance();
						});
					}
				});
			}
		},

		willInsertElement : function () {
			Ember.run.scheduleOnce('afterRender', this, this._afterRender);
			return this._super();
		},

		willAnimateIn : Ember.K,
		willAnimateOut : Ember.K,
		didAnimateIn : Ember.K,
		didAnimateOut : Ember.K,
		heroElements: Ember.K,

		animateIn : run,
		animateOut : run,

		onAnimateIn : function (callback) {

			this._animateInCallbacks = this._animateInCallbacks || [];

			if (typeof callback === 'function') {
				this._animateInCallbacks.push(callback);
			}
		},

		onAnimateOut : function (callback) {

			this._animateOutCallbacks = this._animateOutCallbacks || [];

			if (typeof callback === 'function') {
				this._animateOutCallbacks.push(callback);
			}
		},

		destroy : function (done) {

			var _super = this._super;
			this.onHeroTransitionOut();
			this.onAnimateOut(done);

			if (this.isAnimatingOut) {
				return;
			}

			if (!this.$el || this.isDestroyed) {

				if (this._animateOutCallbacks && this._animateOutCallbacks.length) {
					for (i = 0; i < this._animateOutCallbacks.length; i ++) {
						run(this._animateOutCallbacks[i]);
					}
				}

				this._animateOutCallbacks = null;

				return _super.call(this);
			}

			if (!this.$()) {
				this.$ = function () {
					return this.$el;
				}
			}

			this.willAnimateOut();
			this.isAnimatingOut = true;

			this.animateOut(function () {				

				this.isAnimatingOut = false;
				this.hasAnimatedOut = true;

				this.didAnimateOut();

				if (this._animateOutCallbacks && this._animateOutCallbacks.length) {
					for (i = 0; i < this._animateOutCallbacks.length; i ++) {
						run(this._animateOutCallbacks[i]);
					}
				}

				this.isDestroying = false;

				_super.call(this);

				// remove from parent if found. Don't call removeFromParent,
				// as removeFromParent will try to remove the element from
				// the DOM again.
				if (this._parentView) {
					this._parentView.removeChild(this);
				}

				this.isDestroying = true;

				this._transitionTo('destroying', false);

				delete this.$;
				delete this.$el;

				return this;

			}.bind(this));

			return this;
		},

		// This removes the hero elements from the current view and 
		// places it into the <body> at their current coordinates 
		// in order for them to be available to animate by the next 
		// view.
		onHeroTransitionOut: function() {			
			var heroElements = this.$("[data-hero][data-hero-active='true']");
			if(!heroElements || heroElements.length <= 0) {
				return;
			}
			console.log("storing hero elements", heroElements);
			heroElements.each(function(idx, item) {
				var clone = $(item).clone();
				clone.css("position", "fixed");
				clone.css("z-index", "999");
				clone.css("transition", "all 1s");

				var boundingRect = item.getBoundingClientRect();
				clone.css("top", boundingRect.top);
				clone.css("left", boundingRect.left);

				$("body").append(clone);
				
				window.__ember_animate_hero_elements__.set(clone.attr('data-hero'), clone);
			});

		},

		onHeroEntrance: function() {
			console.log("hero entrance");
			var keys = Object.keys(window.__ember_animate_hero_elements__);
			for(i=0; i<keys.length; i++) {
				console.log("applying animation to hero element", keys[i]);

				var heroShadow = $(window.__ember_animate_hero_elements__[keys[i]]);
				var heroShadowRect = heroShadow[0].getBoundingClientRect();
				var heroTarget = $("[data-hero-target='" + keys[i] + "']");
				var heroTargetRect = heroTarget[0].getBoundingClientRect();
								
				debugger;
				var widthScale = heroTargetRect.width / heroShadowRect.width;
				var heightScale = heroTargetRect.height / heroShadowRect.height;
				var translateX = heroTargetRect.left - heroShadowRect.left;
				var translateY = heroTargetRect.top - heroShadowRect.top;

				//heroTarget.css("opacity", 0);				

				var transformProps = "";
				transformProps += "translate(" + translateX + "px," + translateY + "px) ";
				transformProps += "scale(" + widthScale + "," + heightScale + ") ";

				heroShadow.css("transform", transformProps);

				delete window.__ember_animate_hero_elements__[keys[i]];
			}
		}
	});

	Ember.ContainerView.reopen({

		currentView : null,
		activeView : null,
		newView : null,
		nextView : null,

		animationSequence : 'sync', // sync, async, reverse

		init : function () {

			var currentView;

			this._super();

			if (currentView = this.get('currentView')) {
				this.set('activeView', currentView);
			}
		},

		_currentViewWillChange : Ember.K,

		_currentViewDidChange : Ember.observer('currentView', function () {

			var self,
				newView,
				oldView,
				asyncCount;

			self = this;
			oldView = this.get('activeView');
			newView = this.get('currentView');

			this.set('newView', newView);

			function pushView (view) {

				if (view ) {
					self.pushObject(view);
				}

				self.set('activeView', view);
			}

			function removeView (view) {

				if (view.isAnimatingOut) {
					return;
				}

				if (!view.hasAnimatedIn) {
					view.onAnimateIn(view.destroy.call(view));
					return;
				}

				view.destroy();
			};

			if (oldView) {

				// reverse
				if (this.animationSequence === 'reverse') {

					newView.onAnimateIn(function () {
						removeView(oldView);
					});

					pushView(newView);
				}

				// async
				else if (this.animationSequence === 'async') {
					removeView(oldView);
					pushView(newView);
				}

				// sync
				else {

					oldView.onAnimateOut(function () {
						pushView(self.get('currentView'));
					});

					removeView(oldView);
				}
			}

			else {
				pushView(newView);
			}
		})

	});

})();
