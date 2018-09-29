import DbCollection from './db-collection';
import IdentityManager from './identity-manager';
import { singularize } from './utils/inflector';
import _cloneDeep from 'lodash/cloneDeep';

/**
  Your Mirage server has a database which you can interact with in your route handlers. You’ll typically use models to interact with your database data, but you can always reach into the db directly in the event you want more control.

  Access the db from your route handlers via `schema.db`.

  @class Db
  @constructor
  @public
 */
class Db {

  constructor(initialData, identityManagers) {
    this._collections = [];

    this.registerIdentityManagers(identityManagers);

    if (initialData) {
      this.loadData(initialData);
    }
  }

  /**
   * Foo, bar baz.
   *
   * @method loadData
   * @param {Object} data - Data to load
   * @public
   */
  loadData(data) {
    for (let key in data) {
      this.createCollection(key, _cloneDeep(data[key]));
    }
  }

  /**
   * @method dump
   * @public
   */
  dump() {
    return this._collections.reduce((data, collection) => {
      data[collection.name] = collection.all();

      return data;
    }, {});
  }

  /**
    Add an empty collection named name to your database. Typically you won’t need to do this yourself, since collections are automatically created for any models you have defined.

    @method createCollection
    @param name
    @param initialData (optional)
    @public
   */
  createCollection(name, initialData) {
    if (!this[name]) {
      let IdentityManager = this.identityManagerFor(name);
      let newCollection = new DbCollection(name, initialData, IdentityManager);

      // Public API has a convenient array interface. It comes at the cost of
      // returning a copy of all records to avoid accidental mutations.
      Object.defineProperty(this, name, {
        get() {
          let recordsCopy = newCollection.all();

          ['insert', 'find', 'findBy', 'where', 'update', 'remove', 'firstOrCreate']
            .forEach(function(method) {
              recordsCopy[method] = function() {
                return newCollection[method](...arguments);
              };
            });

          return recordsCopy;
        }
      });

      // Private API does not have the array interface. This means internally, only
      // db-collection methods can be used. This is so records aren't copied redundantly
      // internally, which leads to accidental O(n^2) operations (e.g., createList).
      Object.defineProperty(this, `_${name}`, {
        get() {
          let recordsCopy = [];

          ['insert', 'find', 'findBy', 'where', 'update', 'remove', 'firstOrCreate']
            .forEach(function(method) {
              recordsCopy[method] = function() {
                return newCollection[method](...arguments);
              };
            });

          return recordsCopy;
        }
      });

      this._collections.push(newCollection);

    } else if (initialData) {
      this[name].insert(initialData);
    }

    return this;
  }

  /**
   * @method createCollections
   * @param ...collections
   * @public
   */
  createCollections(...collections) {
    collections.forEach((c) => this.createCollection(c));
  }

  /**
   * @method emptyData
   * @public
   */
  emptyData() {
    this._collections.forEach((c) => c.remove());
  }

  /**
   * @method identityManagerFor
   * @param name
   * @public
   */
  identityManagerFor(name) {
    return this._identityManagers[singularize(name)] || this._identityManagers.application || IdentityManager;
  }

  /**
   * @method registerIdentityManagers
   * @public
   */
  registerIdentityManagers(identityManagers) {
    this._identityManagers = identityManagers || {};
  }
}

export default Db;
