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
