App = Ember.Application.create();

App.Router.map(function() {
  this.route("otherview", { path: "/otherview" });
});

App.IndexRoute = Ember.Route.extend({
  model: function() {
    return ['red', 'yellow', 'blue'];
  }
});

App.OtherviewView = Ember.View.extend({
	willAnimateIn: function() {
		console.log("blah");
	}
});