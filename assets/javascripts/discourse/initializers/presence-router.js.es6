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
        controller.setProperties({ presenceWritingClass: 'hide', presenceWriting: "", users: [] });
        Discourse.ajax('/presence/writing/' + topic.id + '/add', {method: 'GET'}).then(
          function(){
            this.messageBus.subscribe('/presence-writing-' + topic.id, function(data){
              console.log(data);

              // Remove the current user from the list of users that will be displayed
              for(var i = 0, len = data.users.length; i < len; i++) {
                if (data.users[i].username === this.currentUser.username) {
                  data.users.splice(i, 1);
                  break;
                }
              }

              var writing = "", writingClass = "";
              switch(data.users.length) {
                case 0:
                  writingClass = 'hide';
                  break;
                case 1:
                  writing = " is writing a reply to this topic";
                  break;
                default:
                  writing = " are writing a reply to this topic"
              }
              controller.setProperties({ presenceWriting: writing, presenceWritingClass: writingClass, users: data.users});
              // Tell the server we're alive every 15 seconds
              clearInterval(presenceTimer);
              presenceTimer = setInterval(this.alive, 15000);
            }.bind(this));
          }.bind(this), function(msg){
            console.log(msg)
          });

      },

      alive: function () {
        Discourse.ajax('/presence/writing/' + topic.id + '/alive', {method: 'GET'}).then(function(){
        }.bind(this), function(){
          // Remove the time if there's an error
          clearInterval(presenceTimer);
        });
      },

      removeUser: function () {
        controller.setProperties({ presenceWritingClass: 'hide', presenceWriting: "", users: [] });
        Discourse.ajax('/presence/writing/' + topic.id + '/remove', {method: 'GET'}).then(function(){
          this.messageBus.unsubscribe('/presence-writing-' + topic.id);
        });
        clearInterval(presenceTimer);
      }
    });
  }
}
