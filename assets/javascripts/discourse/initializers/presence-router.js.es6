import TopicRoute from 'discourse/routes/topic'
import ComposerController from 'discourse/controllers/composer'

export default {
  name: "presence-router",
  after: 'message-bus',
  initialize(){
    var topic, controller, presenceTimer;
    TopicRoute.reopen({
      onActivate: function(){
        topic = this.modelFor('topic');
      }.on('activate')
    });

    ComposerController.reopen({
      isOpened: Ember.observer('model', function() {
        controller = this;
        if(this.get('model') != null){
          this.addUser();
        }else{
          this.removeUser();
        }
      }),

      addUser: function () {
        Discourse.ajax('/presence/writing/' + topic.id + '/add', {method: 'GET'}).then(
          function(){
            this.messageBus.subscribe('/presence-writing-' + topic.id, function(data){
              console.log(data);
              controller.setProperties({ users: data.users});
              // Remove the current user from the list of users that will be displayed
              // const index = data.users.indexOf(this.currentUser.username);
              // if (index > -1) {
              //   data.users.splice(index, 1);
              // }
              // this.update(data);
              // Tell the server we're alive every 15 seconds
              presenceTimer = setInterval(this.alive, 15000);
            }.bind(this));
          }.bind(this), function(msg){
            console.log(msg)
          });

      },

      update: function (data) {
        var writing = "";
        switch(data.users.length) {
          case 0:
            controller.setProperties({ presenceWriting: 0, presenceWritingClass: 'hide', presenceWriting: "" });
            break;
          case 1:
            writing = "@" + data.users[0] + " is writing a reply to this topic"
            controller.setProperties({ presenceWriting: data.viewers, presenceWritingClass: '', presenceWriting: writing });
            break;
          case 2:
            writing = "@" + data.users[0] + " and @" + data.users[1] + " are writing a reply to this topic"
            controller.setProperties({ presenceWriting: data.viewers, presenceWritingClass: '', presenceWriting: writing });
            break;
          default:
            writing = data.users.length + " users are writing a reply to this topic"
            controller.setProperties({ presenceWriting: data.viewers, presenceWritingClass: '', presenceWriting: writing });
        }
      },

      alive: function () {
        Discourse.ajax('/presence/writing/' + topic.id + '/alive', {method: 'GET'});
      },

      removeUser: function () {
        Discourse.ajax('/presence/writing/' + topic.id + '/remove', {method: 'GET'}).then(function(){
          this.messageBus.unsubscribe('/presence-writing-' + topic.id, function(){
            console.log('unsubscribed')
          });
          controller.setProperties({ presenceWriting: 'hide' });
        }.bind(this), function(msg){
          console.log(msg)
        });
        clearInterval(presenceTimer);
      }
    });
  }
}
