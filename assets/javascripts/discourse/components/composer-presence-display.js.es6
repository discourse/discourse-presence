import computed from 'ember-addons/ember-computed-decorators';

export default Ember.Component.extend({
  composer: Ember.inject.controller(),

  @computed('composer.presenceUsers')
  users(){
    return this.get('composer.presenceUsers').filter(user => user.id !== this.get('currentUser').id);
  },

  @computed('composer.presenceState.action')
  isReply(){
    return this.get('composer.presenceState.action') === 'reply';
  },

  @computed('users')
  shouldDisplay(){
    return this.get('users.length') > 0;
  }

});