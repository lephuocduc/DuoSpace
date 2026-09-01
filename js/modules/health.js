/**
 * DuoSpace Modules - Health Tab Logic
 */
class HealthModule {
  constructor(app) {
    this.app = app;
  }

  render() {
    this.renderTodoList();
  }

  renderTodoList() {
    this.app.renderCategoryList('Sức Khỏe', 'healthTodoList');
  }
}
