class TrackingObject {
  constructor(value, validationFunc) {
    this.value = { ...value };
    this.updateSavedValue();
    this.validationFunc = validationFunc;
  }

  hasChanges(k) {
    if (k) {
      return this.value[k] !== this.savedValue[k];
    }

    return this.keys().some(key => this.hasChanges(key));
  }

  isInvalid(key) {
    if (key) {
      if (this.validationFunc) {
        return this.validationFunc(key, this.value);
      }
      return false;
    }

    return this.keys().reduce( (acc, cur) => acc ? acc : this.isInvalid(cur), false);
  }

  keys() {
    return Object.keys(this.value);
  }

  getValidationState(key) {
    if (key) {
      if (this.isInvalid(key)) return 'danger';
      if (this.hasChanges(key)) return 'success';
      return null;
    }

    const retval = {};
    this.keys().forEach(k => {
      retval[k] = this.getValidationState(k);
    });
    return retval;
  }

  updateSavedValue() {
    this.savedValue = { ...this.value };
  }
}

export { TrackingObject as default };
