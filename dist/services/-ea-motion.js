import { _ as _applyDecoratedDescriptor, a as _defineProperty, b as _initializerDefineProperty } from '../_rollupPluginBabelHelpers-iYhWj1qN.js';
import { computed } from '@ember/object';
import { A } from '@ember/array';
import Service from '@ember/service';
import { task } from '../-private/ember-scheduler.js';
import { microwait, rAF, afterRender, allSettled } from '../-private/concurrency-helpers.js';

var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _class, _descriptor, _descriptor2, _descriptor3, _descriptor4;
let MotionService = (_dec = computed(), _dec2 = computed('_animators.@each.isAnimating'), _dec3 = task(function* () {
  yield rAF();
  this.notifyPropertyChange('isAnimating');
}).observes('isAnimatingSync'), _dec4 = task(function* () {
  // we are idle if we experience two frames in a row with nothing
  // animating.
  while (true) {
    yield rAF();
    if (!this.isAnimatingSync) {
      yield rAF();
      if (!this.isAnimatingSync) {
        return;
      }
    }
  }
}), _dec5 = task(function* (name, beacon) {
  if (!this._beacons) {
    this._beacons = {};
  }
  this._beacons[name] = beacon;
  // allows other farMatches to start
  yield microwait();
  // allows other farMatches to finish
  yield microwait();
  this._beacons = null;
}), _dec6 = task(function* (runAnimationTask, inserted, kept, removed, longWait = false) {
  let matches = new Map();
  let mine = {
    inserted,
    kept,
    removed,
    matches,
    runAnimationTask,
    otherTasks: new Map()
  };
  this._rendezvous.push(mine);
  yield microwait();
  if (longWait) {
    // used by matchDestroyed because it gets called earlier in the
    // render cycle, so it needs to linger longer in order to
    // coincide with other farMatches.
    yield afterRender();
    yield microwait();
    yield microwait();
  }
  if (this.farMatch.concurrency > 1) {
    this._rendezvous.forEach(target => {
      if (target === mine) {
        return;
      }
      performMatches(mine, target);
      performMatches(target, mine);
    });
  }
  this._rendezvous.splice(this._rendezvous.indexOf(mine), 1);
  return {
    farMatches: matches,
    matchingAnimatorsFinished: allSettled([...mine.otherTasks.keys()]),
    beacons: this._beacons
  };
}), (_class = class MotionService extends Service {
  constructor(...args) {
    super(...args);
    _defineProperty(this, "_rendezvous", []);
    _defineProperty(this, "_measurements", []);
    _defineProperty(this, "_animators", A());
    _defineProperty(this, "_orphanObserver", null);
    _defineProperty(this, "_animationObservers", []);
    _defineProperty(this, "_descendantObservers", []);
    _defineProperty(this, "_ancestorObservers", new WeakMap());
    _defineProperty(this, "_beacons", null);
    // Invalidation support for isAnimating
    _initializerDefineProperty(this, "_invalidateIsAnimating", _descriptor, this);
    _initializerDefineProperty(this, "waitUntilIdle", _descriptor2, this);
    _initializerDefineProperty(this, "addBeacon", _descriptor3, this);
    _initializerDefineProperty(this, "farMatch", _descriptor4, this);
  }
  // === Notification System ===

  // Ever animator should register and unregister itself so we know
  // when there are any animations running. Animators are required to
  // have:
  //    - an isAnimating property
  //    - beginStaticMeasurement and endStaticMeasurement methods
  register(animator) {
    this._animators.pushObject(animator);
    return this;
  }
  unregister(animator) {
    this._animators.removeObject(animator);
    return this;
  }

  // Register to receive any sprites that are orphaned by a destroyed
  // animator.
  observeOrphans(fn) {
    if (this._orphanObserver) {
      throw new Error('Only one animated-orphans component can be used at one time');
    }
    this._orphanObserver = fn;
    return this;
  }
  unobserveOrphans(fn) {
    if (this._orphanObserver === fn) {
      this._orphanObserver = null;
    }
    return this;
  }

  // Register to know when an animation is starting anywhere in the app.
  observeAnimations(fn) {
    this._animationObservers.push(fn);
    return this;
  }
  unobserveAnimations(fn) {
    let index = this._animationObservers.indexOf(fn);
    if (index !== -1) {
      this._animationObservers.splice(index, 1);
    }
    return this;
  }

  // Register to know when an animation is starting within the
  // descendants of the given component
  observeDescendantAnimations(component, fn) {
    this._descendantObservers.push({
      component,
      fn
    });
    return this;
  }
  unobserveDescendantAnimations(component, fn) {
    let entry = this._descendantObservers.find(e => e.component === component && e.fn === fn);
    if (entry) {
      this._descendantObservers.splice(this._descendantObservers.indexOf(entry), 1);
    }
    return this;
  }

  // Register to know when an animation is starting among the
  // ancestors of the given component. The fn will be told whether
  // component is going to be destroyed or not at the end of the
  // animation.
  observeAncestorAnimations(component, fn) {
    let id;
    for (let ancestorComponent of ancestorsOf(component)) {
      // when we find an animated list element, we save its ID
      if ('isEmberAnimatedListElement' in ancestorComponent) {
        id = ancestorComponent.child.id;
      } else if (id != null) {
        // if we found an ID on the last loop, now we've got the list
        // element's parent which is the actual animator.
        let observers = this._ancestorObservers.get(ancestorComponent);
        if (!observers) {
          this._ancestorObservers.set(ancestorComponent, observers = new Map());
        }
        observers.set(fn, id);
        id = null;
      }
    }
    return this;
  }
  unobserveAncestorAnimations(component, fn) {
    for (let ancestorComponent of ancestorsOf(component)) {
      let observers = this._ancestorObservers.get(ancestorComponent);
      if (observers) {
        observers.delete(fn);
      }
    }
    return this;
  }

  // This is a publicly visible property you can use to know if any animations
  // are running. It's timing is deliberately not synchronous, so that you can
  // bind it into a template without getting double-render errors.
  //
  // We have an un-observed dependency on an internal property *on purpose*, so
  // this lint rule needs to be disabled:
  //
  // eslint-disable-next-line ember/require-computed-property-dependencies
  get isAnimating() {
    return this.isAnimatingSync;
  }

  // Synchronously updated version of isAnimating. If you try to
  // depend on this in a template you will get double-render errors
  // (because the act of rendering can cause animations to begin).
  get isAnimatingSync() {
    return this._animators.any(animator => animator.isAnimating);
  }
  matchDestroyed(removed, transition, duration, shouldAnimateRemoved) {
    if (this._orphanObserver && removed.length > 0) {
      // if these orphaned sprites may be capable of animating,
      // delegate them to the orphanObserver. It will do farMatching
      // for them.
      this._orphanObserver(removed, transition, duration, shouldAnimateRemoved);
    } else {
      // otherwise, we make them available for far matching but they
      // can't be animated.
      this.farMatch.perform(null, [], [], removed, true);
    }
  }
  hasBeacon(name) {
    return this._beacons?.[name];
  }
  willAnimate({
    task,
    duration,
    component,
    children
  }) {
    let message = {
      task,
      duration
    };

    // tell any of our ancestors who are observing their descendants
    let ancestors = [...ancestorsOf(component)];
    for (let {
      component: observingComponent,
      fn
    } of this._descendantObservers) {
      if (ancestors.indexOf(observingComponent) !== -1) {
        fn(message);
      }
    }

    // tell any of our descendants who are observing their ancestors
    let observers = this._ancestorObservers.get(component);
    if (observers) {
      for (let [fn, id] of observers.entries()) {
        let child = children.find(child => child.id === id);
        if (child) {
          fn(child.state);
        } // the else case here applies to descendants that are about
        // to be unrendered (not animated away -- immediately
        // dropped). They will still have an opportunity to animate
        // too, but they do it via their own willDestroyElement
        // hook, not the this early-warning hook.
      }
    }

    // tell anybody who is listening for all animations
    for (let fn of this._animationObservers) {
      fn(message);
    }
  }
  *staticMeasurement(fn) {
    let measurement = {
      fn,
      resolved: false,
      value: null
    };
    this._measurements.push(measurement);
    try {
      // allow all concurrent animators to join in with our single
      // measurement step instead of having each trigger its own reflow.
      yield microwait();
      if (!measurement.resolved) {
        // we are the first concurrent task to wake up, so we do the
        // actual resolution for everyone.
        let animators = this._animators;
        animators.forEach(animator => animator.beginStaticMeasurement());
        this._measurements.forEach(m => {
          try {
            m.value = m.fn();
          } catch (err) {
            setTimeout(function () {
              throw err;
            }, 0);
          }
          m.resolved = true;
        });
        animators.forEach(animator => animator.endStaticMeasurement());
      }
      return measurement.value;
    } finally {
      this._measurements.splice(this._measurements.indexOf(measurement), 1);
    }
  }
}, (_applyDecoratedDescriptor(_class.prototype, "isAnimating", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "isAnimating"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "isAnimatingSync", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "isAnimatingSync"), _class.prototype), _descriptor = _applyDecoratedDescriptor(_class.prototype, "_invalidateIsAnimating", [_dec3], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor2 = _applyDecoratedDescriptor(_class.prototype, "waitUntilIdle", [_dec4], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor3 = _applyDecoratedDescriptor(_class.prototype, "addBeacon", [_dec5], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor4 = _applyDecoratedDescriptor(_class.prototype, "farMatch", [_dec6], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
})), _class));
function performMatches(sink, source) {
  sink.inserted.concat(sink.kept).forEach(sprite => {
    let match = source.removed.find(
    // TODO: an OwnedSprite type could eliminate the need for these
    // non-nullable casts.
    mySprite => sprite.owner.group == mySprite.owner.group && sprite.owner.id === mySprite.owner.id);
    if (match) {
      sink.matches.set(sprite, match);
      sink.otherTasks.set(source.runAnimationTask, true);
      source.matches.set(match, sprite);
      source.otherTasks.set(sink.runAnimationTask, true);
    }
  });
}
function* ancestorsOf(component) {
  let pointer = component.parentView;
  while (pointer) {
    yield pointer;
    pointer = pointer.parentView;
  }
}

export { MotionService as default };
//# sourceMappingURL=-ea-motion.js.map
