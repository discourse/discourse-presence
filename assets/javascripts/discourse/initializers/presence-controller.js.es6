import ComposerController from 'discourse/controllers/composer'

export default {
  name: "presence-controller",
  after: 'message-bus',
  initialize(){
    ComposerController.reopen({
      presenceWritingClass: 'hide',
      presenceWriting: '',
      users: null
    });
  }
}